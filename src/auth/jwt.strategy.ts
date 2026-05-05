import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

/**
 * JWT verification strategy.
 *
 * Tokens are accepted from two transports:
 *   1. The HTTP-only `hops_token` cookie used by the admin console.
 *   2. The `Authorization: Bearer <token>` header used by mobile clients.
 *
 * After signature verification we re-fetch the user record so that
 * de-activated accounts cannot continue to authenticate with a token
 * issued before they were disabled.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error(
        'JWT_SECRET must be set. Configure it via environment before booting the API.',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.['hops_token'] ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: false,
    });
  }

  async validate(payload: { sub: string; email: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        vehicleOwnerId: true,
      },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('บัญชีไม่ได้ใช้งาน');
    }
    return user;
  }
}
