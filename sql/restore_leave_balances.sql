-- ============================================================
-- Restore leave balances from Firebase → Supabase profiles
-- Users WITH Firebase data: exact values from Firebase
-- Users WITHOUT Firebase data: company default (10 vacation / 3 sick / 10 remote)
-- Run in Supabase SQL Editor
-- ============================================================

-- ── Users with known Firebase values ─────────────────────────────────────────
UPDATE profiles SET leave_balances = '{"vacation":{"total":15,"used":11,"remaining":4},"sick":{"total":3,"used":0,"remaining":3},"remote":{"total":0,"used":5,"remaining":0}}', updated_at = now() WHERE email ILIKE 'alberta@luxury-listings.com';
UPDATE profiles SET leave_balances = '{"vacation":{"total":10,"used":0,"remaining":10},"sick":{"total":3,"used":0,"remaining":3},"remote":{"total":10,"used":0,"remaining":10}}', updated_at = now() WHERE email ILIKE 'chloe@luxury-listings.com';
UPDATE profiles SET leave_balances = '{"vacation":{"total":15,"used":0,"remaining":15},"sick":{"total":3,"used":0,"remaining":3},"remote":{"total":10,"used":0,"remaining":10}}', updated_at = now() WHERE email ILIKE 'daniella@luxury-listings.com';
UPDATE profiles SET leave_balances = '{"vacation":{"total":10,"used":0,"remaining":10},"sick":{"total":3,"used":2,"remaining":1},"remote":{"total":10,"used":0,"remaining":10}}', updated_at = now() WHERE email ILIKE 'jasmine@luxury-listings.com';
UPDATE profiles SET leave_balances = '{"vacation":{"total":15,"used":10,"remaining":5},"sick":{"total":3,"used":0,"remaining":3},"remote":{"total":10,"used":0,"remaining":10}}', updated_at = now() WHERE email ILIKE 'jone@luxury-listings.com';
UPDATE profiles SET leave_balances = '{"vacation":{"total":10,"used":0,"remaining":10},"sick":{"total":3,"used":0,"remaining":3},"remote":{"total":10,"used":0,"remaining":10}}', updated_at = now() WHERE email ILIKE 'jrsschroeder@gmail.com';
UPDATE profiles SET leave_balances = '{"vacation":{"total":10,"used":0,"remaining":10},"sick":{"total":5,"used":0,"remaining":5},"remote":{"total":10,"used":0,"remaining":10}}', updated_at = now() WHERE email ILIKE 'kambiz@luxury-listings.com';
UPDATE profiles SET leave_balances = '{"vacation":{"total":10,"used":0,"remaining":10},"sick":{"total":3,"used":0,"remaining":3},"remote":{"total":10,"used":0,"remaining":10}}', updated_at = now() WHERE email ILIKE 'matthew@luxury-listings.com';
UPDATE profiles SET leave_balances = '{"vacation":{"total":12,"used":0,"remaining":12},"sick":{"total":3,"used":0,"remaining":3},"remote":{"total":10,"used":0,"remaining":10}}', updated_at = now() WHERE email ILIKE 'sidney@luxury-listings.com';
UPDATE profiles SET leave_balances = '{"vacation":{"total":10,"used":3,"remaining":7},"sick":{"total":5,"used":0,"remaining":5},"remote":{"total":10,"used":0,"remaining":10}}', updated_at = now() WHERE email ILIKE 'tara@luxury-listings.com';

-- ── Users with no Firebase record → company default (10 vac / 3 sick / 10 remote) ──
UPDATE profiles SET leave_balances = '{"vacation":{"total":10,"used":0,"remaining":10},"sick":{"total":3,"used":0,"remaining":3},"remote":{"total":10,"used":0,"remaining":10}}', updated_at = now() WHERE email ILIKE 'dylan@luxury-listings.com';
UPDATE profiles SET leave_balances = '{"vacation":{"total":10,"used":0,"remaining":10},"sick":{"total":3,"used":0,"remaining":3},"remote":{"total":10,"used":0,"remaining":10}}', updated_at = now() WHERE email ILIKE 'luca@luxury-listings.com';
UPDATE profiles SET leave_balances = '{"vacation":{"total":10,"used":0,"remaining":10},"sick":{"total":3,"used":0,"remaining":3},"remote":{"total":10,"used":0,"remaining":10}}', updated_at = now() WHERE email ILIKE 'michelle@luxury-listings.com';
UPDATE profiles SET leave_balances = '{"vacation":{"total":10,"used":0,"remaining":10},"sick":{"total":3,"used":0,"remaining":3},"remote":{"total":10,"used":0,"remaining":10}}', updated_at = now() WHERE email ILIKE 'mikayla@luxury-listings.com';
UPDATE profiles SET leave_balances = '{"vacation":{"total":10,"used":0,"remaining":10},"sick":{"total":3,"used":0,"remaining":3},"remote":{"total":10,"used":0,"remaining":10}}', updated_at = now() WHERE email ILIKE 'content@luxury-listings.com';

-- Verify all users
SELECT email, leave_balances->>'vacation' AS vacation FROM profiles ORDER BY email;
