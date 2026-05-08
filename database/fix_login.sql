-- ============================================================
-- MRD Login Fix Migration
-- Run this in phpMyAdmin if your database was already created
-- from mrd.sql BEFORE this fix was applied.
--
-- Problems fixed:
--   1. ENUM did not include 'admin' role → login always failed
--   2. Default admin password hash was wrong (was for 'password',
--      now corrected to 'Admin@2026')
-- ============================================================

USE mrd_db;

-- Step 1: Rebuild the role ENUM with only the correct values
ALTER TABLE users
    MODIFY COLUMN role
    ENUM('admin','mrd_admin','verifier','releasing_officer','viewer')
    DEFAULT 'mrd_admin';

-- Step 2: Fix the default admin account
--   - Set role to 'admin'
--   - Set password to Admin@2026 (bcrypt hash)
--   - Ensure account is active
UPDATE users
SET
    role       = 'admin',
    password   = '$2y$10$SQ2o3OplcCtlPb5k2yhr8uGXqTOXZiU5C2PhY0M6YOMciVT.s9o0e',
    is_active  = 1
WHERE email = 'admin@mrd.gov.ph';

-- Verify the fix
SELECT id, name, email, role, is_active, LEFT(password, 7) AS hash_prefix
FROM users
WHERE email = 'admin@mrd.gov.ph';

-- Expected result:
-- role      = admin
-- is_active = 1
-- hash_prefix = $2y$10$
