import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { MastersService } from './masters.service';

@Controller('masters')
export class MastersController {
  constructor(private svc: MastersService) {}

  @Get() list() { return this.svc.list(); }
  @Post() create(@Body() dto: any) { return this.svc.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) { return this.svc.update(id, dto); }
}
