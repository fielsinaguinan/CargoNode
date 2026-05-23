-- ==========================================
-- Add Fleet Details (Plate Number & Capacity)
-- ==========================================

ALTER TABLE public.prime_movers
ADD COLUMN IF NOT EXISTS plate_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS capacity VARCHAR(50);
