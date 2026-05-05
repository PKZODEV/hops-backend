import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRateDto {
  /** Display label for the rate, e.g. "Standard Rate", "Weekend Rate", "Early Bird". */
  @IsString()
  name: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  price: number;

  /** ISO-4217 currency code. Defaults to THB when omitted. */
  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsString()
  roomTypeId: string;
}
