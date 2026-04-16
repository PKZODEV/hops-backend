import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller()
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  // GET /api/v1/properties/:propertyId/rooms
  @Get('properties/:propertyId/rooms')
  findByProperty(@Param('propertyId') propertyId: string, @Request() req: any) {
    return this.roomsService.findByProperty(propertyId, req.user);
  }

  // POST /api/v1/rooms
  @Post('rooms')
  create(@Body() dto: CreateRoomDto, @Request() req: any) {
    return this.roomsService.create(dto, req.user);
  }

  // PATCH /api/v1/rooms/:id
  @Patch('rooms/:id')
  update(@Param('id') id: string, @Body() dto: UpdateRoomDto, @Request() req: any) {
    return this.roomsService.update(id, dto, req.user);
  }
}
