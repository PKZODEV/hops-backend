import { IsOptional, IsString } from 'class-validator';

export class CheckInBookingDto {
  /** Optional. Assigns this room unit at check-in if one was not already assigned. */
  @IsOptional()
  @IsString()
  roomUnitId?: string;
}
