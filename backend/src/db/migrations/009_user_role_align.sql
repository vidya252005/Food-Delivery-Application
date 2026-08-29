-- Migration 003 defaulted users.role to LLD 'customer'; migration 005 intended
-- 'user' but ADD COLUMN IF NOT EXISTS was a no-op. Align DB with JWT/app code.

UPDATE users SET role = 'user' WHERE role = 'customer';

ALTER TABLE users
  ALTER COLUMN role SET DEFAULT 'user';

-- Match width from 005 (003 used VARCHAR(30)).
ALTER TABLE users
  ALTER COLUMN role TYPE VARCHAR(32);
