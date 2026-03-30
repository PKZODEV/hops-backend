import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { FloorsService } from './floors.service';
import { CreateFloorDto } from './dto/create-floor.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';

@Controller()
export class FloorsController {
  constructor(private readonly floorsService: FloorsService) {}

  // GET /api/v1/buildings/:buildingId/floors
  @Get('buildings/:buildingId/floors')
  findByBuilding(@Param('buildingId') buildingId: string) {
    return this.floorsService.findByBuilding(buildingId);
  }

  // POST /api/v1/floors
  @Post('floors')
  create(@Body() dto: CreateFloorDto) {
    return this.floorsService.create(dto);
  }

  // PATCH /api/v1/floors/:id
  @Patch('floors/:id')
  update(@Param('id') id: string, @Body() dto: UpdateFloorDto) {
    return this.floorsService.update(id, dto);
  }
}
