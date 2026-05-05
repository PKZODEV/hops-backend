import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { QueryPropertyDto } from './dto/query-property.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  // GET /api/v1/properties/public — public, no auth (for guest search)
  @Get('public')
  findAllPublic(@Query() query: QueryPropertyDto) {
    return this.propertiesService.findAllPublic(query);
  }

  // GET /api/v1/properties/public/:id — public detail
  @Get('public/:id')
  findOnePublic(@Param('id') id: string) {
    return this.propertiesService.findOnePublic(id);
  }

  // GET /api/v1/properties?type=HOTEL&isActive=true&city=Bangkok&search=sea
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query() query: QueryPropertyDto, @Request() req: any) {
    return this.propertiesService.findAll(query, req.user);
  }

  // GET /api/v1/properties/:id/stats
  @UseGuards(JwtAuthGuard)
  @Get(':id/stats')
  getStats(@Param('id') id: string, @Request() req: any) {
    return this.propertiesService.getStats(id, req.user);
  }

  // GET /api/v1/properties/:id
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.propertiesService.findOne(id, req.user);
  }

  // POST /api/v1/properties
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreatePropertyDto, @Request() req: any) {
    return this.propertiesService.create(dto, req.user);
  }

  // PATCH /api/v1/properties/:id
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePropertyDto, @Request() req: any) {
    return this.propertiesService.update(id, dto, req.user);
  }

  // GET /api/v1/properties/:propertyId/buildings
  @UseGuards(JwtAuthGuard)
  @Get(':propertyId/buildings')
  getBuildings(@Param('propertyId') propertyId: string, @Request() req: any) {
    return this.propertiesService.getBuildings(propertyId, req.user);
  }
}
