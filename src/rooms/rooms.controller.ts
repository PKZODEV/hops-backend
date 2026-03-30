import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Controller()
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  // GET /api/v1/properties/:propertyId/rooms
  @Get('properties/:propertyId/rooms')
  findByProperty(@Param('propertyId') propertyId: string) {
    return this.roomsService.findByProperty(propertyId);
  }

  // POST /api/v1/rooms
  @Post('rooms')
  create(@Body() dto: CreateRoomDto) {
    return this.roomsService.create(dto);
  }

  // PATCH /api/v1/rooms/:id
  @Patch('rooms/:id')
  update(@Param('id') id: string, @Body() dto: UpdateRoomDto) {
    return this.roomsService.update(id, dto);
  }
}
