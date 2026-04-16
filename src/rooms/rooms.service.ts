import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

interface AuthUser {
  id: string;
  role: UserRole;
}

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  async findByProperty(propertyId: string, user: AuthUser) {
    await this.ensurePropertyAccess(propertyId, user);
    return this.prisma.roomType.findMany({
      where: { propertyId },
      include: {
        rates: { where: { isActive: true }, orderBy: { price: 'asc' } },
        _count: { select: { roomUnits: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, user: AuthUser) {
    const roomType = await this.prisma.roomType.findUnique({
      where: { id },
      include: {
        property: { select: { userId: true } },
        rates: { where: { isActive: true }, orderBy: { price: 'asc' } },
        roomUnits: {
          include: { floor: { include: { building: true } } },
          orderBy: { number: 'asc' },
        },
      },
    });
    if (!roomType) throw new NotFoundException(`Room type #${id} not found`);
    if (user.role !== 'SUPER_ADMIN' && roomType.property.userId !== user.id) {
      throw new ForbiddenException();
    }
    return roomType;
  }

  async create(dto: CreateRoomDto, user: AuthUser) {
    const { propertyId, ...data } = dto;
    await this.ensurePropertyAccess(propertyId, user);
    return this.prisma.roomType.create({
      data: {
        ...data,
        images: data.images ?? [],
        amenities: data.amenities ?? [],
        property: { connect: { id: propertyId } },
      },
    });
  }

  async update(id: string, dto: UpdateRoomDto, user: AuthUser) {
    await this.findOne(id, user);
    const { propertyId, ...data } = dto;
    if (propertyId) await this.ensurePropertyAccess(propertyId, user);
    return this.prisma.roomType.update({
      where: { id },
      data: {
        ...data,
        ...(propertyId && { property: { connect: { id: propertyId } } }),
      },
    });
  }

  private async ensurePropertyAccess(id: string, user: AuthUser) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!property) throw new NotFoundException(`Property #${id} not found`);
    if (user.role !== 'SUPER_ADMIN' && property.userId !== user.id) {
      throw new ForbiddenException();
    }
  }
}
