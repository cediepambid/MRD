-- ============================================================
-- MRD Archive Feature Migration
-- ============================================================

USE mrd_db;

ALTER TABLE applications 
    ADD COLUMN is_archived TINYINT(1) DEFAULT 0 AFTER is_certified;
