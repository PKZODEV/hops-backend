-- Add GUEST role to UserRole enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'GUEST';
