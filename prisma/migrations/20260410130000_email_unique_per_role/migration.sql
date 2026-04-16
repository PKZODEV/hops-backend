-- Change email unique constraint from email-only to email+role
-- This allows the same email to register with different roles
-- (e.g. admin@hotel.com as ADMIN and as GUEST on mobile)

-- Drop the old unique index on email
DROP INDEX IF EXISTS "User_email_key";

-- Create composite unique index on (email, role)
CREATE UNIQUE INDEX "User_email_role_key" ON "User"("email", "role");
