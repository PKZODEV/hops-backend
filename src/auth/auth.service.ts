import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('อีเมลนี้ถูกใช้งานแล้ว');
    }
    const user = await this.users.create(dto.email, dto.password, dto.name);
    const token = this.jwt.sign({ sub: user.id, email: user.email });
    return { access_token: token, user };
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email);
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
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  async getMe(userId: string) {
    return this.users.findById(userId);
  }
}
