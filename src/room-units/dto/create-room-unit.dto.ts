import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';

export enum RoomStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  OCCUPIED = 'OCCUPIED',
  CLEANING = 'CLEANING',
  MAINTENANCE = 'MAINTENANCE',
  DISABLED = 'DISABLED',
}

export class CreateRoomUnitDto {
  /** Operator-facing room number, free-form string (e.g. "101", "201A"). */
  @IsString()
  number: string;

  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsString()
  floorId: string;

  @IsString()
  roomTypeId: string;
}
