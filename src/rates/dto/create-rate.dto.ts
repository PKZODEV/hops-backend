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
  @IsString()
  name: string; // "Standard Rate", "Weekend Rate", "Early Bird"

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  price: number;

  @IsOptional()
  @IsString()
  currency?: string; // default: THB

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
