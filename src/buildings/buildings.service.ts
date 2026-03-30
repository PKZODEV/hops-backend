import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';

@Injectable()
export class BuildingsService {
  constructor(private prisma: PrismaService) {}

  async findByProperty(propertyId: string) {
    return this.prisma.building.findMany({
      where: { propertyId },
      include: {
        floors: {
          include: {
            roomUnits: { include: { roomType: true }, orderBy: { number: 'asc' } },
          },
          orderBy: { number: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateBuildingDto) {
    const { propertyId, ...data } = dto;
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundException(`Property #${propertyId} not found`);

    return this.prisma.building.create({
      data: { ...data, property: { connect: { id: propertyId } } },
      include: { floors: true },
    });
  }

  async update(id: string, dto: UpdateBuildingDto) {
    const building = await this.prisma.building.findUnique({ where: { id } });
    if (!building) throw new NotFoundException(`Building #${id} not found`);

    const { propertyId, ...data } = dto;
    return this.prisma.building.update({
      where: { id },
      data: {
        ...data,
        ...(propertyId && { property: { connect: { id: propertyId } } }),
      },
      include: { floors: true },
    });
  }

  async remove(id: string) {
    const building = await this.prisma.building.findUnique({
      where: { id },
      include: { floors: { include: { roomUnits: true } } },
    });
    if (!building) throw new NotFoundException(`Building #${id} not found`);
    const hasRooms = building.floors.some(f => f.roomUnits.length > 0);
    if (hasRooms) throw new BadRequestException('ไม่สามารถลบอาคารที่มีห้องพักได้');
    return this.prisma.building.delete({ where: { id } });
  }
}
