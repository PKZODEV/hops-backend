import { Body, Controller, Get, HttpCode, Post, Request, Response, UseGuards } from '@nestjs/common';
import { Response as Res } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
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

  @Post('register')
  async register(@Body() dto: RegisterDto, @Response({ passthrough: true }) res: Res) {
    const result = await this.auth.register(dto);
    res.cookie('hops_token', result.access_token, COOKIE_OPTIONS);
    return { user: result.user };
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Response({ passthrough: true }) res: Res) {
    const result = await this.auth.login(dto);
    res.cookie('hops_token', result.access_token, COOKIE_OPTIONS);
    return { user: result.user };
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
}
