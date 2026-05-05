-- Add new BookingStatus enum values (must be in own migration / committed before use)
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'AWAITING_ROOM_ASSIGNMENT';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'CHECKOUT_PENDING';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'AWAITING_EXTRA_PAYMENT';
