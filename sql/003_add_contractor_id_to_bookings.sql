-- Migration: add contractor_id to bookings and FK to contractors
-- Run this in your Supabase SQL editor or via psql against your database.

BEGIN;

ALTER TABLE IF EXISTS public.bookings
ADD COLUMN IF NOT EXISTS contractor_id uuid NULL;

-- Add foreign key constraint linking to contractors(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'bookings'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'contractor_id'
    ) THEN
        ALTER TABLE public.bookings
        ADD CONSTRAINT fk_bookings_contractor_id FOREIGN KEY (contractor_id) REFERENCES public.contractors(id) ON DELETE SET NULL;
    END IF;
END$$;

-- add an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_contractor_id ON public.bookings(contractor_id);

COMMIT;
