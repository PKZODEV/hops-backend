# HOPS Backend

REST API for **HOPS** — Hotel Operating System for Thailand. Serves the admin console, the mobile guest app and any future integration partners from a single Nest application.

## Tech stack

| Layer | Choice |
| --- | --- |
| Runtime | Node.js 20 LTS |
| Framework | NestJS 10, Express adapter |
| ORM | Prisma 5 (PostgreSQL) |
| Auth | JWT (`@nestjs/jwt`) + Passport, HTTP-only cookie or `Authorization: Bearer` |
| Validation | `class-validator` with global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) |
| Hardening | `helmet`, `@nestjs/throttler`, global exception filter |
| Mail | `nodemailer` (SMTP) |
| Container | Multi-stage Alpine image, runs as non-root `node` user |

## Project layout

```
prisma/
  schema.prisma         # Source of truth for the data model
  migrations/           # 22 versioned migrations, applied via `prisma migrate deploy`
src/
  main.ts               # Bootstrap: env validation, helmet, throttler, CORS
  app.module.ts         # Wires every feature module + global throttler guard
  common/
    config/
      env.validation.ts # Boot-time assertion of required env vars
    filters/
      all-exceptions.filter.ts
  auth/                 # Login, OTP, forgot/reset password, JWT strategy + role guard
  users/                # User CRUD + bcrypt
  properties/           # Hotels, pool villas, hostels, etc.
  rooms/                # Room types
  room-units/           # Individual rooms / inventory
  buildings/  floors/   # Property structure
  rates/                # Per-type pricing
  amenities/            # Master amenity list
  bookings/             # Public + admin booking flow
  transport/            # Vehicle inventory
  vehicle-owners/       # Queue / fleet owners
  registration-requests/# Public sign-up workflow (admin approval)
  upload/               # Image + document uploads (extension + MIME guarded)
  mail/                 # Transactional email (OTP, password reset)
```

## Environments

The repo ships three committed env templates. Production secrets must never be committed.

| File | Loaded by | Purpose |
| --- | --- | --- |
| `.env.example` | (manual) | Reference of every required variable |
| `.env.development` | `start:dev` / `start` when `NODE_ENV=development` | Localhost defaults |
| `.env.production.example` | (manual) | Production template — copy on the host to `.env.production` and fill in |
| `.env`, `.env.production`, `.env.local` | always | **Untracked** — populated on the host or by the secrets manager |

Env precedence (first match wins): `.env.local` → `.env.<NODE_ENV>` → `.env`. Wired through `ConfigModule.forRoot({ envFilePath })` in `src/app.module.ts`.

### Required variables

| Name | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string consumed by Prisma. |
| `JWT_SECRET` | yes | Signs JWT access tokens. **Must be at least 32 characters in production**, enforced at boot. |
| `PORT` | optional | HTTP port (default 3001). |
| `NODE_ENV` | optional | `development \| staging \| production`. Toggles cookie `Secure` and the JWT-secret strength check. |
| `ALLOWED_ORIGINS` | required in prod | Comma-separated CORS allow-list. |
| `APP_URL` | optional | Public origin of the admin web app, used to build links in password-reset emails. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | required for OTP & password reset | SMTP relay credentials. |

The application refuses to start when any of `DATABASE_URL` or `JWT_SECRET` is missing, when `JWT_SECRET` is shorter than 32 characters in production, or when `ALLOWED_ORIGINS` is unset in production. See `src/common/config/env.validation.ts`.

## Local development

```bash
npm install --legacy-peer-deps
cp .env.example .env.local            # then fill in secrets
npx prisma migrate dev                # apply pending migrations
npm run start:dev                     # http://localhost:3001
```

## Production build

```bash
npm run build
NODE_ENV=production node dist/main
```

## Database migrations on the company cloud

Migrations are versioned in `prisma/migrations/` (22 files at the time of writing). The recommended deployment flow:

```bash
# 1. Point the CLI at the cloud database
export DATABASE_URL="postgresql://USER:PASSWORD@CLOUD_HOST:5432/hops_db?schema=public&sslmode=require"

# 2. Apply pending migrations (production-safe, never resets the database)
npx prisma migrate deploy

# 3. Optional: confirm the schema matches the codebase
npx prisma migrate status
```

Inside the container the same step is executed automatically by the `CMD` line of the Dockerfile, so most production environments simply need to ship the new image and let the container run `migrate deploy` on start-up.

If the team prefers SQL artefacts for review, generate one with:

```bash
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma \
  --script > review.sql
```

## Lint, build, type-check

```bash
npm run lint
npm run build
```

## Security baseline

- HTTP security headers via `helmet` (HSTS, X-Frame, X-Content-Type-Options, …).
- Global rate limit (120 req/min/IP) + per-route tighter limits on auth, OTP, forgot/reset password, public registration.
- JWT secret enforcement and CORS allow-list enforced at boot.
- Bcrypt cost factor 12 for password hashing.
- Forgot-password endpoint returns `200 OK` regardless of whether the email exists, to avoid account enumeration.
- File uploads are validated by both extension and MIME type and renamed to a server-generated UUID; client-supplied filenames are stripped via `path.basename`.
- Container runs as non-root `node` user with an HTTP healthcheck.

See [SECURITY.md](./SECURITY.md) for the full OWASP Top 10 audit and pen-test plan.

## Docker

```bash
docker build -t hops-backend .
docker run --rm -p 3001:3001 \
  --env-file .env.production \
  -v hops_uploads:/app/public/uploads \
  hops-backend
```
