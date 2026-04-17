import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { AmenityType } from '@prisma/client';

export class CreateAmenityDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  icon?: string;

  @IsEnum(AmenityType)
  type!: AmenityType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
