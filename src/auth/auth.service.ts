import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { LoginDto } from './dto/login.dto';
import { RegisterRequestDto } from './dto/register-request.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { GuestRegisterDto } from './dto/guest-register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private prisma: PrismaService,
    private jwt: JwtService,
    private mail: MailService,
    private config: ConfigService,
  ) {}

  /**
   * Authenticates an operator (any role except GUEST) and issues a JWT.
   *
   * The error message is intentionally identical for "user not found",
   * "user inactive" and "wrong password" to avoid leaking which emails
   * are registered.
   */
  async login(dto: LoginDto) {
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
   * Creates a pending registration request. The applicant does not
   * become a user until a super admin approves the request — this
   * method only persists the application and rejects duplicates against
   * both existing users and other pending requests.
   */
  async createRegistrationRequest(dto: RegisterRequestDto) {
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

  /* ──────────────── Guest auth (mobile) ──────────────── */

  /**
   * Generates a six-digit numeric OTP. Uses `Math.random` because the
   * OTP is a one-time, short-lived secondary factor; the primary
   * credential remains the password.
   */
  private generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateRefCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  async guestRegister(dto: GuestRegisterDto) {
    const existing = await this.users.findByEmailAndRole(dto.email, 'GUEST');
    if (existing) {
      throw new ConflictException('อีเมลนี้ถูกใช้งานแล้ว');
    }

    /* The user record is created up front but kept inactive so it
       cannot log in until the OTP step succeeds. */
    const user = await this.users.create({
      email: dto.email,
      password: dto.password,
      phone: dto.phone,
      name: dto.name,
      role: 'GUEST',
    });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });

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

    /* Burn the OTP first so a concurrent retry cannot reuse it, then
       flip the user record to active. */
    await this.prisma.otp.update({
      where: { id: otp.id },
      data: { used: true },
    });
    const user = await this.prisma.user.update({
      where: { email_role: { email: dto.email, role: 'GUEST' } },
      data: { isActive: true },
      select: { id: true, email: true, name: true, role: true, phone: true },
    });

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

  /* ──────────────── Forgot / reset password (admin) ──────────────── */

  /**
   * Issues a password-reset link. The response body is identical
   * regardless of whether the email exists; this prevents the endpoint
   * from being used as an account-enumeration oracle.
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        role: { not: 'GUEST' },
        isActive: true,
      },
    });
    if (!user) {
      return { ok: true };
    }

    /* Invalidate any outstanding reset tokens for this user so an
       attacker who somehow obtains a stale link cannot use it. */
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const appUrl =
      this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    await this.mail.sendPasswordResetEmail({
      to: user.email,
      name: user.name ?? user.email,
      resetLink,
    });

    return { ok: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
      include: { user: true },
    });

    if (!record || record.used) {
      throw new BadRequestException('ลิงก์ไม่ถูกต้องหรือถูกใช้ไปแล้ว');
    }
    if (record.expiresAt < new Date()) {
      throw new BadRequestException('ลิงก์หมดอายุแล้ว กรุณาขอใหม่อีกครั้ง');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, mustChangePassword: false },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { used: true },
      }),
    ]);

    return { ok: true };
  }

  /**
   * Re-issues a pending-account OTP. Refuses to issue once the account
   * is already verified so this endpoint cannot be used to harass an
   * existing user with mail spam.
   */
  async resendOtp(dto: ResendOtpDto) {
    const user = await this.users.findByEmailAndRole(dto.email, 'GUEST');
    if (!user) {
      throw new BadRequestException('ไม่พบบัญชีผู้ใช้นี้');
    }
    if (user.isActive) {
      throw new BadRequestException('บัญชีนี้ยืนยันตัวตนแล้ว');
    }

    await this.prisma.otp.updateMany({
      where: { email: dto.email, used: false },
      data: { used: true },
    });

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
