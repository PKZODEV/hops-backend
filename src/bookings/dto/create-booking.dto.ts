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
  /** Identifier of the room type being booked. */
  @IsString()
  roomTypeId: string;

  /** Optional preferred room unit. If omitted the admin assigns one at check-in. */
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
