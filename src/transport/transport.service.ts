import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class TransportService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.vehicle.findMany({
      include: {
        property: { select: { id: true, name: true } },
        vehicleOwner: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByProperty(propertyId: string) {
    return this.prisma.vehicle.findMany({
      where: { propertyId },
      include: {
        property: { select: { id: true, name: true } },
        vehicleOwner: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        property: { select: { id: true, name: true, city: true } },
        vehicleOwner: true,
      },
    });
    if (!vehicle) throw new NotFoundException(`Vehicle #${id} not found`);
    return vehicle;
  }

  async create(dto: CreateVehicleDto) {
    const { propertyId, vehicleOwnerId, pricePerTrip, pricePerHour, pricePerDay, ...data } = dto;

    if (propertyId) {
      const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
      if (!property) throw new NotFoundException(`Property #${propertyId} not found`);
    }

    if (vehicleOwnerId) {
      const owner = await this.prisma.vehicleOwner.findUnique({ where: { id: vehicleOwnerId } });
      if (!owner) throw new NotFoundException(`VehicleOwner #${vehicleOwnerId} not found`);
    }

    return this.prisma.vehicle.create({
      data: {
        ...data,
        images: data.images ?? [],
        features: data.features ?? [],
        capacity: data.capacity ?? 4,
        pricePerTrip: pricePerTrip ?? null,
        pricePerHour: pricePerHour ?? null,
        pricePerDay: pricePerDay ?? null,
        ...(propertyId && { property: { connect: { id: propertyId } } }),
        ...(vehicleOwnerId && { vehicleOwner: { connect: { id: vehicleOwnerId } } }),
      },
      include: {
        property: { select: { id: true, name: true } },
        vehicleOwner: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: string, dto: UpdateVehicleDto) {
    await this.findOne(id);
    const { propertyId, vehicleOwnerId, pricePerTrip, pricePerHour, pricePerDay, ...data } = dto;
    return this.prisma.vehicle.update({
      where: { id },
      data: {
        ...data,
        ...(pricePerTrip !== undefined && { pricePerTrip }),
        ...(pricePerHour !== undefined && { pricePerHour }),
        ...(pricePerDay !== undefined && { pricePerDay }),
        ...(propertyId && { property: { connect: { id: propertyId } } }),
        ...(vehicleOwnerId && { vehicleOwner: { connect: { id: vehicleOwnerId } } }),
      },
      include: {
        property: { select: { id: true, name: true } },
        vehicleOwner: { select: { id: true, name: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.vehicle.delete({ where: { id } });
  }
}
