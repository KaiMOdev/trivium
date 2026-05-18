-- 011_integration_enabled.sql
-- Add enabled toggle for integrations (used by DataForSEO, default true for existing rows)
ALTER TABLE user_integrations ADD COLUMN IF NOT EXISTS enabled boolean DEFAULT true;
