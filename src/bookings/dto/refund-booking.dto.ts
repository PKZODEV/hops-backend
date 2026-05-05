import { IsOptional, IsNumber, IsString } from 'class-validator';

export class RefundBookingDto {
  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
