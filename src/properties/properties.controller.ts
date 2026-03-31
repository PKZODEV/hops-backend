import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { QueryPropertyDto } from './dto/query-property.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  // GET /api/v1/properties?type=HOTEL&isActive=true&city=Bangkok&search=sea
  @Get()
  findAll(@Query() query: QueryPropertyDto, @Request() req: any) {
    return this.propertiesService.findAll(query, req.user.id);
  }

  // GET /api/v1/properties/:id/stats
  @Get(':id/stats')
  getStats(@Param('id') id: string, @Request() req: any) {
    return this.propertiesService.getStats(id, req.user.id);
  }

  // GET /api/v1/properties/:id
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.propertiesService.findOne(id, req.user.id);
  }

  // POST /api/v1/properties
  @Post()
  create(@Body() dto: CreatePropertyDto, @Request() req: any) {
    return this.propertiesService.create(dto, req.user.id);
  }

  // PATCH /api/v1/properties/:id
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePropertyDto, @Request() req: any) {
    return this.propertiesService.update(id, dto, req.user.id);
  }

  // GET /api/v1/properties/:propertyId/buildings
  @Get(':propertyId/buildings')
  getBuildings(@Param('propertyId') propertyId: string, @Request() req: any) {
    return this.propertiesService.getBuildings(propertyId, req.user.id);
  }
}
