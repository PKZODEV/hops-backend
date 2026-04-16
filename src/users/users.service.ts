import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findFirst({ where: { email } });
  }

  async findByEmailAndRole(email: string, role: UserRole) {
    return this.prisma.user.findUnique({
      where: { email_role: { email, role } },
    });
  }

  async findByEmailExcludingRole(email: string, excludeRole: UserRole) {
    return this.prisma.user.findFirst({
      where: { email, role: { not: excludeRole } },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        vehicleOwnerId: true,
        createdAt: true,
      },
    });
  }

  async create(args: {
    email: string;
    password: string;
    name?: string;
    phone?: string;
    role?: UserRole;
    mustChangePassword?: boolean;
    vehicleOwnerId?: string;
  }) {
    const passwordHash = await bcrypt.hash(args.password, 12);
    return this.prisma.user.create({
      data: {
        email: args.email,
        passwordHash,
        name: args.name,
        phone: args.phone,
        role: args.role ?? 'HOTEL_OWNER',
        mustChangePassword: args.mustChangePassword ?? false,
        vehicleOwnerId: args.vehicleOwnerId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async validatePassword(plain: string, hash: string) {
    return bcrypt.compare(plain, hash);
  }
}
