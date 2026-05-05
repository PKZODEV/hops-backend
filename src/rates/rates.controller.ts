import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { RatesService } from './rates.service';
import { CreateRateDto } from './dto/create-rate.dto';
import { UpdateRateDto } from './dto/update-rate.dto';

@Controller()
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  @Get('rooms/:roomId/rates')
  findByRoom(@Param('roomId') roomId: string) {
    return this.ratesService.findByRoom(roomId);
  }

  @Post('rates')
  create(@Body() dto: CreateRateDto) {
    return this.ratesService.create(dto);
  }

  @Patch('rates/:id')
  update(@Param('id') id: string, @Body() dto: UpdateRateDto) {
    return this.ratesService.update(id, dto);
  }

  @Delete('rates/:id')
  remove(@Param('id') id: string) {
    return this.ratesService.remove(id);
  }
}
