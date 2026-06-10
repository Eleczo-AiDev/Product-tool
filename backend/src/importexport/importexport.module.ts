import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { ImportExportController } from './importexport.controller';
import { ImportExportService } from './importexport.service';

@Module({
  imports: [ProductsModule],
  controllers: [ImportExportController],
  providers: [ImportExportService],
})
export class ImportExportModule {}
