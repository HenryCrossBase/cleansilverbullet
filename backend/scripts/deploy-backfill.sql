-- Run this once during the deploy of the security-hardening PR,
-- after `npx prisma migrate deploy` and before bouncing the backend.
--
-- Existing admins were operating with a NULL adminRoles which the OLD code
-- silently treated as "all permissions." The new code returns no permissions
-- for NULL adminRoles, so without this backfill every current admin would
-- lose access on restart.
--
-- This statement promotes every currently-admin user with an unset role to
-- explicit Owner ("0"). Review the list below before running and bump down
-- to "1" / "2" / "3" for anyone who should NOT be a full Owner going forward.

-- Optional preview (run first, doesn't change anything):
--
--   SELECT username, email, rank, "adminRoles" FROM "User"
--   WHERE rank = 'ADMIN' AND "adminRoles" IS NULL;
--
-- If the list matches the people you trust as full Owners, then run:

UPDATE "User"
SET "adminRoles" = '0'
WHERE rank = 'ADMIN' AND "adminRoles" IS NULL;

-- If you want a specific admin to be Co-Owner instead of Owner, follow up:
--
--   UPDATE "User" SET "adminRoles" = '1' WHERE username = 'someadmin';
--
-- Role values:
--   0 = Owner       (everything, can grant Owner)
--   1 = Co-Owner    (everything except grant Owner)
--   2 = Moderator   (view + moderate: ban, tickets, ads, disputes)
--   3 = Support     (view-only + ticket replies)
