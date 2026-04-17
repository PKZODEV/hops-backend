import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AmenityType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAmenityDto } from './dto/create-amenity.dto';
import { UpdateAmenityDto } from './dto/update-amenity.dto';

@Injectable()
export class AmenitiesService {
  constructor(private prisma: PrismaService) {}

  findAll(type?: AmenityType, includeInactive = false) {
    return this.prisma.amenity.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const amenity = await this.prisma.amenity.findUnique({ where: { id } });
    if (!amenity) throw new NotFoundException(`Amenity #${id} not found`);
    return amenity;
  }

  async create(dto: CreateAmenityDto) {
    try {
      return await this.prisma.amenity.create({ data: dto });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('มีสิ่งอำนวยความสะดวกชื่อนี้ในประเภทนี้อยู่แล้ว');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateAmenityDto) {
    await this.findOne(id);
    try {
      return await this.prisma.amenity.update({ where: { id }, data: dto });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('มีสิ่งอำนวยความสะดวกชื่อนี้ในประเภทนี้อยู่แล้ว');
      }
      throw e;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.amenity.delete({ where: { id } });
  }
}
