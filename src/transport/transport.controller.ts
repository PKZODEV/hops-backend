import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { TransportService } from './transport.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('transport')
export class TransportController {
  constructor(private readonly transportService: TransportService) {}

  // GET /api/v1/transport?propertyId=xxx
  @Get()
  findAll(@Request() req: any, @Query('propertyId') propertyId?: string) {
    return this.transportService.findAll(req.user, propertyId);
  }

  // GET /api/v1/transport/:id
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.transportService.findOne(id, req.user);
  }

  // POST /api/v1/transport
  @Post()
  create(@Body() dto: CreateVehicleDto, @Request() req: any) {
    return this.transportService.create(dto, req.user);
  }

  // PATCH /api/v1/transport/:id
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
    @Request() req: any,
  ) {
    return this.transportService.update(id, dto, req.user);
  }

  // DELETE /api/v1/transport/:id
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.transportService.remove(id, req.user);
  }
}
