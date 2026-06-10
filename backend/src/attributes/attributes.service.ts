import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function mapDataType(inputType: string): string {
  if (inputType === 'number') return 'number';
  if (inputType === 'boolean') return 'boolean';
  if (inputType === 'date') return 'date';
  return 'text';
}

@Injectable()
export class AttributesService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.attribute.findMany({
      include: { options: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(dto: any) {
    const exists = await this.prisma.attribute.findUnique({ where: { code: dto.code } });
    if (exists) throw new BadRequestException(`Attribute code "${dto.code}" already exists`);
    return this.prisma.attribute.create({
      data: {
        code: dto.code,
        label: dto.label,
        dataType: mapDataType(dto.inputType),
        inputType: dto.inputType,
        required: !!dto.required,
        system: false,
        source: dto.source || (dto.inputType === 'list' ? 'OPTION' : 'FREE'),
        unit: dto.unit || '',
        masterId: dto.masterId || null,
        options: {
          create: (dto.options || []).map((label: string, i: number) => ({ label, sortOrder: i })),
        },
      },
      include: { options: true },
    });
  }

  async update(id: string, dto: any) {
    const attr = await this.prisma.attribute.findUnique({ where: { id } });
    if (!attr) throw new NotFoundException('Attribute not found');
    if (attr.system) throw new BadRequestException('System attributes cannot be edited');
    // code & dataType are immutable by design
    await this.prisma.attributeOption.deleteMany({ where: { attributeId: id } });
    return this.prisma.attribute.update({
      where: { id },
      data: {
        label: dto.label ?? attr.label,
        required: dto.required ?? attr.required,
        unit: dto.unit ?? attr.unit,
        source: dto.source ?? attr.source,
        masterId: dto.masterId ?? attr.masterId,
        options: {
          create: (dto.options || []).map((label: string, i: number) => ({ label, sortOrder: i })),
        },
      },
      include: { options: true },
    });
  }

  async remove(id: string) {
    const attr = await this.prisma.attribute.findUnique({ where: { id }, include: { links: true } });
    if (!attr) throw new NotFoundException('Attribute not found');
    if (attr.system) throw new BadRequestException('System attributes cannot be deleted');
    if (attr.links.length)
      throw new BadRequestException('Attribute is assigned to one or more sets; remove it there first');
    await this.prisma.attribute.delete({ where: { id } });
    return { deleted: true };
  }
}
