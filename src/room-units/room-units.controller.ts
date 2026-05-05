import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { RoomUnitsService } from './room-units.service';
import { CreateRoomUnitDto } from './dto/create-room-unit.dto';
import { UpdateRoomUnitDto } from './dto/update-room-unit.dto';

@Controller()
export class RoomUnitsController {
  constructor(private readonly roomUnitsService: RoomUnitsService) {}

  @Get('properties/:propertyId/room-units')
  findByProperty(@Param('propertyId') propertyId: string) {
    return this.roomUnitsService.findByProperty(propertyId);
  }

  @Get('room-units/:id')
  findOne(@Param('id') id: string) {
    return this.roomUnitsService.findOne(id);
  }

  @Post('room-units')
  create(@Body() dto: CreateRoomUnitDto) {
    return this.roomUnitsService.create(dto);
  }

  @Patch('room-units/:id')
  update(@Param('id') id: string, @Body() dto: UpdateRoomUnitDto) {
    return this.roomUnitsService.update(id, dto);
  }
}
