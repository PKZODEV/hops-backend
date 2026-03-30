import { Module } from '@nestjs/common';
import { VehicleOwnersService } from './vehicle-owners.service';
import { VehicleOwnersController } from './vehicle-owners.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VehicleOwnersController],
  providers: [VehicleOwnersService],
})
export class VehicleOwnersModule {}
