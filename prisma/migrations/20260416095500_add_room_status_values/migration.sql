-- Add new RoomStatus enum values (must be committed before use)
ALTER TYPE "RoomStatus" ADD VALUE IF NOT EXISTS 'RESERVED';
ALTER TYPE "RoomStatus" ADD VALUE IF NOT EXISTS 'CLEANING';
