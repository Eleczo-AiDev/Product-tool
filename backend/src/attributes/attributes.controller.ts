import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { AttributesService } from './attributes.service';
import { CreateAttributeDto, UpdateAttributeDto } from './dto';

@Controller('attributes')
export class AttributesController {
  constructor(private svc: AttributesService) {}

  @Get() list() { return this.svc.list(); }
  @Post() create(@Body() dto: CreateAttributeDto) { return this.svc.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateAttributeDto) { return this.svc.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
}
