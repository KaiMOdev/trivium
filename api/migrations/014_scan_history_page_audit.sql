-- Allow 'page_audit' scan type in scan_history
ALTER TABLE scan_history DROP CONSTRAINT IF EXISTS scan_history_scan_type_check;
ALTER TABLE scan_history ADD CONSTRAINT scan_history_scan_type_check
  CHECK (scan_type IN ('single', 'site', 'page_audit'));
