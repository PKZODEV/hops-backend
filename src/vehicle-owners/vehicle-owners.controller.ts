import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { VehicleOwnersService } from './vehicle-owners.service';
import { CreateVehicleOwnerDto } from './dto/create-vehicle-owner.dto';
import { UpdateVehicleOwnerDto } from './dto/update-vehicle-owner.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('vehicle-owners')
export class VehicleOwnersController {
  constructor(private readonly service: VehicleOwnersService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateVehicleOwnerDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVehicleOwnerDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
