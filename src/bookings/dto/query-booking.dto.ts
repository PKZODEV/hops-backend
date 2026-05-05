import { IsOptional, IsString, IsEnum } from 'class-validator';
import { BookingStatus } from '@prisma/client';

export class QueryBookingDto {
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  /// 'arriving' | 'in_stay' | 'completed' | 'cancelled'  (mobile tabs)
  @IsOptional()
  @IsString()
  group?: string;

  @IsOptional()
  @IsString()
  propertyId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  guestEmail?: string;
}
