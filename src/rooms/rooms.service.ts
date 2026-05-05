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

  private canSeeAll(user: AuthUser): boolean {
    return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
  }

  async findByProperty(propertyId: string, user: AuthUser) {
    await this.ensurePropertyAccess(propertyId, user);
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { markupPercentage: true },
    });
    const markup = property?.markupPercentage ?? 0;
    const rooms = await this.prisma.roomType.findMany({
      where: { propertyId },
      include: {
        rates: {
          where: { isActive: true },
          orderBy: [{ startDate: 'asc' }, { price: 'asc' }],
        },
        _count: { select: { roomUnits: true } },
      },
      orderBy: { name: 'asc' },
    });
    return rooms.map((rt) => ({
      ...rt,
      markupPercentage: markup,
      displayPrice: this.computeDisplayPrice(rt.rates as any, markup),
    }));
  }

  /**
   * เลือก rate ที่เหมาะกับวันที่ (ถ้ามี startDate/endDate ครอบคลุมวันนั้น) ใช้ก่อน,
   * ไม่งั้น fallback มาที่ base rate (rate ที่ไม่มี startDate/endDate) ที่ถูกที่สุด,
   * แล้วบวก markup % จาก property.
   */
  private computeDisplayPrice(
    rates: Array<{ id: string; price: any; startDate: Date | null; endDate: Date | null }>,
    markupPercentage: number,
    onDate: Date = new Date(),
  ) {
    if (!rates?.length) return null;
    const dateOnly = new Date(onDate);
    dateOnly.setHours(0, 0, 0, 0);
    const special = rates.find(
      (r) =>
        r.startDate &&
        r.endDate &&
        new Date(r.startDate) <= dateOnly &&
        dateOnly <= new Date(r.endDate),
    );
    const base = rates
      .filter((r) => !r.startDate && !r.endDate)
      .sort((a, b) => Number(a.price) - Number(b.price))[0];
    const chosen = special ?? base ?? rates[0];
    if (!chosen) return null;
    const basePrice = Number(chosen.price);
    const finalPrice = basePrice * (1 + markupPercentage / 100);
    return {
      rateId: chosen.id,
      basePrice,
      markupPercentage,
      finalPrice: Math.round(finalPrice * 100) / 100,
      isSpecialDate: !!special,
    };
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
    if (!this.canSeeAll(user) && roomType.property.userId !== user.id) {
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
    if (!this.canSeeAll(user) && property.userId !== user.id) {
      throw new ForbiddenException();
    }
  }
}
