import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  IsArray,
  IsPositive,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRoomDto {
  @IsString()
  name: string; // "Standard", "Deluxe", "Suite"

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  bedType?: string; // "King", "Queen", "Twin"

  @IsInt()
  @IsPositive()
  @Min(1)
  @Type(() => Number)
  maxGuests: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[]; // in-room amenities

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsString()
  propertyId: string;
}
