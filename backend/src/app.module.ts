import { Module, Controller, Get } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AttributesModule } from './attributes/attributes.module';
import { MastersModule } from './masters/masters.module';
import { SetsModule } from './sets/sets.module';
import { ProductsModule } from './products/products.module';
import { PublishModule } from './publish/publish.module';
import { ImportExportModule } from './importexport/importexport.module';

@Controller()
class HealthController {
  @Get('health')
  health() {
    return { status: 'ok', ts: Date.now() };
  }
}

@Module({
  imports: [
    PrismaModule,
    AttributesModule,
    MastersModule,
    SetsModule,
    ProductsModule,
    PublishModule,
    ImportExportModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
