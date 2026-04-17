import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { QueryPropertyDto } from './dto/query-property.dto';

interface AuthUser {
  id: string;
  role: UserRole;
}

@Injectable()
export class PropertiesService {
  constructor(private prisma: PrismaService) {}

  /** SUPER_ADMIN and ADMIN can see all; others see only their own. */
  private canSeeAll(user: AuthUser): boolean {
    return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
  }

  private ownerScope(user: AuthUser): Prisma.PropertyWhereInput {
    return this.canSeeAll(user) ? {} : { userId: user.id };
  }

  async findAll(query: QueryPropertyDto, user: AuthUser) {
    const where: Prisma.PropertyWhereInput = { ...this.ownerScope(user) };

    if (query.type) where.type = query.type;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.city) where.city = { contains: query.city, mode: 'insensitive' };
    if (query.search) {
      where.AND = [
        this.ownerScope(user),
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
        propertyCategory: true,
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

  async findOne(id: string, user: AuthUser) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        propertyCategory: true,
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
    if (!this.canSeeAll(user) && property.userId !== user.id) {
      throw new ForbiddenException();
    }
    return property;
  }

  async getBuildings(propertyId: string, user: AuthUser) {
    await this.findOne(propertyId, user);
    return this.prisma.building.findMany({
      where: { propertyId },
      include: { floors: { orderBy: { number: 'asc' } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreatePropertyDto, user: AuthUser) {
    // เจ้าของที่พักมีได้แค่โรงแรมเดียว
    if (user.role === 'HOTEL_OWNER') {
      const existing = await this.prisma.property.count({ where: { userId: user.id } });
      if (existing > 0) {
        throw new BadRequestException('เจ้าของที่พักสามารถมีที่พักได้เพียง 1 แห่งเท่านั้น');
      }
    }
    if (user.role === 'QUEUE_OWNER') {
      throw new ForbiddenException('เจ้าของคิวรถไม่สามารถสร้างที่พักได้');
    }
    return this.prisma.property.create({
      data: {
        ...dto,
        userId: user.id,
        amenities: dto.amenities ?? [],
        images: dto.images ?? [],
      },
    });
  }

  async update(id: string, dto: UpdatePropertyDto, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.property.update({
      where: { id },
      data: dto,
    });
  }

  async getStats(propertyId: string, user: AuthUser) {
    const property = await this.findOne(propertyId, user);

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

    return {
      property: { id: property.id, name: property.name },
      rooms,
      occupancyRate,
      buildingCount,
      roomTypeCount,
      adminCount,
    };
  }
}
