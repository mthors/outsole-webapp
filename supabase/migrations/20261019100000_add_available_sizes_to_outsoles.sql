-- Migration: Add available_sizes column to outsoles table
-- Nullable text column to store flexible size range information (e.g. '38–45')

ALTER TABLE public.outsoles
  ADD COLUMN IF NOT EXISTS available_sizes TEXT;

COMMENT ON COLUMN public.outsoles.available_sizes IS 'Available size range (e.g. 38–45) or flexible size descriptions';
