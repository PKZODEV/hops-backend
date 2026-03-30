import { IsString, IsOptional, IsArray, IsEnum, IsInt, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum VehicleType {
  CAR = 'CAR',
  VAN = 'VAN',
  MINIBUS = 'MINIBUS',
  BUS = 'BUS',
  LOCAL = 'LOCAL',
  MOTORCYCLE = 'MOTORCYCLE',
  TUKTUK = 'TUKTUK',
  BOAT = 'BOAT',
  OTHER = 'OTHER',
}

export enum VehicleStatus {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  MAINTENANCE = 'MAINTENANCE',
  DISABLED = 'DISABLED',
}

export enum VehicleOwnerType {
  HOTEL = 'HOTEL',
  QUEUE_OWNER = 'QUEUE_OWNER',
  INDEPENDENT = 'INDEPENDENT',
}

export class CreateVehicleDto {
  @IsString()
  name: string;

  @IsEnum(VehicleType)
  type: VehicleType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  licensePlate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  capacity?: number;

  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @Type(() => Number)
  pricePerTrip?: number;

  @IsOptional()
  @Type(() => Number)
  pricePerHour?: number;

  @IsOptional()
  @Type(() => Number)
  pricePerDay?: number;

  @IsOptional()
  @IsString()
  route?: string;

  @IsOptional()
  @IsString()
  driverName?: string;

  @IsOptional()
  @IsString()
  driverPhone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(VehicleOwnerType)
  ownerType?: VehicleOwnerType;

  @IsOptional()
  @IsString()
  propertyId?: string;

  @IsOptional()
  @IsString()
  vehicleOwnerId?: string;
}
