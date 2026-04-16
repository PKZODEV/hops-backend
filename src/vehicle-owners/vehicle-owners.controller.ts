import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { VehicleOwnersService } from './vehicle-owners.service';
import { CreateVehicleOwnerDto } from './dto/create-vehicle-owner.dto';
import { UpdateVehicleOwnerDto } from './dto/update-vehicle-owner.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('vehicle-owners')
export class VehicleOwnersController {
  constructor(private readonly service: VehicleOwnersService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.service.findAll(req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.service.findOne(id, req.user);
  }

  @Post()
  create(@Body() dto: CreateVehicleOwnerDto, @Request() req: any) {
    return this.service.create(dto, req.user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVehicleOwnerDto,
    @Request() req: any,
  ) {
    return this.service.update(id, dto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.service.remove(id, req.user);
  }
}
