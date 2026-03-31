import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { QueryPropertyDto } from './dto/query-property.dto';

@Injectable()
export class PropertiesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryPropertyDto, userId: string) {
    const where: Prisma.PropertyWhereInput = { userId };

    if (query.type) where.type = query.type;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.city) where.city = { contains: query.city, mode: 'insensitive' };
    if (query.search) {
      where.AND = [
        { userId },
        {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { city: { contains: query.search, mode: 'insensitive' } },
            { address: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    return this.prisma.property.findMany({
      where,
      include: {
        roomTypes: {
          where: { isActive: true },
          include: {
            rates: { where: { isActive: true }, orderBy: { price: 'asc' }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        buildings: {
          include: {
            floors: {
              include: {
                roomUnits: {
                  include: { roomType: true },
                  orderBy: { number: 'asc' },
                },
              },
              orderBy: { number: 'asc' },
            },
          },
          orderBy: { name: 'asc' },
        },
        roomTypes: {
          include: {
            rates: { where: { isActive: true }, orderBy: { price: 'asc' } },
          },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!property) throw new NotFoundException(`Property #${id} not found`);
    if (property.userId !== userId) throw new ForbiddenException();
    return property;
  }

  async getBuildings(propertyId: string, userId: string) {
    await this.findOne(propertyId, userId);
    return this.prisma.building.findMany({
      where: { propertyId },
      include: { floors: { orderBy: { number: 'asc' } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreatePropertyDto, userId: string) {
    return this.prisma.property.create({
      data: {
        ...dto,
        userId,
        amenities: dto.amenities ?? [],
        images: dto.images ?? [],
      },
    });
  }

  async update(id: string, dto: UpdatePropertyDto, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.property.update({
      where: { id },
      data: dto,
    });
  }

  async getStats(propertyId: string, userId: string) {
    const property = await this.findOne(propertyId, userId);

    const roomGroups = await this.prisma.roomUnit.groupBy({
      by: ['status'],
      where: { floor: { building: { propertyId } } },
      _count: { id: true },
    });

    const rooms = { total: 0, available: 0, occupied: 0, maintenance: 0, disabled: 0 };
    for (const g of roomGroups) {
      const n = g._count.id;
      rooms.total += n;
      if (g.status === 'AVAILABLE') rooms.available = n;
      else if (g.status === 'OCCUPIED') rooms.occupied = n;
      else if (g.status === 'MAINTENANCE') rooms.maintenance = n;
      else if (g.status === 'DISABLED') rooms.disabled = n;
    }

    const [buildingCount, roomTypeCount, adminCount] = await Promise.all([
      this.prisma.building.count({ where: { propertyId } }),
      this.prisma.roomType.count({ where: { propertyId, isActive: true } }),
      this.prisma.user.count({ where: { isActive: true } }),
    ]);

    const occupableRooms = rooms.available + rooms.occupied;
    const occupancyRate = occupableRooms > 0
      ? Math.round((rooms.occupied / occupableRooms) * 100)
      : 0;

    return { property: { id: property.id, name: property.name }, rooms, occupancyRate, buildingCount, roomTypeCount, adminCount };
  }
}
