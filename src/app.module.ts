import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { PropertiesModule } from './properties/properties.module';
import { PropertyCategoriesModule } from './property-categories/property-categories.module';
import { BuildingsModule } from './buildings/buildings.module';
import { FloorsModule } from './floors/floors.module';
import { RoomsModule } from './rooms/rooms.module';
import { RoomUnitsModule } from './room-units/room-units.module';
import { RatesModule } from './rates/rates.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { UploadModule } from './upload/upload.module';
import { TransportModule } from './transport/transport.module';
import { VehicleOwnersModule } from './vehicle-owners/vehicle-owners.module';
import { MailModule } from './mail/mail.module';
import { RegistrationRequestsModule } from './registration-requests/registration-requests.module';
import { AmenitiesModule } from './amenities/amenities.module';
import { BookingsModule } from './bookings/bookings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      serveRoot: '/',
      exclude: ['/api/(.*)'],
    }),
    PrismaModule,
    MailModule,
    AuthModule,
    UsersModule,
    PropertiesModule,
    PropertyCategoriesModule,
    BuildingsModule,
    FloorsModule,
    RoomsModule,
    RoomUnitsModule,
    RatesModule,
    UploadModule,
    TransportModule,
    VehicleOwnersModule,
    RegistrationRequestsModule,
    AmenitiesModule,
    BookingsModule,
  ],
})
export class AppModule {}
