import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { SYSTEMS } from '../common/resolution';

const ENUM: Record<string, string> = { hiva: 'HIVA', magento: 'MAGENTO', crm: 'CRM' };

@Injectable()
export class PublishService {
  constructor(private prisma: PrismaService, private products: ProductsService) {}

  async publishOne(productId: string, systems?: string[], actor = 'system') {
    const shaped = await this.products.get(productId);
    if (shaped.validation.length) {
      throw new BadRequestException({
        message: 'Product has validation errors; fix them before publishing',
        errors: shaped.validation,
      });
    }
    const targets = (systems && systems.length ? systems : SYSTEMS).filter((s) =>
      (SYSTEMS as string[]).includes(s),
    );
    const payload: Record<string, any> = {};
    targets.forEach((s) => (payload[s] = shaped.resolved[s]));
    const targetEnums = targets.map((s) => ENUM[s]);

    // transactional capture: outbox event + delivery rows in one transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.outbox.create({
        data: {
          aggregateType: 'product',
          aggregateId: productId,
          eventType: 'product.published',
          payload,
          targetSystems: targetEnums,
          status: 'PENDING',
        },
      });
      for (const s of targets) {
        await tx.deliveryStatus.upsert({
          where: { productId_targetSystem: { productId, targetSystem: ENUM[s] as any } },
          create: { productId, targetSystem: ENUM[s] as any, state: 'PENDING', version: shaped.version },
          update: { state: 'PENDING', version: shaped.version, lastError: null },
        });
      }
    });
    await this.products.snapshot(productId, 'published', actor, `Published to ${targets.join(', ')}`);
    return { queued: true, productId, targets };
  }

  async publishMany(ids: string[], systems?: string[], actor = 'system') {
    const results: any[] = [];
    for (const id of ids) {
      try {
        results.push(await this.publishOne(id, systems, actor));
      } catch (e: any) {
        results.push({ queued: false, productId: id, error: e?.message || 'error' });
      }
    }
    return { count: results.length, results };
  }
}
