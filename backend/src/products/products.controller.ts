import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private svc: ProductsService) {}

  @Get() list() { return this.svc.list(); }
  @Get('deleted') listDeleted() { return this.svc.listDeleted(); }
  @Get('audit') audit() { return this.svc.auditFeed(); }
  @Post() create(@Body() dto: any, @Headers('x-actor') actor?: string) { return this.svc.create(dto, actor); }
  @Get(':id') get(@Param('id') id: string) { return this.svc.get(id); }
  @Get(':id/history') history(@Param('id') id: string) { return this.svc.history(id); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any, @Headers('x-actor') actor?: string) { return this.svc.update(id, dto, actor); }
  @Delete(':id') remove(@Param('id') id: string, @Headers('x-actor') actor?: string) { return this.svc.remove(id, actor); }
  @Post(':id/revert/:revisionId') revert(@Param('id') id: string, @Param('revisionId') revisionId: string, @Headers('x-actor') actor?: string) { return this.svc.revert(id, revisionId, actor); }
  @Post(':id/restore') restore(@Param('id') id: string, @Headers('x-actor') actor?: string) { return this.svc.restore(id, actor); }
  @Get(':id/resolve') resolve(@Param('id') id: string, @Query('system') system: string) {
    return this.svc.resolve(id, system || 'hiva');
  }
}
