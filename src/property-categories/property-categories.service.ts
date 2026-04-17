import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyCategoryDto } from './dto/create-property-category.dto';
import { UpdatePropertyCategoryDto } from './dto/update-property-category.dto';

@Injectable()
export class PropertyCategoriesService {
  constructor(private prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return this.prisma.propertyCategory.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.propertyCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException(`PropertyCategory #${id} not found`);
    return category;
  }

  async create(dto: CreatePropertyCategoryDto) {
    try {
      return await this.prisma.propertyCategory.create({ data: dto });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('มีประเภทที่พักชื่อนี้อยู่แล้ว');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdatePropertyCategoryDto) {
    await this.findOne(id);
    try {
      return await this.prisma.propertyCategory.update({ where: { id }, data: dto });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('มีประเภทที่พักชื่อนี้อยู่แล้ว');
      }
      throw e;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    const inUse = await this.prisma.property.count({ where: { propertyCategoryId: id } });
    if (inUse > 0) {
      throw new BadRequestException(`ไม่สามารถลบได้ เพราะมีที่พัก ${inUse} รายการใช้ประเภทนี้อยู่`);
    }
    return this.prisma.propertyCategory.delete({ where: { id } });
  }
}
