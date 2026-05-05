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
  /** Display name of the room type, e.g. "Standard", "Deluxe", "Suite". */
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** Bed configuration label, e.g. "King", "Queen", "Twin". */
  @IsOptional()
  @IsString()
  bedType?: string;

  @IsInt()
  @IsPositive()
  @Min(1)
  @Type(() => Number)
  maxGuests: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  /** In-room amenities (referenced by amenity-master id or name). */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsString()
  propertyId: string;
}
