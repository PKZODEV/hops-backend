import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
    ConfigModule.forRoot({
      isGlobal: true,
      /* Env precedence (first match wins): per-developer override
         (.env.local) > environment-specific (.env.<NODE_ENV>) > .env */
      envFilePath: [
        '.env.local',
        `.env.${process.env.NODE_ENV ?? 'development'}`,
        '.env',
      ],
    }),
    /* Default rate limit applied to every controller route via the
       global guard below. Auth and OTP endpoints layer additional,
       tighter limits via the @Throttle() decorator. */
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
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
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
