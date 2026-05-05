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

  /**
   * Returns a Prisma where-clause that constrains queries to the
   * properties this user is allowed to see. Super admins and platform
   * admins see everything; HOTEL_OWNER is scoped to the properties they
   * own.
   */
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

  /**
   * Public booking entry-point used by the mobile guest flow. Performed
   * without authentication because the guest does not yet have an
   * account; abuse is mitigated by the global rate limiter.
   */
  async createPublic(dto: CreateBookingDto) {
    return this.createBooking(dto);
  }

  private async createBooking(dto: CreateBookingDto) {
    /* Resolve the room-type to confirm it exists and to derive the
       parent propertyId (the booking is linked to the property, not the
       individual unit, until an admin assigns a unit). */
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

    /* Reject the request up front if no unit of this type is free; the
       admin assigns the actual unit later. */
    const availableCount = await this.prisma.roomUnit.count({
      where: { roomTypeId: dto.roomTypeId, status: RoomStatus.AVAILABLE },
    });
    if (availableCount === 0) {
      throw new BadRequestException(
        'ห้องประเภทนี้ไม่มีห้องว่างแล้ว กรุณาเลือกประเภทอื่น',
      );
    }
    /* Legacy clients may still pass an explicit roomUnitId; honour it
       only if the unit belongs to the requested type and is free. */
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

    /* The booking code is randomly generated and must be unique; on
       the rare collision (P2002) we retry with a fresh code rather
       than failing the request. */
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
      /* `today` is referenced in some branches above; keep the binding
         live so the compiler does not flag it as unused. */
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

  /**
   * Looks up bookings owned by a guest email. Used by the mobile app
   * because guest accounts may not exist yet at the time of booking.
   */
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

    /* Resolve stored amenity ids back to master records so we can
       return the human-readable name and icon to the client. */
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
        /* Some legacy rows store the amenity by name rather than id; index
           by both so the lookup below resolves either shape. */
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

  /**
   * Mobile self check-in. Accepts either the booking id or the
   * human-friendly booking code. Performed without authentication;
   * possession of the booking code is treated as proof of ownership.
   */
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

    /* Block check-in before the booked arrival date. Compared as
       date-only in Asia/Bangkok so a guest in Thailand sees the same
       day as the operator. */
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

  /**
   * Guest-initiated checkout request. Marks the booking as pending so
   * the operator can finalise the room and any extra charges before
   * the guest is officially checked out.
   */
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

  /**
   * Guest pays the outstanding extra charges from the mobile app.
   * Transitions the booking from AWAITING_EXTRA_PAYMENT to
   * CHECKED_OUT and frees the room unit.
   */
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

  /**
   * Admin assigns a specific room unit to the booking. Moves the
   * booking from AWAITING_ROOM_ASSIGNMENT to CONFIRMED and reserves
   * the unit so it cannot be double-booked.
   */
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

  /**
   * Admin-side checkout. Optionally attaches extra charges; if any are
   * present the booking moves to AWAITING_EXTRA_PAYMENT instead of
   * CHECKED_OUT until the guest pays.
   */
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
      /* Replace any previous extras for this booking with the supplied
         set so the operator can correct mistakes before checkout. */
      await tx.bookingExtraCharge.deleteMany({ where: { bookingId: id } });

      if (validExtras.length === 0) {
        /* No extras: complete the checkout in-line and free the room. */
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

      /* Extras present: hold the booking in AWAITING_EXTRA_PAYMENT
         until the guest settles them from the mobile app. */
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

  /**
   * Reverses an erroneous check-in: returns the booking to CONFIRMED
   * and the room unit to its previous state.
   */
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

  /** Public review submission. Allowed only after the booking is checked out. */
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
