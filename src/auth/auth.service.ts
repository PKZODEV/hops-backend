import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { LoginDto } from './dto/login.dto';
import { RegisterRequestDto } from './dto/register-request.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { GuestRegisterDto } from './dto/guest-register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private prisma: PrismaService,
    private jwt: JwtService,
    private mail: MailService,
  ) {}

  async login(dto: LoginDto) {
    // Admin login — find non-GUEST users only
    const user = await this.users.findByEmailExcludingRole(dto.email, 'GUEST');
    if (!user || !user.isActive) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }
    const valid = await this.users.validatePassword(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }
    const token = this.jwt.sign({ sub: user.id, email: user.email });
    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        vehicleOwnerId: user.vehicleOwnerId,
      },
    };
  }

  async guestLogin(dto: LoginDto) {
    const user = await this.users.findByEmailAndRole(dto.email, 'GUEST');
    if (!user || !user.isActive) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }
    const valid = await this.users.validatePassword(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }
    const token = this.jwt.sign({ sub: user.id, email: user.email });
    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
      },
    };
  }

  async getMe(userId: string) {
    return this.users.findById(userId);
  }

  /**
   * สร้างคำขอลงทะเบียน — ยังไม่เป็น user จนกว่า super admin จะอนุมัติ
   */
  async createRegistrationRequest(dto: RegisterRequestDto) {
    // ตรวจว่าอีเมล+role ซ้ำใน users หรือ pending requests มั้ย
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email, role: dto.role },
    });
    if (existingUser) {
      throw new ConflictException('อีเมลนี้ถูกใช้งานแล้ว');
    }
    const pending = await this.prisma.registrationRequest.findFirst({
      where: { email: dto.email, status: 'PENDING' },
    });
    if (pending) {
      throw new ConflictException('คำขอลงทะเบียนของอีเมลนี้กำลังรอการอนุมัติอยู่');
    }

    return this.prisma.registrationRequest.create({
      data: {
        role: dto.role,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        businessName: dto.businessName,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        documents: dto.documents,
        status: 'PENDING',
      },
      select: { id: true, email: true, status: true, createdAt: true },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('รหัสผ่านปัจจุบันไม่ถูกต้อง');
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('รหัสผ่านใหม่ต้องไม่เหมือนรหัสผ่านเดิม');
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });
    return { ok: true };
  }

  // ==================== GUEST AUTH (Mobile) ====================

  private generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateRefCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  async guestRegister(dto: GuestRegisterDto) {
    // Check duplicate email for GUEST role only
    const existing = await this.users.findByEmailAndRole(dto.email, 'GUEST');
    if (existing) {
      throw new ConflictException('อีเมลนี้ถูกใช้งานแล้ว');
    }

    // Create inactive guest user
    const user = await this.users.create({
      email: dto.email,
      password: dto.password,
      phone: dto.phone,
      name: dto.name,
      role: 'GUEST',
    });

    // Mark user inactive until OTP verified
    await this.prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });

    // Generate OTP
    const code = this.generateOtpCode();
    const refCode = this.generateRefCode();
    const otp = await this.prisma.otp.create({
      data: {
        email: dto.email,
        code,
        refCode,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    // Send OTP email
    await this.mail.sendOtpEmail({ to: dto.email, code, refCode });

    return { email: dto.email, refCode: otp.refCode };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const otp = await this.prisma.otp.findFirst({
      where: {
        email: dto.email,
        refCode: dto.refCode,
        used: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new BadRequestException('รหัส OTP ไม่ถูกต้องหรือหมดอายุ');
    }
    if (otp.expiresAt < new Date()) {
      throw new BadRequestException('รหัส OTP หมดอายุแล้ว กรุณาขอรหัสใหม่');
    }
    if (otp.code !== dto.otp) {
      throw new BadRequestException('รหัส OTP ไม่ถูกต้อง');
    }

    // Mark OTP as used
    await this.prisma.otp.update({
      where: { id: otp.id },
      data: { used: true },
    });

    // Activate user
    const user = await this.prisma.user.update({
      where: { email_role: { email: dto.email, role: 'GUEST' } },
      data: { isActive: true },
      select: { id: true, email: true, name: true, role: true, phone: true },
    });

    // Issue JWT
    const token = this.jwt.sign({ sub: user.id, email: user.email });

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
      },
    };
  }

  async resendOtp(dto: ResendOtpDto) {
    // Check GUEST user exists and is inactive (pending OTP)
    const user = await this.users.findByEmailAndRole(dto.email, 'GUEST');
    if (!user) {
      throw new BadRequestException('ไม่พบบัญชีผู้ใช้นี้');
    }
    if (user.isActive) {
      throw new BadRequestException('บัญชีนี้ยืนยันตัวตนแล้ว');
    }

    // Invalidate old OTPs
    await this.prisma.otp.updateMany({
      where: { email: dto.email, used: false },
      data: { used: true },
    });

    // Generate new OTP
    const code = this.generateOtpCode();
    const refCode = this.generateRefCode();
    const otp = await this.prisma.otp.create({
      data: {
        email: dto.email,
        code,
        refCode,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await this.mail.sendOtpEmail({ to: dto.email, code, refCode });

    return { email: dto.email, refCode: otp.refCode };
  }
}
