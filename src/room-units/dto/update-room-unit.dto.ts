import { PartialType } from '@nestjs/mapped-types';
import { CreateRoomUnitDto } from './create-room-unit.dto';

export class UpdateRoomUnitDto extends PartialType(CreateRoomUnitDto) {}
