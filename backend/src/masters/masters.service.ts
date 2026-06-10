import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MastersService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.master.findMany({
      include: { values: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { name: 'asc' },
    });
  }

  create(dto: any) {
    return this.prisma.master.create({ data: { name: dto.name, key: dto.key } });
  }

  async update(id: string, dto: any) {
    const master = await this.prisma.master.findUnique({ where: { id } });
    if (!master) throw new NotFoundException('Master not found');
    const incoming = dto.values || [];
    const keepIds = incoming.filter((v: any) => v.id).map((v: any) => v.id);
    // delete removed values; keep ids of retained values so product references stay valid
    await this.prisma.masterValue.deleteMany({
      where: { masterId: id, id: { notIn: keepIds.length ? keepIds : ['__none__'] } },
    });
    let i = 0;
    for (const v of incoming) {
      const data = {
        label: v.label || '',
        hiva: v.hiva || '',
        magento: v.magento || '',
        crm: v.crm || '',
        sortOrder: i++,
        masterId: id,
      };
      if (v.id) await this.prisma.masterValue.update({ where: { id: v.id }, data });
      else await this.prisma.masterValue.create({ data });
    }
    if (dto.name) await this.prisma.master.update({ where: { id }, data: { name: dto.name } });
    return this.prisma.master.findUnique({
      where: { id },
      include: { values: { orderBy: { sortOrder: 'asc' } } },
    });
  }
}
