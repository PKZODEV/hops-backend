import { IsString } from 'class-validator';

export class CreateFloorDto {
  @IsString()
  number: string; // "1", "2", "B1", "M"

  @IsString()
  buildingId: string;
}
