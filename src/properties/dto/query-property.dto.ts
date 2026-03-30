import { IsOptional, IsEnum, IsBoolean, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { PropertyType } from './create-property.dto';

export class QueryPropertyDto {
  @IsOptional()
  @IsEnum(PropertyType)
  type?: PropertyType;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  city?: string;

  // full-text search across name, city, address
  @IsOptional()
  @IsString()
  search?: string;
}
