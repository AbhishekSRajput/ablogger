-- Migration: Add progress tracking columns to monitoring_runs table
-- Run this migration to add live progress tracking support

ALTER TABLE monitoring_runs
ADD COLUMN total_checks_expected INT DEFAULT 0 AFTER total_errors_found,
ADD COLUMN current_url VARCHAR(500) NULL AFTER total_checks_expected,
ADD COLUMN current_browser VARCHAR(100) NULL AFTER current_url;
