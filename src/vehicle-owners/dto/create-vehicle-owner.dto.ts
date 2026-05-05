import { IsString, IsOptional } from 'class-validator';

export class CreateVehicleOwnerDto {
  /** Display name of the vehicle queue / owner. */
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
