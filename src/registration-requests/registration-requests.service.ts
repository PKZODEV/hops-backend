import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { RegistrationRequestStatus, UserRole } from '@prisma/client';

const generatePassword = (length = 10) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
};

@Injectable()
export class RegistrationRequestsService {
  constructor(
    private prisma: PrismaService,
    private users: UsersService,
    private mail: MailService,
  ) {}

  findAll(status?: RegistrationRequestStatus) {
    return this.prisma.registrationRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const req = await this.prisma.registrationRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('ไม่พบคำขอลงทะเบียน');
    return req;
  }

  async approve(id: string, reviewerId: string) {
    const req = await this.findOne(id);
    if (req.status !== 'PENDING') {
      throw new BadRequestException('คำขอนี้ถูกพิจารณาไปแล้ว');
    }

    // Make sure email+role is still free
    const role: UserRole = req.role === 'HOTEL_OWNER' ? 'HOTEL_OWNER' : 'QUEUE_OWNER';
    const existing = await this.prisma.user.findUnique({
      where: { email_role: { email: req.email, role } },
    });
    if (existing) {
      throw new BadRequestException('อีเมลนี้ถูกใช้งานแล้วในระบบ');
    }

    const password = generatePassword(10);

    const user = await this.users.create({
      email: req.email,
      password,
      name: req.name,
      phone: req.phone,
      role,
      mustChangePassword: true,
    });

    // For HOTEL_OWNER, pre-create their hotel property
    if (req.role === 'HOTEL_OWNER') {
      await this.prisma.property.create({
        data: {
          userId: user.id,
          name: req.businessName,
          type: 'HOTEL',
          address: req.address,
          latitude: req.latitude,
          longitude: req.longitude,
          amenities: [],
          images: [],
        },
      });
    }

    await this.prisma.registrationRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedById: reviewerId,
        createdUserId: user.id,
      },
    });

    await this.mail.sendApprovalEmail({
      to: req.email,
      name: req.name,
      businessName: req.businessName,
      username: req.email,
      password,
    });

    return { ok: true, userId: user.id };
  }

  async reject(id: string, reviewerId: string, reason?: string) {
    const req = await this.findOne(id);
    if (req.status !== 'PENDING') {
      throw new BadRequestException('คำขอนี้ถูกพิจารณาไปแล้ว');
    }
    await this.prisma.registrationRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        reviewedById: reviewerId,
        rejectReason: reason,
      },
    });

    await this.mail.sendRejectionEmail({
      to: req.email,
      name: req.name,
      reason,
    });

    return { ok: true };
  }
}
