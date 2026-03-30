-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('CAR', 'VAN', 'MINIBUS', 'BUS', 'LOCAL', 'MOTORCYCLE', 'TUKTUK', 'BOAT', 'OTHER');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'BUSY', 'MAINTENANCE', 'DISABLED');

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "VehicleType" NOT NULL,
    "description" TEXT,
    "licensePlate" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "images" TEXT[],
    "features" TEXT[],
    "pricePerTrip" DECIMAL(10,2),
    "pricePerHour" DECIMAL(10,2),
    "pricePerDay" DECIMAL(10,2),
    "route" TEXT,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "propertyId" TEXT NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vehicle_propertyId_idx" ON "Vehicle"("propertyId");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
