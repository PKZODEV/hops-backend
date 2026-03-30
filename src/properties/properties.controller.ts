import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { QueryPropertyDto } from './dto/query-property.dto';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  // GET /api/v1/properties?type=HOTEL&isActive=true&city=Bangkok&search=sea
  @Get()
  findAll(@Query() query: QueryPropertyDto) {
    return this.propertiesService.findAll(query);
  }

  // GET /api/v1/properties/:id/stats
  @Get(':id/stats')
  getStats(@Param('id') id: string) {
    return this.propertiesService.getStats(id);
  }

  // GET /api/v1/properties/:id
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.propertiesService.findOne(id);
  }

  // POST /api/v1/properties
  @Post()
  create(@Body() dto: CreatePropertyDto) {
    return this.propertiesService.create(dto);
  }

  // PATCH /api/v1/properties/:id
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePropertyDto) {
    return this.propertiesService.update(id, dto);
  }
}
