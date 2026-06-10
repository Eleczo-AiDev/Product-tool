import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { PublishController } from './publish.controller';
import { PublishService } from './publish.service';
import { ConnectorService } from './connectors';
import { PublishWorker } from './worker';

@Module({
  imports: [ProductsModule],
  controllers: [PublishController],
  providers: [PublishService, ConnectorService, PublishWorker],
})
export class PublishModule {}
