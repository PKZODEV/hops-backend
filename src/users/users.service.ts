import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });
  }

  async create(email: string, password: string, name?: string) {
    const passwordHash = await bcrypt.hash(password, 12);
    return this.prisma.user.create({
      data: { email, passwordHash, name },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }

  async validatePassword(plain: string, hash: string) {
    return bcrypt.compare(plain, hash);
  }
}
