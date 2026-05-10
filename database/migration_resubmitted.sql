-- ============================================================
-- MRD Resubmission Status Migration
-- Run this in phpMyAdmin to add 'Resubmitted' to the status enum.
-- ============================================================

USE mrd_db;

ALTER TABLE applications 
    MODIFY COLUMN status ENUM('Pending','Approved','Rejected','For Resubmission','Resubmitted') DEFAULT 'Pending';
