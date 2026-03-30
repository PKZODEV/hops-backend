import { IsString, IsOptional } from 'class-validator';

export class CreateVehicleOwnerDto {
  @IsString()
  name: string; // "เจ๊อี๊ดคิวรถแดง", "คิวรถตู้ภูเก็ต"

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
