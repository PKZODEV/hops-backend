import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Request,
  Response,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response as Res } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterRequestDto } from './dto/register-request.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { GuestRegisterDto } from './dto/guest-register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SEVEN_DAYS_MS,
  secure: process.env.NODE_ENV === 'production',
};

/**
 * Authentication endpoints.
 *
 * The auth surface splits across two audiences:
 *   - Admin / operator users sign in through `/login` and receive an
 *     HTTP-only `hops_token` cookie scoped to the API origin.
 *   - Mobile guests sign in through `/guest/*` and receive the same JWT
 *     either as a cookie (after OTP verification) or as a JSON payload
 *     for storage in secure mobile storage.
 *
 * Sensitive routes (login, OTP, forgot/reset password, public
 * registration) carry tighter rate limits than the global default to
 * blunt credential-stuffing and OTP enumeration attacks.
 */
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  /** Public — creates a registration request that an admin must approve. */
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('register-request')
  registerRequest(@Body() dto: RegisterRequestDto) {
    return this.auth.createRegistrationRequest(dto);
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Response({ passthrough: true }) res: Res,
  ) {
    const result = await this.auth.login(dto);
    res.cookie('hops_token', result.access_token, COOKIE_OPTIONS);
    return { access_token: result.access_token, user: result.user };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Response({ passthrough: true }) res: Res) {
    res.clearCookie('hops_token', { path: '/' });
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() req: { user: { id: string } }) {
    return this.auth.getMe(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(
    @Request() req: { user: { id: string } },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(req.user.id, dto);
  }

  /* ──────────────── Forgot / reset password ──────────────── */

  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post('forgot-password')
  @HttpCode(200)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('reset-password')
  @HttpCode(200)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  /* ──────────────── Guest auth (mobile) ──────────────── */

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('guest/login')
  async guestLoginEndpoint(@Body() dto: LoginDto) {
    const result = await this.auth.guestLogin(dto);
    return { access_token: result.access_token, user: result.user };
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('guest/register')
  guestRegister(@Body() dto: GuestRegisterDto) {
    return this.auth.guestRegister(dto);
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('guest/verify-otp')
  async guestVerifyOtp(
    @Body() dto: VerifyOtpDto,
    @Response({ passthrough: true }) res: Res,
  ) {
    const result = await this.auth.verifyOtp(dto);
    res.cookie('hops_token', result.access_token, COOKIE_OPTIONS);
    return result;
  }

  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post('guest/resend-otp')
  guestResendOtp(@Body() dto: ResendOtpDto) {
    return this.auth.resendOtp(dto);
  }
}
