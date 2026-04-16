-- Step 1: Extend the UserRole enum.
-- Note: Postgres requires ALTER TYPE ADD VALUE to be committed before the
-- new value can be referenced (e.g. as a column DEFAULT). This migration
-- only adds the values; the rest of the schema changes live in the next
-- migration so the enum extension is committed first.

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'HOTEL_OWNER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'QUEUE_OWNER';
