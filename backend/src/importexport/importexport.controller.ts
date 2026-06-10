import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { ImportExportService } from './importexport.service';

@Controller()
export class ImportExportController {
  constructor(private svc: ImportExportService) {}

  @Get('export/products.csv')
  async exportCsv(@Res() res: Response) {
    const csv = await this.svc.exportCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="products_export.csv"');
    res.send(csv);
  }

  @Post('import/products')
  importCsv(@Body() body: any) {
    return this.svc.importCsv(body.setId, body.csv || '');
  }
}
