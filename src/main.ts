import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.use(cookieParser());

  // Web admin origins (CORS is browser-only; mobile apps bypass it entirely)
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000').split(',').map(o => o.trim());
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`HOPS Backend running on http://localhost:${port}`);
}
bootstrap();
