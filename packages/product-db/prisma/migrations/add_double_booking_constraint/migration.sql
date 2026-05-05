-- Migration: Add Double Booking Prevention Constraint
-- Purpose: Prevent overlapping bookings for the same hotel using PostgreSQL EXCLUDE constraint

-- ─────────────────────────────────────────────────────
-- STEP 1: Enable btree_gist extension (required for GIST indexing with =, &&)
-- ─────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ─────────────────────────────────────────────────────
-- STEP 2: Add EXCLUDE constraint to prevent date range overlap
-- ─────────────────────────────────────────────────────
-- This constraint prevents two bookings for the SAME hotel with OVERLAPPING dates
-- Only applies to PENDING and CONFIRMED bookings (CANCELLED bookings don't block new ones)
--
-- Constraint logic:
--   hotel_id WITH = : Two rows with same hotel_id are compared (equality check)
--   daterange(...) WITH && : Date ranges must NOT overlap (&&= overlap operator negated by EXCLUDE)
--   WHERE (status IN ('PENDING', 'CONFIRMED')) : Only active bookings are protected
--
-- Example BLOCKED case:
--   Booking1: hotelId=1, checkIn='2025-05-10', checkOut='2025-05-12', status='CONFIRMED'
--   Booking2: hotelId=1, checkIn='2025-05-11', checkOut='2025-05-13', status='PENDING'
--   → CONFLICT! Dates overlap (10-12 conflicts with 11-13)
--   → PostgreSQL REJECTS Booking2
--
-- Example ALLOWED case:
--   Booking1: hotelId=1, checkIn='2025-05-10', checkOut='2025-05-12', status='CONFIRMED'
--   Booking2: hotelId=1, checkIn='2025-05-12', checkOut='2025-05-14', status='PENDING'
--   → ALLOWED! Dates are adjacent (checkout on 12, checkin on 12 = no overlap)
--
-- Example ALLOWED case (same overlap but status is CANCELLED):
--   Booking1: hotelId=1, checkIn='2025-05-10', checkOut='2025-05-12', status='CANCELLED'
--   Booking2: hotelId=1, checkIn='2025-05-11', checkOut='2025-05-13', status='PENDING'
--   → ALLOWED! Booking1 is CANCELLED, so it doesn't block (WHERE condition excludes it)
-- ─────────────────────────────────────────────────────

ALTER TABLE bookings
ADD CONSTRAINT no_overlapping_bookings EXCLUDE USING gist (
  "hotelId" WITH =,
  daterange("checkIn"::date, "checkOut"::date) WITH &&
) WHERE (status IN ('PENDING', 'CONFIRMED'));

-- ─────────────────────────────────────────────────────
-- STEP 3: Verify constraint by querying the constraint definition
-- ─────────────────────────────────────────────────────
-- Run this query to confirm the constraint is added:
-- SELECT constraint_name, constraint_type FROM information_schema.table_constraints 
-- WHERE table_name='bookings' AND constraint_name='no_overlapping_bookings';
