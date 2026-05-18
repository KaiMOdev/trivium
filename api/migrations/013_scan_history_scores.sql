-- Add per-category scores to scan_history for trends tracking
ALTER TABLE scan_history
  ADD COLUMN IF NOT EXISTS scores JSONB;

-- Backfill: set scores to null for existing rows (no data available)
-- Future inserts will populate this column
