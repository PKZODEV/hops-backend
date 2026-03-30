import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';

export enum RoomStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  MAINTENANCE = 'MAINTENANCE',
  DISABLED = 'DISABLED',
}

export class CreateRoomUnitDto {
  @IsString()
  number: string; // "101", "201A"

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
