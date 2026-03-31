import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PropertyCategoriesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.propertyCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}
