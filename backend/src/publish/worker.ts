import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConnectorService } from './connectors';

const ENUM_TO_KEY: Record<string, string> = { HIVA: 'hiva', MAGENTO: 'magento', CRM: 'crm' };

/**
 * Polls the outbox and dispatches events to the connectors. In production
 * this is replaced by a broker consumer (RabbitMQ / SQS / Oracle AQ).
 * Consumers are idempotent, so re-delivery is safe.
 */
@Injectable()
export class PublishWorker implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('PublishWorker');
  private timer: any = null;
  private running = false;

  constructor(private prisma: PrismaService, private connectors: ConnectorService) {}

  onModuleInit() {
    this.timer = setInterval(() => this.tick().catch((e) => this.log.error(e?.message || e)), 3000);
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const batch = await this.prisma.outbox.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: 10,
      });
      for (const evt of batch) await this.process(evt);
    } finally {
      this.running = false;
    }
  }

  private async process(evt: any) {
    const payload = evt.payload || {};
    let allOk = true;
    for (const sysEnum of evt.targetSystems) {
      const key = ENUM_TO_KEY[sysEnum] as any;
      try {
        const res = await this.connectors.send(key, evt.aggregateId, payload[key] || {});
        await this.prisma.deliveryStatus.update({
          where: { productId_targetSystem: { productId: evt.aggregateId, targetSystem: sysEnum } },
          data: res.ok
            ? { state: 'DELIVERED', attempts: { increment: 1 }, lastError: null }
            : { state: 'FAILED', attempts: { increment: 1 }, lastError: res.error || 'failed' },
        });
        if (!res.ok) allOk = false;
      } catch (e: any) {
        allOk = false;
        await this.prisma.deliveryStatus
          .update({
            where: { productId_targetSystem: { productId: evt.aggregateId, targetSystem: sysEnum } },
            data: { state: 'FAILED', attempts: { increment: 1 }, lastError: e?.message || 'error' },
          })
          .catch(() => undefined);
      }
    }
    await this.prisma.outbox.update({
      where: { id: evt.id },
      data: { status: allOk ? 'PROCESSED' : 'FAILED', attempts: { increment: 1 }, processedAt: new Date() },
    });
  }
}
