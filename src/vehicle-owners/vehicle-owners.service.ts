import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleOwnerDto } from './dto/create-vehicle-owner.dto';
import { UpdateVehicleOwnerDto } from './dto/update-vehicle-owner.dto';

interface AuthUser {
  id: string;
  role: UserRole;
  vehicleOwnerId?: string | null;
}

@Injectable()
export class VehicleOwnersService {
  constructor(private prisma: PrismaService) {}

  findAll(_user: AuthUser) {
    return this.prisma.vehicleOwner.findMany({
      include: { _count: { select: { vehicles: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, _user: AuthUser) {
    const owner = await this.prisma.vehicleOwner.findUnique({
      where: { id },
      include: {
        vehicles: {
          select: { id: true, name: true, type: true, status: true, licensePlate: true },
        },
        _count: { select: { vehicles: true } },
      },
    });
    if (!owner) throw new NotFoundException(`VehicleOwner #${id} not found`);
    return owner;
  }

  create(dto: CreateVehicleOwnerDto, user: AuthUser) {
    if (
      user.role !== 'SUPER_ADMIN' &&
      user.role !== 'ADMIN' &&
      user.role !== 'HOTEL_OWNER' &&
      user.role !== 'QUEUE_OWNER'
    ) {
      throw new ForbiddenException();
    }
    return this.prisma.vehicleOwner.create({ data: dto });
  }

  async update(id: string, dto: UpdateVehicleOwnerDto, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.vehicleOwner.update({ where: { id }, data: dto });
  }

  async remove(id: string, user: AuthUser) {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      throw new ForbiddenException();
    }
    await this.findOne(id, user);
    return this.prisma.vehicleOwner.delete({ where: { id } });
  }
}
