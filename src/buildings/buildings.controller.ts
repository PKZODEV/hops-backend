import { Controller, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { BuildingsService } from './buildings.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';

@Controller()
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  // POST /api/v1/buildings
  @Post('buildings')
  create(@Body() dto: CreateBuildingDto) {
    return this.buildingsService.create(dto);
  }

  // PATCH /api/v1/buildings/:id
  @Patch('buildings/:id')
  update(@Param('id') id: string, @Body() dto: UpdateBuildingDto) {
    return this.buildingsService.update(id, dto);
  }

  // DELETE /api/v1/buildings/:id
  @Delete('buildings/:id')
  remove(@Param('id') id: string) {
    return this.buildingsService.remove(id);
  }
}
