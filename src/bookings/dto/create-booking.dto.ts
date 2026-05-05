import {
  IsString,
  IsOptional,
  IsEmail,
  IsInt,
  Min,
  IsDateString,
  IsNumber,
} from 'class-validator';

export class CreateBookingDto {
  /// ID ของ RoomType ที่จอง
  @IsString()
  roomTypeId: string;

  /// (optional) RoomUnit ที่ต้องการ — ถ้าไม่ส่ง ระบบจะ assign ตอน check-in
  @IsOptional()
  @IsString()
  roomUnitId?: string;

  @IsString()
  guestFirstName: string;

  @IsString()
  guestLastName: string;

  @IsEmail()
  guestEmail: string;

  @IsString()
  guestPhone: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  guestCount?: number;

  @IsOptional()
  @IsString()
  specialRequest?: string;

  @IsDateString()
  checkInDate: string;

  @IsDateString()
  checkOutDate: string;

  @IsNumber()
  pricePerNight: number;

  @IsOptional()
  @IsString()
  provider?: string;
}
