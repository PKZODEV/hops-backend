import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  async findByProperty(propertyId: string) {
    await this.ensurePropertyExists(propertyId);
    return this.prisma.roomType.findMany({
      where: { propertyId },
      include: {
        rates: { where: { isActive: true }, orderBy: { price: 'asc' } },
        _count: { select: { roomUnits: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const roomType = await this.prisma.roomType.findUnique({
      where: { id },
      include: {
        rates: { where: { isActive: true }, orderBy: { price: 'asc' } },
        roomUnits: {
          include: { floor: { include: { building: true } } },
          orderBy: { number: 'asc' },
        },
      },
    });
    if (!roomType) throw new NotFoundException(`Room type #${id} not found`);
    return roomType;
  }

  async create(dto: CreateRoomDto) {
    const { propertyId, ...data } = dto;
    await this.ensurePropertyExists(propertyId);
    return this.prisma.roomType.create({
      data: {
        ...data,
        images: data.images ?? [],
        amenities: data.amenities ?? [],
        property: { connect: { id: propertyId } },
      },
    });
  }

  async update(id: string, dto: UpdateRoomDto) {
    await this.ensureRoomTypeExists(id);
    const { propertyId, ...data } = dto;
    return this.prisma.roomType.update({
      where: { id },
      data: {
        ...data,
        ...(propertyId && { property: { connect: { id: propertyId } } }),
      },
    });
  }

  private async ensurePropertyExists(id: string) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) throw new NotFoundException(`Property #${id} not found`);
  }

  private async ensureRoomTypeExists(id: string) {
    const roomType = await this.prisma.roomType.findUnique({ where: { id } });
    if (!roomType) throw new NotFoundException(`Room type #${id} not found`);
  }
}
