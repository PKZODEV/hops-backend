-- Step 2: Registration request flow + extra User columns.

-- New enums (separate from the UserRole change so they're safe in one tx)
DO $$ BEGIN
  CREATE TYPE "RegistrationRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "RegistrationRole" AS ENUM ('HOTEL_OWNER', 'QUEUE_OWNER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend User table
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "phone" TEXT,
  ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "vehicleOwnerId" TEXT;

-- Default for new users (HOTEL_OWNER was committed by the previous migration)
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'HOTEL_OWNER';

-- Foreign key for vehicleOwnerId
DO $$ BEGIN
  ALTER TABLE "User"
    ADD CONSTRAINT "User_vehicleOwnerId_fkey"
    FOREIGN KEY ("vehicleOwnerId") REFERENCES "VehicleOwner"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "User_vehicleOwnerId_idx" ON "User"("vehicleOwnerId");

-- RegistrationRequest table
CREATE TABLE IF NOT EXISTS "RegistrationRequest" (
  "id"            TEXT NOT NULL,
  "role"          "RegistrationRole" NOT NULL,
  "name"          TEXT NOT NULL,
  "email"         TEXT NOT NULL,
  "phone"         TEXT NOT NULL,
  "businessName"  TEXT NOT NULL,
  "address"       TEXT,
  "latitude"      DOUBLE PRECISION,
  "longitude"     DOUBLE PRECISION,
  "documents"     JSONB NOT NULL,
  "status"        "RegistrationRequestStatus" NOT NULL DEFAULT 'PENDING',
  "rejectReason"  TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  "reviewedAt"    TIMESTAMP(3),
  "reviewedById"  TEXT,
  "createdUserId" TEXT,
  CONSTRAINT "RegistrationRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RegistrationRequest_status_idx" ON "RegistrationRequest"("status");
CREATE INDEX IF NOT EXISTS "RegistrationRequest_email_idx" ON "RegistrationRequest"("email");
