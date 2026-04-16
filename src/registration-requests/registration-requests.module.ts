import { Module } from '@nestjs/common';
import { RegistrationRequestsController } from './registration-requests.controller';
import { RegistrationRequestsService } from './registration-requests.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [RegistrationRequestsController],
  providers: [RegistrationRequestsService],
})
export class RegistrationRequestsModule {}
