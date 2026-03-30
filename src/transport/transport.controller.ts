import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { TransportService } from './transport.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Controller('transport')
export class TransportController {
  constructor(private readonly transportService: TransportService) {}

  // GET /api/v1/transport?propertyId=xxx
  @Get()
  findAll(@Query('propertyId') propertyId?: string) {
    if (propertyId) return this.transportService.findByProperty(propertyId);
    return this.transportService.findAll();
  }

  // GET /api/v1/transport/:id
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transportService.findOne(id);
  }

  // POST /api/v1/transport
  @Post()
  create(@Body() dto: CreateVehicleDto) {
    return this.transportService.create(dto);
  }

  // PATCH /api/v1/transport/:id
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.transportService.update(id, dto);
  }

  // DELETE /api/v1/transport/:id
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.transportService.remove(id);
  }
}
