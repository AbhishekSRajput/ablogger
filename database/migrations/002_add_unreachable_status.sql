-- Migration: Add 'unreachable' status to url_checks table
-- This handles cases where websites are not live or not responding

-- Alter the check_status enum to include 'unreachable'
ALTER TABLE url_checks
MODIFY COLUMN check_status ENUM('success', 'timeout', 'error', 'unreachable') DEFAULT 'success';

-- Add index for unreachable checks to help with filtering
CREATE INDEX idx_check_status ON url_checks(check_status);
