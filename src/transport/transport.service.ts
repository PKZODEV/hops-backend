import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

interface AuthUser {
  id: string;
  role: UserRole;
  vehicleOwnerId?: string | null;
}

@Injectable()
export class TransportService {
  constructor(private prisma: PrismaService) {}

  async findAll(_user: AuthUser, propertyId?: string) {
    return this.prisma.vehicle.findMany({
      where: propertyId ? { propertyId } : undefined,
      include: {
        property: { select: { id: true, name: true } },
        vehicleOwner: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, _user: AuthUser) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        property: { select: { id: true, name: true, city: true, userId: true } },
        vehicleOwner: true,
      },
    });
    if (!vehicle) throw new NotFoundException(`Vehicle #${id} not found`);
    return vehicle;
  }

  async create(dto: CreateVehicleDto, user: AuthUser) {
    if (
      user.role !== 'SUPER_ADMIN' &&
      user.role !== 'ADMIN' &&
      user.role !== 'HOTEL_OWNER' &&
      user.role !== 'QUEUE_OWNER'
    ) {
      throw new ForbiddenException();
    }

    const {
      propertyId,
      vehicleOwnerId,
      pricePerTrip,
      pricePerHour,
      pricePerDay,
      ...data
    } = dto;

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

  async update(id: string, dto: UpdateVehicleDto, user: AuthUser) {
    await this.findOne(id, user);
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

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.vehicle.delete({ where: { id } });
  }
}
