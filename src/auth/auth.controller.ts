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
import { Response as Res } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterRequestDto } from './dto/register-request.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { GuestRegisterDto } from './dto/guest-register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  secure: process.env.NODE_ENV === 'production',
};

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  // Public — สร้างคำขอลงทะเบียน (รออนุมัติ)
  @Post('register-request')
  registerRequest(@Body() dto: RegisterRequestDto) {
    return this.auth.createRegistrationRequest(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Response({ passthrough: true }) res: Res) {
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

  // ==================== GUEST AUTH (Mobile) ====================

  @Post('guest/login')
  async guestLoginEndpoint(@Body() dto: LoginDto) {
    const result = await this.auth.guestLogin(dto);
    return { access_token: result.access_token, user: result.user };
  }

  @Post('guest/register')
  guestRegister(@Body() dto: GuestRegisterDto) {
    return this.auth.guestRegister(dto);
  }

  @Post('guest/verify-otp')
  async guestVerifyOtp(
    @Body() dto: VerifyOtpDto,
    @Response({ passthrough: true }) res: Res,
  ) {
    const result = await this.auth.verifyOtp(dto);
    res.cookie('hops_token', result.access_token, COOKIE_OPTIONS);
    return result;
  }

  @Post('guest/resend-otp')
  guestResendOtp(@Body() dto: ResendOtpDto) {
    return this.auth.resendOtp(dto);
  }
}
