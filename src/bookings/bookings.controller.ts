import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QueryBookingDto } from './dto/query-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { RefundBookingDto } from './dto/refund-booking.dto';
import { CheckInBookingDto } from './dto/check-in-booking.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // ---------- Public endpoints (mobile app, no auth) ----------

  // POST /api/v1/bookings/public — สร้าง booking จาก mobile หลังกดชำระเงิน
  @Post('public')
  createPublic(@Body() dto: CreateBookingDto) {
    return this.bookingsService.createPublic(dto);
  }

  // GET /api/v1/bookings/public/by-email?email=xxx&group=arriving
  @Get('public/by-email')
  findByGuestEmail(
    @Query('email') email: string,
    @Query('group') group?: string,
  ) {
    return this.bookingsService.findByGuestEmail(email, group);
  }

  // GET /api/v1/bookings/public/:idOrCode — ดูรายละเอียด (สำหรับ mobile)
  @Get('public/:idOrCode')
  findOnePublic(@Param('idOrCode') idOrCode: string) {
    return this.bookingsService.findOnePublic(idOrCode);
  }

  // PATCH /api/v1/bookings/public/:idOrCode/check-in — self check-in จาก mobile
  @Patch('public/:idOrCode/check-in')
  selfCheckIn(@Param('idOrCode') idOrCode: string) {
    return this.bookingsService.selfCheckIn(idOrCode);
  }

  // PATCH /api/v1/bookings/public/:idOrCode/request-checkout — guest ส่งคำขอเช็คเอาท์
  @Patch('public/:idOrCode/request-checkout')
  requestCheckout(@Param('idOrCode') idOrCode: string) {
    return this.bookingsService.requestCheckout(idOrCode);
  }

  // PATCH /api/v1/bookings/public/:idOrCode/pay-extras — guest ชำระค่าใช้จ่ายเพิ่มเติม
  @Patch('public/:idOrCode/pay-extras')
  payExtraCharges(@Param('idOrCode') idOrCode: string) {
    return this.bookingsService.payExtraCharges(idOrCode);
  }

  // POST /api/v1/bookings/public/:idOrCode/review — submit review หลังเช็คเอาท์
  @Post('public/:idOrCode/review')
  submitReview(
    @Param('idOrCode') idOrCode: string,
    @Body() dto: { rating: number; comment?: string },
  ) {
    return this.bookingsService.submitReview(idOrCode, dto);
  }

  // ---------- Admin endpoints (auth required) ----------

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query() query: QueryBookingDto, @Request() req: any) {
    return this.bookingsService.findAll(query, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  stats(@Request() req: any) {
    return this.bookingsService.stats(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.bookingsService.findOne(id, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/check-in')
  checkIn(
    @Param('id') id: string,
    @Body() dto: CheckInBookingDto,
    @Request() req: any,
  ) {
    return this.bookingsService.checkIn(id, dto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/check-out')
  checkOut(@Param('id') id: string, @Request() req: any) {
    return this.bookingsService.checkOut(id, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
    @Request() req: any,
  ) {
    return this.bookingsService.cancel(id, dto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/refund')
  refund(
    @Param('id') id: string,
    @Body() dto: RefundBookingDto,
    @Request() req: any,
  ) {
    return this.bookingsService.refund(id, dto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/no-show')
  markNoShow(@Param('id') id: string, @Request() req: any) {
    return this.bookingsService.markNoShow(id, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/revert-check-in')
  revertCheckIn(@Param('id') id: string, @Request() req: any) {
    return this.bookingsService.revertCheckIn(id, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/available-units')
  availableUnits(@Param('id') id: string, @Request() req: any) {
    return this.bookingsService.availableUnits(id, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/assign-room')
  assignRoom(
    @Param('id') id: string,
    @Body() dto: { roomUnitId: string },
    @Request() req: any,
  ) {
    return this.bookingsService.assignRoom(id, dto.roomUnitId, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/approve-checkout')
  approveCheckout(
    @Param('id') id: string,
    @Body() dto: { extras?: { name: string; amount: number }[] },
    @Request() req: any,
  ) {
    return this.bookingsService.approveCheckout(id, dto.extras, req.user);
  }
}
