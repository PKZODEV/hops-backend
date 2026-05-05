-- AlterTable
ALTER TABLE "Booking"
  ADD COLUMN "checkoutRequestedAt" TIMESTAMP(3),
  ADD COLUMN "extraChargesTotal"   DECIMAL(10,2),
  ADD COLUMN "extraChargesPaidAt"  TIMESTAMP(3);

-- CreateTable
CREATE TABLE "BookingExtraCharge" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingExtraCharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingExtraCharge_bookingId_idx" ON "BookingExtraCharge"("bookingId");

-- AddForeignKey
ALTER TABLE "BookingExtraCharge" ADD CONSTRAINT "BookingExtraCharge_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
