import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { RatesService } from './rates.service';
import { CreateRateDto } from './dto/create-rate.dto';
import { UpdateRateDto } from './dto/update-rate.dto';

@Controller()
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  // GET /api/v1/rooms/:roomId/rates
  @Get('rooms/:roomId/rates')
  findByRoom(@Param('roomId') roomId: string) {
    return this.ratesService.findByRoom(roomId);
  }

  // POST /api/v1/rates
  @Post('rates')
  create(@Body() dto: CreateRateDto) {
    return this.ratesService.create(dto);
  }

  // PATCH /api/v1/rates/:id
  @Patch('rates/:id')
  update(@Param('id') id: string, @Body() dto: UpdateRateDto) {
    return this.ratesService.update(id, dto);
  }
}
