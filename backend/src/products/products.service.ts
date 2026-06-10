import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AttrLite, MasterLite, ValuesMap, SYSTEMS,
  buildPayload, validateValues, sharedDisplay,
} from '../common/resolution';

const KEY_TO_ENUM: Record<string, string> = { shared: 'SHARED', hiva: 'HIVA', magento: 'MAGENTO', crm: 'CRM' };
const ENUM_TO_KEY: Record<string, string> = { SHARED: 'shared', HIVA: 'hiva', MAGENTO: 'magento', CRM: 'crm' };

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async loadCatalog() {
    const attributes = await this.prisma.attribute.findMany({ include: { options: true } });
    const mastersRaw = await this.prisma.master.findMany({ include: { values: true } });
    const attrById: Record<string, AttrLite> = {};
    attributes.forEach((a) => {
      attrById[a.id] = {
        id: a.id, code: a.code, label: a.label, dataType: a.dataType, inputType: a.inputType,
        required: a.required, source: a.source as any, masterId: a.masterId,
        options: a.options.map((o) => ({ id: o.id, label: o.label })),
      };
    });
    const masters: Record<string, MasterLite> = {};
    mastersRaw.forEach((m) => {
      masters[m.id] = { id: m.id, values: m.values.map((v) => ({ id: v.id, label: v.label, hiva: v.hiva, magento: v.magento, crm: v.crm })) };
    });
    return { attrById, masters };
  }

  async setAttributeIds(setId: string): Promise<string[]> {
    const groups = await this.prisma.attributeGroup.findMany({
      where: { setId }, orderBy: { sortOrder: 'asc' },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
    return groups.flatMap((g) => g.items.map((it) => it.attributeId));
  }

  private readRows(rows: any[], attrById: Record<string, AttrLite>): ValuesMap {
    const map: ValuesMap = {};
    for (const r of rows) {
      const attr = attrById[r.attributeId];
      const key = ENUM_TO_KEY[r.targetSystem];
      const val =
        attr && attr.dataType === 'number' ? r.valueNumber
        : attr && attr.dataType === 'boolean' ? r.valueBool
        : attr && attr.dataType === 'date' ? r.valueDate
        : r.valueString;
      if (!map[r.attributeId]) map[r.attributeId] = {};
      (map[r.attributeId] as any)[key] = val;
    }
    return map;
  }

  private async ensureOptions(values: ValuesMap, attrById: Record<string, AttrLite>) {
    for (const attributeId of Object.keys(values || {})) {
      const attr = attrById[attributeId];
      if (!attr || attr.source !== 'OPTION') continue;
      const cell: any = values[attributeId] || {};
      const known = new Set(attr.options.map((o) => o.label));
      const seen = new Set<string>();
      for (const key of ['shared', 'hiva', 'magento', 'crm']) {
        const raw = cell[key];
        if (raw === undefined || raw === null || String(raw).trim() === '') continue;
        const label = String(raw).trim();
        if (known.has(label) || seen.has(label)) continue;
        seen.add(label);
        const created = await this.prisma.attributeOption.create({
          data: { attributeId, label, sortOrder: attr.options.length + seen.size },
        });
        attr.options.push({ id: created.id, label });
      }
    }
  }

  private async writeValues(productId: string, values: ValuesMap, attrById: Record<string, AttrLite>) {
    await this.ensureOptions(values, attrById);
    await this.prisma.productValue.deleteMany({ where: { productId } });
    const data: any[] = [];
    for (const attributeId of Object.keys(values || {})) {
      const attr = attrById[attributeId];
      const cell: any = values[attributeId] || {};
      for (const key of ['shared', 'hiva', 'magento', 'crm']) {
        const raw = cell[key];
        if (raw === undefined || raw === null || raw === '') continue;
        const row: any = { productId, attributeId, targetSystem: KEY_TO_ENUM[key] };
        if (attr && attr.dataType === 'number') row.valueNumber = Number(raw);
        else if (attr && attr.dataType === 'boolean') row.valueBool = !!raw;
        else if (attr && attr.dataType === 'date') row.valueDate = new Date(raw);
        else row.valueString = String(raw);
        data.push(row);
      }
    }
    if (data.length) await this.prisma.productValue.createMany({ data });
  }

  private async shape(product: any, attrById: Record<string, AttrLite>, masters: Record<string, MasterLite>) {
    const values = this.readRows(product.values, attrById);
    const ids = await this.setAttributeIds(product.setId);
    const attrs = ids.map((id) => attrById[id]).filter(Boolean);
    const codeOf = (code: string) => attrs.find((a) => a.code === code);
    const disp = (code: string) => {
      const a = codeOf(code);
      return a ? sharedDisplay(a, values[a.id], masters) : '';
    };
    const deliveries: Record<string, string> = {};
    (product.deliveries || []).forEach((d: any) => (deliveries[ENUM_TO_KEY[d.targetSystem]] = d.state));
    const resolved: Record<string, any> = {};
    SYSTEMS.forEach((s) => (resolved[s] = buildPayload(attrs, values, s, masters)));
    return {
      id: product.id,
      setId: product.setId,
      setName: product.set?.name,
      version: product.version,
      values,
      summary: { code: disp('product_code'), name: disp('name'), brand: disp('brand') },
      deliveries,
      resolved,
      validation: validateValues(attrs, values, masters),
    };
  }

  async list() {
    const { attrById, masters } = await this.loadCatalog();
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null },
      include: { set: true, values: true, deliveries: true },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(products.map((p) => this.shape(p, attrById, masters)));
  }

  async get(id: string) {
    const { attrById, masters } = await this.loadCatalog();
    const product = await this.prisma.product.findUnique({
      where: { id }, include: { set: true, values: true, deliveries: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return this.shape(product, attrById, masters);
  }

  private codeAttrId(attrById: Record<string, AttrLite>): string | null {
    const a = Object.values(attrById).find((x: any) => x.code === 'product_code') as any;
    return a ? a.id : null;
  }

  private codeFromValues(values: any, codeAttrId: string | null): string {
    if (!codeAttrId || !values || !values[codeAttrId]) return '';
    const c = values[codeAttrId].shared;
    return c == null ? '' : String(c).trim();
  }

  private async findProductIdByCode(codeAttrId: string | null, code: string): Promise<string | null> {
    if (!codeAttrId || !code) return null;
    const row = await this.prisma.productValue.findFirst({
      where: { attributeId: codeAttrId, targetSystem: 'SHARED' as any, valueString: code, product: { deletedAt: null } },
      select: { productId: true },
    });
    return row ? row.productId : null;
  }

  // write an audit snapshot of the product's current state
  async snapshot(productId: string, action: string, actor = 'system', note?: string) {
    try {
      const s = await this.get(productId);
      await this.prisma.productRevision.create({
        data: {
          productId, version: s.version, action, actor: actor || 'system',
          setId: s.setId, summary: s.summary as any, values: s.values as any, note,
        },
      });
    } catch {
      /* snapshots must never block the main operation */
    }
  }

  async auditFeed(limit = 200) {
    const rows = await this.prisma.productRevision.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 500),
    });
    return rows.map((r) => ({
      id: r.id, productId: r.productId, version: r.version, action: r.action,
      actor: r.actor, note: r.note, summary: r.summary, at: r.createdAt,
    }));
  }

  async history(productId: string) {
    const rows = await this.prisma.productRevision.findMany({
      where: { productId }, orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id, version: r.version, action: r.action, actor: r.actor,
      note: r.note, summary: r.summary, values: r.values, at: r.createdAt,
    }));
  }

  async create(dto: any, actor = 'system') {
    const { attrById } = await this.loadCatalog();
    const codeAttrId = this.codeAttrId(attrById);
    const code = this.codeFromValues(dto.values, codeAttrId);
    if (code && (await this.findProductIdByCode(codeAttrId, code))) {
      throw new BadRequestException(`Product code "${code}" already exists`);
    }
    const product = await this.prisma.product.create({ data: { setId: dto.setId } });
    await this.writeValues(product.id, dto.values || {}, attrById);
    await this.snapshot(product.id, 'created', actor);
    return this.get(product.id);
  }

  async update(id: string, dto: any, actor = 'system') {
    const { attrById } = await this.loadCatalog();
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    const codeAttrId = this.codeAttrId(attrById);
    const code = this.codeFromValues(dto.values, codeAttrId);
    if (code) {
      const owner = await this.findProductIdByCode(codeAttrId, code);
      if (owner && owner !== id) throw new BadRequestException(`Product code "${code}" already exists`);
    }
    await this.prisma.product.update({
      where: { id },
      data: { version: { increment: 1 }, setId: dto.setId ?? product.setId },
    });
    await this.writeValues(id, dto.values || {}, attrById);
    await this.snapshot(id, 'updated', actor);
    return this.get(id);
  }

  // restore the product's values to those captured in an earlier revision
  async revert(id: string, revisionId: string, actor = 'system') {
    const { attrById } = await this.loadCatalog();
    const rev = await this.prisma.productRevision.findUnique({ where: { id: revisionId } });
    if (!rev || rev.productId !== id) throw new NotFoundException('Revision not found');
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    await this.writeValues(id, (rev.values as any) || {}, attrById);
    await this.prisma.product.update({
      where: { id },
      data: { version: { increment: 1 }, setId: rev.setId, deletedAt: null },
    });
    await this.snapshot(id, 'reverted', actor, `Reverted to v${rev.version}`);
    return this.get(id);
  }

  async restore(id: string, actor = 'system') {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    await this.prisma.product.update({ where: { id }, data: { deletedAt: null, version: { increment: 1 } } });
    await this.snapshot(id, 'restored', actor);
    return this.get(id);
  }

  async listDeleted() {
    const { attrById, masters } = await this.loadCatalog();
    const products = await this.prisma.product.findMany({
      where: { NOT: { deletedAt: null } },
      include: { set: true, values: true, deliveries: true },
      orderBy: { updatedAt: 'desc' },
    });
    return Promise.all(products.map((p) => this.shape(p, attrById, masters)));
  }

  async remove(id: string, actor = 'system') {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    await this.snapshot(id, 'deleted', actor);
    await this.prisma.product.update({ where: { id }, data: { deletedAt: new Date() } });
    return { deleted: true };
  }

  async resolve(id: string, system: string) {
    const shaped = await this.get(id);
    return shaped.resolved[system] || {};
  }
}
