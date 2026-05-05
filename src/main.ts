import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { assertEnv } from './common/config/env.validation';

async function bootstrap() {
  /* Validate required environment variables before Nest spins up so that
     misconfiguration surfaces as a single readable error rather than a
     stack trace from somewhere deep inside a provider. */
  assertEnv(process.env);

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api/v1');

  /* Helmet sets a conservative set of HTTP security headers (HSTS,
     X-Content-Type-Options, X-Frame-Options, etc.). The default CSP is
     disabled because this service serves user-uploaded images; the
     fronting reverse proxy is responsible for the policy on HTML pages. */
  app.use(helmet({ contentSecurityPolicy: false }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.use(cookieParser());

  /* CORS is browser-only; mobile apps and server-to-server callers are
     unaffected. The `ALLOWED_ORIGINS` env var is a comma-separated list. */
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  });

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  logger.log(
    `HOPS Backend listening on http://localhost:${port} (env=${process.env.NODE_ENV ?? 'development'})`,
  );
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error', err);
  process.exit(1);
});
