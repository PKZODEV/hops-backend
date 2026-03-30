import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFloorDto } from './dto/create-floor.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';

@Injectable()
export class FloorsService {
  constructor(private prisma: PrismaService) {}

  async findByBuilding(buildingId: string) {
    return this.prisma.floor.findMany({
      where: { buildingId },
      include: {
        roomUnits: {
          include: { roomType: true },
          orderBy: { number: 'asc' },
        },
      },
      orderBy: { number: 'asc' },
    });
  }

  async create(dto: CreateFloorDto) {
    const { buildingId, ...data } = dto;
    const building = await this.prisma.building.findUnique({ where: { id: buildingId } });
    if (!building) throw new NotFoundException(`Building #${buildingId} not found`);

    return this.prisma.floor.create({
      data: { ...data, building: { connect: { id: buildingId } } },
      include: { roomUnits: true },
    });
  }

  async update(id: string, dto: UpdateFloorDto) {
    const floor = await this.prisma.floor.findUnique({ where: { id } });
    if (!floor) throw new NotFoundException(`Floor #${id} not found`);

    const { buildingId, ...data } = dto;
    return this.prisma.floor.update({
      where: { id },
      data: {
        ...data,
        ...(buildingId && { building: { connect: { id: buildingId } } }),
      },
      include: { roomUnits: true },
    });
  }
}
