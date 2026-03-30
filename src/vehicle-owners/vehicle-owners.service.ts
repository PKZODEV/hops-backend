import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleOwnerDto } from './dto/create-vehicle-owner.dto';
import { UpdateVehicleOwnerDto } from './dto/update-vehicle-owner.dto';

@Injectable()
export class VehicleOwnersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.vehicleOwner.findMany({
      include: { _count: { select: { vehicles: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const owner = await this.prisma.vehicleOwner.findUnique({
      where: { id },
      include: {
        vehicles: { select: { id: true, name: true, type: true, status: true, licensePlate: true } },
        _count: { select: { vehicles: true } },
      },
    });
    if (!owner) throw new NotFoundException(`VehicleOwner #${id} not found`);
    return owner;
  }

  create(dto: CreateVehicleOwnerDto) {
    return this.prisma.vehicleOwner.create({ data: dto });
  }

  async update(id: string, dto: UpdateVehicleOwnerDto) {
    await this.findOne(id);
    return this.prisma.vehicleOwner.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.vehicleOwner.delete({ where: { id } });
  }
}
