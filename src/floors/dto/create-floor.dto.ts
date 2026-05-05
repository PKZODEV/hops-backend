import { IsString } from 'class-validator';

export class CreateFloorDto {
  /** Free-form floor identifier, e.g. "1", "2", "B1", "M". */
  @IsString()
  number: string;

  @IsString()
  buildingId: string;
}
