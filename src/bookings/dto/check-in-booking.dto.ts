import { IsOptional, IsString } from 'class-validator';

export class CheckInBookingDto {
  /// (optional) RoomUnit ที่จะ assign ตอน check-in (ถ้ายังไม่ได้ assign)
  @IsOptional()
  @IsString()
  roomUnitId?: string;
}
