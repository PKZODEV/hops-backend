import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  Prisma,
  UserRole,
  BookingStatus,
  PaymentStatus,
  RoomStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QueryBookingDto } from './dto/query-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { RefundBookingDto } from './dto/refund-booking.dto';
import { CheckInBookingDto } from './dto/check-in-booking.dto';

interface AuthUser {
  id: string;
  role: UserRole;
}

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  private canSeeAll(user: AuthUser): boolean {
    return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
  }

  /// HOTEL_OWNER เห็นเฉพาะ booking ของ property ที่ตัวเองเป็นเจ้าของ
  private async ownerScope(user: AuthUser): Promise<Prisma.BookingWhereInput> {
    if (this.canSeeAll(user)) return {};
    const props = await this.prisma.property.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    return { propertyId: { in: props.map((p) => p.id) } };
  }

  private generateBookingCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) {
      s += chars[Math.floor(Math.random() * chars.length)];
    }
    return `HP-${s}`;
  }

  /// Public endpoint — guest จาก mobile สร้าง booking โดยไม่ต้อง auth
  async createPublic(dto: CreateBookingDto) {
    return this.createBooking(dto);
  }

  private async createBooking(dto: CreateBookingDto) {
    // ตรวจ roomType + ดึง propertyId
    const roomType = await this.prisma.roomType.findUnique({
      where: { id: dto.roomTypeId },
      include: { property: true },
    });
    if (!roomType) throw new NotFoundException('ไม่พบประเภทห้องที่จอง');

    const checkIn = new Date(dto.checkInDate);
    const checkOut = new Date(dto.checkOutDate);
    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
      throw new BadRequestException('วันที่ไม่ถูกต้อง');
    }
    if (checkOut <= checkIn) {
      throw new BadRequestException('วันที่เช็คเอาท์ต้องหลังวันเช็คอิน');
    }

    const ms = checkOut.getTime() - checkIn.getTime();
    const nights = Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
    const totalAmount = Number(dto.pricePerNight) * nights;

    // ตรวจสอบว่ามีห้องว่างอย่างน้อย 1 ห้องในประเภทนี้ก่อน
    const availableCount = await this.prisma.roomUnit.count({
      where: { roomTypeId: dto.roomTypeId, status: RoomStatus.AVAILABLE },
    });
    if (availableCount === 0) {
      throw new BadRequestException(
        'ห้องประเภทนี้ไม่มีห้องว่างแล้ว กรุณาเลือกประเภทอื่น',
      );
    }
    // ถ้า client ส่ง roomUnitId มา (legacy) ตรวจว่ายังว่าง
    if (dto.roomUnitId) {
      const unit = await this.prisma.roomUnit.findUnique({
        where: { id: dto.roomUnitId },
        select: { id: true, status: true, roomTypeId: true },
      });
      if (!unit || unit.roomTypeId !== dto.roomTypeId) {
        throw new NotFoundException('ไม่พบห้องพักที่จะจอง');
      }
      if (unit.status !== RoomStatus.AVAILABLE) {
        throw new BadRequestException('ห้องนี้ถูกจองหรือไม่ว่างแล้ว');
      }
    }

    // ลองสร้าง bookingCode (retry หาก unique ชน — ไม่น่าจะเกิดบ่อย)
    let attempts = 0;
    let booking = null;
    while (attempts < 5) {
      const code = this.generateBookingCode();
      try {
        booking = await this.prisma.booking.create({
          data: {
            bookingCode: code,
            propertyId: roomType.propertyId,
            roomTypeId: dto.roomTypeId,
            // ไม่ assign roomUnit ตอนสร้าง — admin จะ assign หลังจาก approve
            guestFirstName: dto.guestFirstName,
            guestLastName: dto.guestLastName,
            guestEmail: dto.guestEmail,
            guestPhone: dto.guestPhone,
            guestCount: dto.guestCount ?? 2,
            specialRequest: dto.specialRequest,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            nights,
            pricePerNight: new Prisma.Decimal(dto.pricePerNight),
            totalAmount: new Prisma.Decimal(totalAmount),
            provider: dto.provider ?? 'Hops',
            status: BookingStatus.AWAITING_ROOM_ASSIGNMENT,
            paymentStatus: PaymentStatus.PAID,
          },
          include: {
            property: { select: { id: true, name: true, images: true, address: true, city: true } },
            roomType: { select: { id: true, name: true, images: true, bedType: true } },
            roomUnit: { select: { id: true, number: true } },
          },
        });
        break;
      } catch (e: any) {
        if (e?.code === 'P2002') {
          attempts++;
          continue;
        }
        throw e;
      }
    }

    if (!booking) {
      throw new BadRequestException('ไม่สามารถสร้างหมายเลขการจองได้');
    }
    return booking;
  }

  async findAll(query: QueryBookingDto, user: AuthUser) {
    const scope = await this.ownerScope(user);
    const where: Prisma.BookingWhereInput = { ...scope };

    if (query.status) where.status = query.status;
    if (query.propertyId) where.propertyId = query.propertyId;
    if (query.guestEmail) where.guestEmail = query.guestEmail;
    if (query.search) {
      where.OR = [
        { bookingCode: { contains: query.search, mode: 'insensitive' } },
        { guestFirstName: { contains: query.search, mode: 'insensitive' } },
        { guestLastName: { contains: query.search, mode: 'insensitive' } },
        { guestEmail: { contains: query.search, mode: 'insensitive' } },
        { guestPhone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.group) {
      const today = startOfToday();
      switch (query.group) {
        case 'arriving':
          where.status = {
            in: [
              BookingStatus.PENDING,
              BookingStatus.AWAITING_ROOM_ASSIGNMENT,
              BookingStatus.CONFIRMED,
            ],
          };
          break;
        case 'in_stay':
          where.status = {
            in: [
              BookingStatus.CHECKED_IN,
              BookingStatus.CHECKOUT_PENDING,
              BookingStatus.AWAITING_EXTRA_PAYMENT,
            ],
          };
          break;
        case 'completed':
          where.status = BookingStatus.CHECKED_OUT;
          break;
        case 'cancelled':
          where.status = {
            in: [BookingStatus.CANCELLED, BookingStatus.REFUNDED, BookingStatus.NO_SHOW],
          };
          break;
        default:
          break;
      }
      // suppress unused-var warning
      void today;
    }

    return this.prisma.booking.findMany({
      where,
      include: {
        property: { select: { id: true, name: true, images: true, city: true, address: true, userId: true } },
        roomType: { select: { id: true, name: true, images: true, bedType: true } },
        roomUnit: { select: { id: true, number: true } },
        extraCharges: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /// Public lookup — สำหรับ mobile ดึงรายการโดยใช้ guestEmail (ยังไม่มี user account)
  async findByGuestEmail(email: string, group?: string) {
    const where: Prisma.BookingWhereInput = { guestEmail: email };
    if (group) {
      switch (group) {
        case 'arriving':
          where.status = {
            in: [
              BookingStatus.PENDING,
              BookingStatus.AWAITING_ROOM_ASSIGNMENT,
              BookingStatus.CONFIRMED,
            ],
          };
          break;
        case 'in_stay':
          where.status = {
            in: [
              BookingStatus.CHECKED_IN,
              BookingStatus.CHECKOUT_PENDING,
              BookingStatus.AWAITING_EXTRA_PAYMENT,
            ],
          };
          break;
        case 'completed':
          where.status = BookingStatus.CHECKED_OUT;
          break;
        case 'cancelled':
          where.status = {
            in: [BookingStatus.CANCELLED, BookingStatus.REFUNDED, BookingStatus.NO_SHOW],
          };
          break;
      }
    }
    return this.prisma.booking.findMany({
      where,
      include: {
        property: {
          select: {
            id: true,
            name: true,
            images: true,
            city: true,
            address: true,
            propertyCategory: { select: { id: true, name: true } },
          },
        },
        roomType: { select: { id: true, name: true, images: true, bedType: true } },
        roomUnit: { select: { id: true, number: true } },
      },
      orderBy: { checkInDate: 'desc' },
    });
  }

  async findOne(id: string, user: AuthUser) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        property: true,
        roomType: true,
        roomUnit: true,
      },
    });
    if (!booking) throw new NotFoundException('ไม่พบการจอง');

    if (!this.canSeeAll(user)) {
      const property = await this.prisma.property.findUnique({
        where: { id: booking.propertyId },
        select: { userId: true },
      });
      if (!property || property.userId !== user.id) throw new ForbiddenException();
    }
    return booking;
  }

  async findOnePublic(idOrCode: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { OR: [{ id: idOrCode }, { bookingCode: idOrCode }] },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            images: true,
            address: true,
            city: true,
            amenities: true,
            latitude: true,
            longitude: true,
          },
        },
        roomType: { select: { id: true, name: true, images: true, bedType: true, amenities: true } },
        roomUnit: { select: { id: true, number: true } },
        extraCharges: true,
      },
    });
    if (!booking) throw new NotFoundException('ไม่พบการจอง');

    // resolve amenity ids → master records (name, icon, type)
    const allIds = Array.from(
      new Set([
        ...(booking.property?.amenities ?? []),
        ...(booking.roomType?.amenities ?? []),
      ]),
    );
    let resolved: Record<string, { id: string; name: string; icon: string | null; type: string }> = {};
    if (allIds.length > 0) {
      const records = await this.prisma.amenity.findMany({
        where: {
          OR: [{ id: { in: allIds } }, { name: { in: allIds } }],
        },
      });
      records.forEach((r) => {
        resolved[r.id] = { id: r.id, name: r.name, icon: r.icon, type: r.type };
        // also index by name (in case stored as name)
        resolved[r.name] = { id: r.id, name: r.name, icon: r.icon, type: r.type };
      });
    }
    const mapAmenities = (ids: string[]) =>
      ids.map((id) => resolved[id] ?? { id, name: id, icon: null, type: 'HOTEL' });

    return {
      ...booking,
      property: booking.property
        ? {
            ...booking.property,
            amenitiesResolved: mapAmenities(booking.property.amenities ?? []),
          }
        : booking.property,
      roomType: booking.roomType
        ? {
            ...booking.roomType,
            amenitiesResolved: mapAmenities(booking.roomType.amenities ?? []),
          }
        : booking.roomType,
    };
  }

  private async assertCanManage(id: string, user: AuthUser) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      select: { id: true, propertyId: true, status: true },
    });
    if (!booking) throw new NotFoundException('ไม่พบการจอง');

    if (!this.canSeeAll(user)) {
      const property = await this.prisma.property.findUnique({
        where: { id: booking.propertyId },
        select: { userId: true },
      });
      if (!property || property.userId !== user.id) throw new ForbiddenException();
    }
    return booking;
  }

  /// Self check-in จาก mobile (ไม่มี auth) — ใช้ bookingCode หรือ booking id
  async selfCheckIn(idOrCode: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { OR: [{ id: idOrCode }, { bookingCode: idOrCode }] },
      select: {
        id: true,
        status: true,
        roomUnitId: true,
        checkInDate: true,
      },
    });
    if (!booking) throw new NotFoundException('ไม่พบการจอง');

    if (
      booking.status !== BookingStatus.CONFIRMED &&
      booking.status !== BookingStatus.PENDING
    ) {
      throw new BadRequestException(
        `ไม่สามารถ check-in ได้ในสถานะนี้ (${booking.status})`,
      );
    }

    // ต้องถึงวันที่จองแล้วถึงจะเช็คอินได้ (เปรียบเทียบเป็น date-only ใน timezone Asia/Bangkok)
    const tzOffsetMs = 7 * 60 * 60 * 1000;
    const todayBkk = new Date(Date.now() + tzOffsetMs)
      .toISOString()
      .slice(0, 10);
    const ciBkk = new Date(booking.checkInDate).toISOString().slice(0, 10);
    if (todayBkk < ciBkk) {
      throw new BadRequestException(
        'ยังไม่ถึงวันเช็คอิน — สามารถเช็คอินได้ตั้งแต่วันที่จองไว้',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.CHECKED_IN,
          checkedInAt: new Date(),
        },
        include: {
          property: { select: { id: true, name: true, images: true, address: true, city: true } },
          roomType: { select: { id: true, name: true, images: true, bedType: true } },
          roomUnit: { select: { id: true, number: true } },
        },
      });
      if (updated.roomUnitId) {
        await tx.roomUnit.update({
          where: { id: updated.roomUnitId },
          data: { status: RoomStatus.OCCUPIED },
        });
      }
      return updated;
    });
  }

  async checkIn(id: string, dto: CheckInBookingDto, user: AuthUser) {
    const current = await this.assertCanManage(id, user);
    if (current.status !== BookingStatus.CONFIRMED && current.status !== BookingStatus.PENDING) {
      throw new BadRequestException(`ไม่สามารถ check-in ได้ในสถานะนี้ (${current.status})`);
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.CHECKED_IN,
          checkedInAt: new Date(),
          roomUnitId: dto.roomUnitId ?? undefined,
          handledById: user.id,
        },
        include: {
          property: { select: { id: true, name: true } },
          roomType: { select: { id: true, name: true } },
          roomUnit: { select: { id: true, number: true } },
        },
      });
      if (updated.roomUnitId) {
        await tx.roomUnit.update({
          where: { id: updated.roomUnitId },
          data: { status: RoomStatus.OCCUPIED },
        });
      }
      return updated;
    });
  }

  async checkOut(id: string, user: AuthUser) {
    const current = await this.assertCanManage(id, user);
    if (current.status !== BookingStatus.CHECKED_IN) {
      throw new BadRequestException('ต้อง check-in ก่อนถึงจะ check-out ได้');
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.CHECKED_OUT,
          checkedOutAt: new Date(),
          handledById: user.id,
        },
      });
      if (updated.roomUnitId) {
        await tx.roomUnit.update({
          where: { id: updated.roomUnitId },
          data: { status: RoomStatus.AVAILABLE },
        });
      }
      return updated;
    });
  }

  async cancel(id: string, dto: CancelBookingDto, user: AuthUser) {
    const current = await this.assertCanManage(id, user);
    if (
      current.status === BookingStatus.CHECKED_OUT ||
      current.status === BookingStatus.CANCELLED ||
      current.status === BookingStatus.REFUNDED
    ) {
      throw new BadRequestException(`ไม่สามารถยกเลิกได้ในสถานะนี้ (${current.status})`);
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: dto.reason,
          handledById: user.id,
        },
      });
      if (updated.roomUnitId) {
        await tx.roomUnit.update({
          where: { id: updated.roomUnitId },
          data: { status: RoomStatus.AVAILABLE },
        });
      }
      return updated;
    });
  }

  async refund(id: string, dto: RefundBookingDto, user: AuthUser) {
    const current = await this.prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        propertyId: true,
        status: true,
        totalAmount: true,
        paymentStatus: true,
        cancelReason: true,
      },
    });
    if (!current) throw new NotFoundException('ไม่พบการจอง');
    if (!this.canSeeAll(user)) {
      const property = await this.prisma.property.findUnique({
        where: { id: current.propertyId },
        select: { userId: true },
      });
      if (!property || property.userId !== user.id) throw new ForbiddenException();
    }
    if (current.paymentStatus !== PaymentStatus.PAID) {
      throw new BadRequestException('ยังไม่มีการชำระเงิน จึงไม่ต้องคืนเงิน');
    }

    const amount = dto.amount ?? Number(current.totalAmount);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.REFUNDED,
          paymentStatus: PaymentStatus.REFUNDED,
          refundedAt: new Date(),
          refundAmount: new Prisma.Decimal(amount),
          cancelReason: dto.reason ?? current.cancelReason,
          handledById: user.id,
        },
      });
      if (updated.roomUnitId) {
        await tx.roomUnit.update({
          where: { id: updated.roomUnitId },
          data: { status: RoomStatus.AVAILABLE },
        });
      }
      return updated;
    });
  }

  /// Mobile ส่งคำขอเช็คเอาท์ — ยังไม่ออก รอ admin อนุมัติ
  async requestCheckout(idOrCode: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { OR: [{ id: idOrCode }, { bookingCode: idOrCode }] },
      select: { id: true, status: true },
    });
    if (!booking) throw new NotFoundException('ไม่พบการจอง');
    if (booking.status !== BookingStatus.CHECKED_IN) {
      throw new BadRequestException('ต้องเช็คอินก่อนถึงจะเช็คเอาท์ได้');
    }
    return this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.CHECKOUT_PENDING,
        checkoutRequestedAt: new Date(),
      },
      include: {
        property: { select: { id: true, name: true, images: true } },
        roomType: { select: { id: true, name: true, images: true } },
        roomUnit: { select: { id: true, number: true } },
      },
    });
  }

  /// Mobile ชำระค่าใช้จ่ายเพิ่มเติม → CHECKED_OUT
  async payExtraCharges(idOrCode: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { OR: [{ id: idOrCode }, { bookingCode: idOrCode }] },
      select: { id: true, status: true, roomUnitId: true },
    });
    if (!booking) throw new NotFoundException('ไม่พบการจอง');
    if (booking.status !== BookingStatus.AWAITING_EXTRA_PAYMENT) {
      throw new BadRequestException('ไม่อยู่ในสถานะรอชำระค่าใช้จ่ายเพิ่ม');
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.CHECKED_OUT,
          checkedOutAt: new Date(),
          extraChargesPaidAt: new Date(),
        },
        include: {
          property: { select: { id: true, name: true, images: true } },
          roomType: { select: { id: true, name: true, images: true } },
          roomUnit: { select: { id: true, number: true } },
          extraCharges: true,
        },
      });
      if (updated.roomUnitId) {
        await tx.roomUnit.update({
          where: { id: updated.roomUnitId },
          data: { status: RoomStatus.AVAILABLE },
        });
      }
      return updated;
    });
  }

  /// Admin assign room → AWAITING_ROOM_ASSIGNMENT → CONFIRMED + ห้อง RESERVED
  async assignRoom(id: string, roomUnitId: string, user: AuthUser) {
    const current = await this.assertCanManage(id, user);
    if (current.status !== BookingStatus.AWAITING_ROOM_ASSIGNMENT) {
      throw new BadRequestException(
        `ระบุห้องได้เฉพาะรายการที่รอเจ้าหน้าที่ระบุห้อง (${current.status})`,
      );
    }
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      select: { roomTypeId: true },
    });
    if (!booking) throw new NotFoundException('ไม่พบการจอง');
    const unit = await this.prisma.roomUnit.findUnique({
      where: { id: roomUnitId },
      select: { id: true, status: true, roomTypeId: true },
    });
    if (!unit || unit.roomTypeId !== booking.roomTypeId) {
      throw new BadRequestException('ห้องที่เลือกไม่ตรงกับประเภทห้องที่จอง');
    }
    if (unit.status !== RoomStatus.AVAILABLE) {
      throw new BadRequestException('ห้องนี้ไม่ว่าง');
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.CONFIRMED,
          roomUnitId,
          handledById: user.id,
        },
        include: {
          property: { select: { id: true, name: true } },
          roomType: { select: { id: true, name: true } },
          roomUnit: { select: { id: true, number: true } },
        },
      });
      await tx.roomUnit.update({
        where: { id: roomUnitId },
        data: { status: RoomStatus.RESERVED },
      });
      return updated;
    });
  }

  /// Admin อนุมัติเช็คเอาท์ พร้อม optional extra charges
  async approveCheckout(
    id: string,
    extras: { name: string; amount: number }[] | undefined,
    user: AuthUser,
  ) {
    const current = await this.assertCanManage(id, user);
    if (current.status !== BookingStatus.CHECKOUT_PENDING) {
      throw new BadRequestException('การจองไม่ได้อยู่ในสถานะรออนุมัติเช็คเอาท์');
    }
    const validExtras = (extras ?? []).filter(
      (e) => (e?.name?.trim()?.length ?? 0) > 0 && Number(e?.amount) > 0,
    );

    return this.prisma.$transaction(async (tx) => {
      // ลบ extras เดิม (ถ้ามี) แล้วใส่ใหม่
      await tx.bookingExtraCharge.deleteMany({ where: { bookingId: id } });

      if (validExtras.length === 0) {
        // ไม่มีค่าเพิ่ม → CHECKED_OUT เลย + room AVAILABLE
        const updated = await tx.booking.update({
          where: { id },
          data: {
            status: BookingStatus.CHECKED_OUT,
            checkedOutAt: new Date(),
            extraChargesTotal: null,
            handledById: user.id,
          },
          include: {
            property: { select: { id: true, name: true } },
            roomType: { select: { id: true, name: true } },
            roomUnit: { select: { id: true, number: true } },
            extraCharges: true,
          },
        });
        if (updated.roomUnitId) {
          await tx.roomUnit.update({
            where: { id: updated.roomUnitId },
            data: { status: RoomStatus.AVAILABLE },
          });
        }
        return updated;
      }

      // มีค่าเพิ่ม → AWAITING_EXTRA_PAYMENT
      await tx.bookingExtraCharge.createMany({
        data: validExtras.map((e) => ({
          bookingId: id,
          name: e.name.trim(),
          amount: new Prisma.Decimal(e.amount),
        })),
      });
      const total = validExtras.reduce((sum, e) => sum + Number(e.amount), 0);
      return tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.AWAITING_EXTRA_PAYMENT,
          extraChargesTotal: new Prisma.Decimal(total),
          handledById: user.id,
        },
        include: {
          property: { select: { id: true, name: true } },
          roomType: { select: { id: true, name: true } },
          roomUnit: { select: { id: true, number: true } },
          extraCharges: true,
        },
      });
    });
  }

  /// ย้อนสถานะ CHECKED_IN กลับเป็น CONFIRMED (กรณี check-in ผิด)
  async revertCheckIn(id: string, user: AuthUser) {
    const current = await this.assertCanManage(id, user);
    if (current.status !== BookingStatus.CHECKED_IN) {
      throw new BadRequestException('ย้อนกลับได้เฉพาะรายการที่อยู่ระหว่างเข้าพัก');
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.CONFIRMED,
          checkedInAt: null,
          handledById: user.id,
        },
      });
      if (updated.roomUnitId) {
        await tx.roomUnit.update({
          where: { id: updated.roomUnitId },
          data: { status: RoomStatus.RESERVED },
        });
      }
      return updated;
    });
  }

  async markNoShow(id: string, user: AuthUser) {
    const current = await this.assertCanManage(id, user);
    if (current.status !== BookingStatus.CONFIRMED && current.status !== BookingStatus.PENDING) {
      throw new BadRequestException(`ไม่สามารถ mark no-show ได้ในสถานะนี้ (${current.status})`);
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.NO_SHOW,
          cancelledAt: new Date(),
          handledById: user.id,
        },
      });
      if (updated.roomUnitId) {
        await tx.roomUnit.update({
          where: { id: updated.roomUnitId },
          data: { status: RoomStatus.AVAILABLE },
        });
      }
      return updated;
    });
  }

  /// Public submit review (จาก mobile หลังเช็คเอาท์)
  async submitReview(
    idOrCode: string,
    dto: { rating: number; comment?: string },
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: { OR: [{ id: idOrCode }, { bookingCode: idOrCode }] },
      select: {
        id: true,
        propertyId: true,
        guestFirstName: true,
        guestLastName: true,
      },
    });
    if (!booking) throw new NotFoundException('ไม่พบการจอง');
    if (!Number.isInteger(dto.rating) || dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('คะแนนต้องอยู่ระหว่าง 1-5');
    }

    return this.prisma.review.upsert({
      where: { bookingId: booking.id },
      update: {
        rating: dto.rating,
        comment: dto.comment,
      },
      create: {
        bookingId: booking.id,
        propertyId: booking.propertyId,
        rating: dto.rating,
        comment: dto.comment,
        guestName: `${booking.guestFirstName} ${booking.guestLastName}`.trim(),
      },
    });
  }

  async availableUnits(bookingId: string, user: AuthUser) {
    await this.assertCanManage(bookingId, user);
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { roomTypeId: true },
    });
    if (!booking) throw new NotFoundException('ไม่พบการจอง');
    return this.prisma.roomUnit.findMany({
      where: {
        roomTypeId: booking.roomTypeId,
        status: RoomStatus.AVAILABLE,
      },
      include: {
        floor: { include: { building: true } },
      },
      orderBy: { number: 'asc' },
    });
  }

  async stats(user: AuthUser) {
    const scope = await this.ownerScope(user);
    const all = await this.prisma.booking.groupBy({
      by: ['status'],
      where: scope,
      _count: { _all: true },
    });
    return all.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = r._count._all;
      return acc;
    }, {});
  }
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
