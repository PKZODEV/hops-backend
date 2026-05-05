import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRateDto } from './dto/create-rate.dto';
import { UpdateRateDto } from './dto/update-rate.dto';

@Injectable()
export class RatesService {
  constructor(private prisma: PrismaService) {}

  async findByRoom(roomTypeId: string) {
    await this.ensureRoomTypeExists(roomTypeId);
    return this.prisma.roomRate.findMany({
      where: { roomTypeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateRateDto) {
    const { roomTypeId, price, startDate, endDate, ...rest } = dto;
    await this.ensureRoomTypeExists(roomTypeId);
    return this.prisma.roomRate.create({
      data: {
        ...rest,
        price,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        roomType: { connect: { id: roomTypeId } },
      },
    });
  }

  async update(id: string, dto: UpdateRateDto) {
    await this.ensureRateExists(id);
    const { roomTypeId, price, startDate, endDate, ...rest } = dto;
    return this.prisma.roomRate.update({
      where: { id },
      data: {
        ...rest,
        ...(price !== undefined && { price }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(roomTypeId && { roomType: { connect: { id: roomTypeId } } }),
      },
    });
  }

  async remove(id: string) {
    await this.ensureRateExists(id);
    await this.prisma.roomRate.delete({ where: { id } });
    return { id };
  }

  private async ensureRoomTypeExists(id: string) {
    const roomType = await this.prisma.roomType.findUnique({ where: { id } });
    if (!roomType) throw new NotFoundException(`Room type #${id} not found`);
  }

  private async ensureRateExists(id: string) {
    const rate = await this.prisma.roomRate.findUnique({ where: { id } });
    if (!rate) throw new NotFoundException(`Rate #${id} not found`);
  }
}
