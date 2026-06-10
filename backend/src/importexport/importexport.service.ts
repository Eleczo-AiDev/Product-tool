import { Injectable } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { PrismaService } from '../prisma/prisma.service';
import { sharedDisplay } from '../common/resolution';

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else {
      if (ch === '"') q = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

@Injectable()
export class ImportExportService {
  constructor(private products: ProductsService, private prisma: PrismaService) {}

  async exportCsv(): Promise<string> {
    const { attrById, masters } = await this.products.loadCatalog();
    const list = await this.products.list();
    const rows: Record<string, string>[] = [];
    for (const p of list) {
      const ids = await this.products.setAttributeIds(p.setId);
      const row: Record<string, string> = { set: p.setName || '' };
      for (const aid of ids) {
        const attr = attrById[aid];
        if (!attr) continue;
        row[attr.code] = sharedDisplay(attr, (p.values as any)[aid], masters);
      }
      rows.push(row);
    }
    const cols = Array.from(
      rows.reduce((s, r) => { Object.keys(r).forEach((k) => s.add(k)); return s; }, new Set<string>()),
    );
    const esc = (x: any) => `"${String(x ?? '').replace(/"/g, '""')}"`;
    return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
  }

  async importCsv(setId: string, csv: string) {
    const { attrById, masters } = await this.products.loadCatalog();
    const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    // resolve a header to an attribute by code OR label (case/space-insensitive)
    const lookup: Record<string, any> = {};
    Object.values(attrById).forEach((a: any) => {
      lookup[a.code.toLowerCase()] = a;
      lookup[norm(a.code)] = a;
      lookup[a.label.toLowerCase().trim()] = a;
      lookup[norm(a.label)] = a;
    });

    const lines = csv.split(/\r?\n/).filter((l) => l.trim().length);
    if (!lines.length) return { created: 0, errors: ['empty file'], matched: [], ignored: [], addedMasterValues: [], usedSetColumn: false };

    // sets, for per-row routing. A set's routing values are matched against the
    // row's Item Family / Item Category / Item Subcategory (whichever contains it).
    const setList = await this.prisma.attributeSet.findMany({ select: { id: true, name: true, familyValues: true } });
    const setByName: Record<string, string> = {};
    const setByRouting: Record<string, string> = {};
    setList.forEach((s) => {
      setByName[s.name.toLowerCase().trim()] = s.id;
      (s.familyValues || []).forEach((f: string) => (setByRouting[f.toLowerCase().trim()] = s.id));
    });
    const SET_HEADERS = new Set(['set', 'attribute set', 'attribute_set', 'attributeset', 'product set']);
    const isSetHeader = (h: string) => SET_HEADERS.has((h || '').toLowerCase().trim());

    const header = parseCsvLine(lines[0]).map((h) => h.trim());
    const setColIdx = header.findIndex(isSetHeader);
    const colAttr = header.map((h) =>
      h && !isSetHeader(h) ? lookup[h.toLowerCase()] || lookup[norm(h)] || null : null,
    );
    const matched = Array.from(new Set(colAttr.filter(Boolean).map((a: any) => a.code)));
    const ignored = header.filter((h, i) => h && !colAttr[i] && !isSetHeader(h));
    const familyColIdx = colAttr.findIndex((a: any) => a && a.code === 'item_family');
    const categoryColIdx = colAttr.findIndex((a: any) => a && a.code === 'item_category');
    const subcategoryColIdx = colAttr.findIndex((a: any) => a && a.code === 'item_subcategory');
    const routeCols = [subcategoryColIdx, categoryColIdx, familyColIdx].filter((i) => i >= 0);

    const errors: any[] = [];
    const addedMasterValues: string[] = [];
    let created = 0;
    for (let i = 1; i < lines.length; i++) {
      const cells = parseCsvLine(lines[i]);
      const values: any = {};
      for (let idx = 0; idx < colAttr.length; idx++) {
        const attr: any = colAttr[idx];
        if (!attr) continue;
        const raw = (cells[idx] ?? '').trim();
        if (raw === '') continue;
        if (attr.source === 'MASTER' && attr.masterId) {
          const m = masters[attr.masterId];
          let mv = m && m.values.find((v: any) => v.label.toLowerCase() === raw.toLowerCase() || v.id === raw);
          if (!mv && m) {
            // brand/master value not seen before → add it to the master so it's captured
            const fresh = await this.prisma.masterValue.create({
              data: { masterId: attr.masterId, label: raw, hiva: raw, magento: raw, crm: raw, sortOrder: m.values.length },
            });
            mv = { id: fresh.id, label: fresh.label, hiva: fresh.hiva, magento: fresh.magento, crm: fresh.crm };
            m.values.push(mv); // reuse for later rows in the same import
            addedMasterValues.push(raw);
          }
          if (mv) values[attr.id] = { shared: mv.id };
        } else {
          values[attr.id] = { shared: raw };
        }
      }
      try {
        // routing: a chosen product type forces all rows; else a Set column;
        // else match a set's routing values against Subcategory / Category / Family.
        let rowSetId = '';
        let reason = '';
        if (setId) {
          rowSetId = setId; // dropdown set to a specific type → force every row here
        } else if (setColIdx >= 0 && (cells[setColIdx] ?? '').trim()) {
          const sv = (cells[setColIdx] ?? '').trim();
          if (setByName[sv.toLowerCase()]) rowSetId = setByName[sv.toLowerCase()];
          else reason = `Set "${sv}" does not exist`;
        } else if (routeCols.length) {
          const candidates = routeCols.map((idx) => (cells[idx] ?? '').trim()).filter(Boolean);
          for (const c of candidates) {
            if (setByRouting[c.toLowerCase()]) { rowSetId = setByRouting[c.toLowerCase()]; break; }
          }
          if (!rowSetId) reason = `No product type matched (${candidates.join(' / ') || 'no category values'}) — add one of these to a set's routing values`;
        }
        if (!rowSetId) {
          errors.push({ row: i + 1, error: reason || 'Could not determine the product type — choose one in the dropdown, add a Set column, or map a category value to a set' });
          continue;
        }
        await this.products.create({ setId: rowSetId, values });
        created++;
      } catch (e: any) {
        errors.push({ row: i + 1, error: e?.message || 'error' });
      }
    }
    return { created, errors, matched, ignored, addedMasterValues: Array.from(new Set(addedMasterValues)), usedSetColumn: setColIdx >= 0, usedFamilyRouting: routeCols.length > 0 };
  }
}
