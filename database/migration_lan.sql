-- ============================================================
-- MRD LAN Network Migration
-- Run this in phpMyAdmin if you already imported mrd.sql before.
-- Safe to run multiple times.
-- ============================================================

USE mrd_db;

-- Add user_agent column (tracks browser/device of applicant)
ALTER TABLE applications
    ADD COLUMN user_agent VARCHAR(500) DEFAULT NULL AFTER ip_address;

-- Add LAN/network settings
INSERT INTO settings (`key`, value) VALUES
  ('lan_ip',          ''),
  ('lan_port_dev',    '5174'),
  ('lan_port_apache', '80'),
  ('use_dev_server',  '1')
ON DUPLICATE KEY UPDATE `key` = `key`;
