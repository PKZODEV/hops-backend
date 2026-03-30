import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomUnitDto } from './dto/create-room-unit.dto';
import { UpdateRoomUnitDto } from './dto/update-room-unit.dto';

@Injectable()
export class RoomUnitsService {
  constructor(private prisma: PrismaService) {}

  async findByProperty(propertyId: string) {
    return this.prisma.roomUnit.findMany({
      where: { floor: { building: { propertyId } } },
      include: {
        roomType: true,
        floor: { include: { building: true } },
      },
      orderBy: { number: 'asc' },
    });
  }

  async findOne(id: string) {
    const unit = await this.prisma.roomUnit.findUnique({
      where: { id },
      include: {
        roomType: { include: { rates: { where: { isActive: true }, orderBy: { price: 'asc' } } } },
        floor: { include: { building: { include: { property: true } } } },
      },
    });
    if (!unit) throw new NotFoundException(`Room unit #${id} not found`);
    return unit;
  }

  async create(dto: CreateRoomUnitDto) {
    const { floorId, roomTypeId, images, amenities, ...data } = dto;

    const floor = await this.prisma.floor.findUnique({ where: { id: floorId } });
    if (!floor) throw new NotFoundException(`Floor #${floorId} not found`);

    const roomType = await this.prisma.roomType.findUnique({ where: { id: roomTypeId } });
    if (!roomType) throw new NotFoundException(`Room type #${roomTypeId} not found`);

    return this.prisma.roomUnit.create({
      data: {
        ...data,
        amenities: amenities ?? [],
        images: images ?? [],
        floor: { connect: { id: floorId } },
        roomType: { connect: { id: roomTypeId } },
      },
      include: {
        roomType: true,
        floor: { include: { building: true } },
      },
    });
  }

  async update(id: string, dto: UpdateRoomUnitDto) {
    const unit = await this.prisma.roomUnit.findUnique({ where: { id } });
    if (!unit) throw new NotFoundException(`Room unit #${id} not found`);

    const { floorId, roomTypeId, ...data } = dto;
    return this.prisma.roomUnit.update({
      where: { id },
      data: {
        ...data,
        ...(floorId && { floor: { connect: { id: floorId } } }),
        ...(roomTypeId && { roomType: { connect: { id: roomTypeId } } }),
      },
      include: {
        roomType: true,
        floor: { include: { building: true } },
      },
    });
  }
}
