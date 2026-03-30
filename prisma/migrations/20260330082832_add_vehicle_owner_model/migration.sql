-- CreateEnum
CREATE TYPE "VehicleOwnerType" AS ENUM ('HOTEL', 'QUEUE_OWNER', 'INDEPENDENT');

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "ownerType" "VehicleOwnerType" NOT NULL DEFAULT 'HOTEL',
ADD COLUMN     "vehicleOwnerId" TEXT,
ALTER COLUMN "propertyId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "VehicleOwner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleOwner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vehicle_vehicleOwnerId_idx" ON "Vehicle"("vehicleOwnerId");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_vehicleOwnerId_fkey" FOREIGN KEY ("vehicleOwnerId") REFERENCES "VehicleOwner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
