import { Body, Controller, Headers, Param, Post } from '@nestjs/common';
import { PublishService } from './publish.service';

@Controller('products')
export class PublishController {
  constructor(private svc: PublishService) {}

  @Post('publish')
  bulk(@Body() body: any, @Headers('x-actor') actor?: string) { return this.svc.publishMany(body?.ids || [], body?.systems, actor); }

  @Post(':id/publish')
  one(@Param('id') id: string, @Body() body: any, @Headers('x-actor') actor?: string) { return this.svc.publishOne(id, body?.systems, actor); }
}
