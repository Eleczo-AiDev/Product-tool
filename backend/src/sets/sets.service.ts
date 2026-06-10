import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SYSTEM_GENERAL_CODES = ['product_code', 'name', 'brand'];

function normalizeFamilies(input: any): string[] {
  if (!input) return [];
  const arr = Array.isArray(input) ? input : String(input).split(',');
  return Array.from(new Set(arr.map((s: any) => String(s).trim()).filter(Boolean)));
}

function shapeSet(set: any) {
  return {
    id: set.id,
    name: set.name,
    system: set.system,
    familyValues: set.familyValues || [],
    groups: set.groups.map((g: any) => ({
      id: g.id,
      name: g.name,
      attributeIds: g.items.map((it: any) => it.attributeId),
    })),
  };
}

@Injectable()
export class SetsService {
  constructor(private prisma: PrismaService) {}

  async list() {
    const sets = await this.prisma.attributeSet.findMany({
      include: { groups: { orderBy: { sortOrder: 'asc' }, include: { items: { orderBy: { sortOrder: 'asc' } } } } },
      orderBy: { createdAt: 'asc' },
    });
    return sets.map(shapeSet);
  }

  async get(id: string) {
    const set = await this.prisma.attributeSet.findUnique({
      where: { id },
      include: { groups: { orderBy: { sortOrder: 'asc' }, include: { items: { orderBy: { sortOrder: 'asc' } } } } },
    });
    if (!set) throw new NotFoundException('Set not found');
    return shapeSet(set);
  }

  async create(dto: any) {
    const exists = await this.prisma.attributeSet.findUnique({ where: { name: dto.name } });
    if (exists) throw new BadRequestException(`Set "${dto.name}" already exists`);

    let groups: { name: string; attributeIds: string[] }[];
    if (dto.basedOnSetId) {
      const base = await this.get(dto.basedOnSetId);
      groups = base.groups.map((g: any) => ({ name: g.name, attributeIds: [...g.attributeIds] }));
    } else {
      const sys = await this.prisma.attribute.findMany({ where: { code: { in: SYSTEM_GENERAL_CODES } } });
      const byCode: Record<string, string> = {};
      sys.forEach((a) => (byCode[a.code] = a.id));
      groups = [{ name: 'General', attributeIds: SYSTEM_GENERAL_CODES.map((c) => byCode[c]).filter(Boolean) }];
    }
    const set = await this.prisma.attributeSet.create({ data: { name: dto.name, familyValues: normalizeFamilies(dto.familyValues) } });
    await this.writeGroups(set.id, groups);
    return this.get(set.id);
  }

  async update(id: string, dto: any) {
    const set = await this.prisma.attributeSet.findUnique({ where: { id } });
    if (!set) throw new NotFoundException('Set not found');
    if (dto.name) await this.prisma.attributeSet.update({ where: { id }, data: { name: dto.name } });
    if (dto.familyValues !== undefined) await this.prisma.attributeSet.update({ where: { id }, data: { familyValues: normalizeFamilies(dto.familyValues) } });
    if (dto.groups) {
      const sys = await this.prisma.attribute.findMany({ where: { system: true } });
      const present = new Set<string>(dto.groups.flatMap((g: any) => g.attributeIds));
      for (const a of sys) {
        if (!present.has(a.id)) throw new BadRequestException('System attributes cannot be removed from a set');
      }
      await this.prisma.attributeGroup.deleteMany({ where: { setId: id } });
      await this.writeGroups(id, dto.groups);
    }
    return this.get(id);
  }

  async remove(id: string) {
    const count = await this.prisma.product.count({ where: { setId: id } });
    if (count) throw new BadRequestException('Set has products assigned; reassign them first');
    await this.prisma.attributeSet.delete({ where: { id } });
    return { deleted: true };
  }

  private async writeGroups(setId: string, groups: { name: string; attributeIds: string[] }[]) {
    let gi = 0;
    for (const g of groups) {
      const group = await this.prisma.attributeGroup.create({ data: { setId, name: g.name, sortOrder: gi++ } });
      let ii = 0;
      for (const attributeId of g.attributeIds) {
        await this.prisma.entityAttribute.create({ data: { groupId: group.id, attributeId, sortOrder: ii++ } });
      }
    }
  }
}
