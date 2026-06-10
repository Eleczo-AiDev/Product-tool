import { Injectable, Logger } from '@nestjs/common';
import { SystemKey } from '../common/resolution';

/**
 * Per-system connectors. In production each would call the real HIVA /
 * Magento / CRM API. Here they are idempotent stubs that log the delivery,
 * so the full publish flow runs end-to-end out of the box.
 */
@Injectable()
export class ConnectorService {
  private readonly log = new Logger('Connector');

  async send(system: SystemKey, productId: string, payload: Record<string, any>): Promise<{ ok: boolean; error?: string }> {
    this.log.log(`[${system.toUpperCase()}] upsert product ${productId}: ${JSON.stringify(payload)}`);
    return { ok: true };
  }
}
