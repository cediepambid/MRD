-- ============================================================
-- MRD – Monthly Rice Distribution Program
-- Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS mrd_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mrd_db;

-- ============================================================
-- USERS (Admin accounts with roles)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('superadmin','mrd_admin','verifier','releasing_officer','viewer') DEFAULT 'mrd_admin',
    avatar VARCHAR(255) DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    last_login DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- APPLICATIONS (MRD Registration Form Submissions)
-- ============================================================
CREATE TABLE IF NOT EXISTS applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reference_number VARCHAR(20) NOT NULL UNIQUE,
    -- Personal Information
    sector VARCHAR(150) DEFAULT 'Tricycle franchise holder / TODA Member',
    surname VARCHAR(80) NOT NULL,
    given_name VARCHAR(80) NOT NULL,
    middle_name VARCHAR(80) DEFAULT NULL,
    complete_address TEXT NOT NULL,
    barangay VARCHAR(100) NOT NULL,
    town_city VARCHAR(100) NOT NULL,
    province VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    age TINYINT UNSIGNED NOT NULL,
    gender ENUM('Male','Female','Other') NOT NULL,
    cellphone VARCHAR(20) NOT NULL,
    civil_status ENUM('Single','Married','Widowed','Separated','Annulled') NOT NULL,
    spouse_name VARCHAR(160) DEFAULT NULL,
    educational_attainment VARCHAR(100) DEFAULT NULL,
    -- TODA Information
    toda_name VARCHAR(150) DEFAULT NULL,
    franchise_number VARCHAR(80) DEFAULT NULL,
    drivers_license_number VARCHAR(80) DEFAULT NULL,
    -- Status
    status ENUM('Pending','Approved','Rejected','For Resubmission') DEFAULT 'Pending',
    rejection_reason TEXT DEFAULT NULL,
    resubmission_reason TEXT DEFAULT NULL,
    -- Review metadata
    reviewed_by INT DEFAULT NULL,
    reviewed_at DATETIME DEFAULT NULL,
    approved_by INT DEFAULT NULL,
    approved_at DATETIME DEFAULT NULL,
    -- Certification
    is_certified TINYINT(1) DEFAULT 0,
    -- Tracking
    ip_address VARCHAR(45) DEFAULT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- APPLICATION ATTACHMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS application_attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    attachment_type ENUM(
        'drivers_license',
        'franchise_receipt',
        'cedula',
        'id_picture',
        'valid_id'
    ) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT DEFAULT NULL,
    mime_type VARCHAR(100) DEFAULT NULL,
    status ENUM('Pending','Complete','Missing','Invalid') DEFAULT 'Pending',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- ============================================================
-- BENEFICIARIES (Approved applicants)
-- ============================================================
CREATE TABLE IF NOT EXISTS beneficiaries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL UNIQUE,
    reference_number VARCHAR(20) NOT NULL,
    claim_status ENUM('Not Yet Claimed','Claimed') DEFAULT 'Not Yet Claimed',
    claimed_at DATETIME DEFAULT NULL,
    released_by INT DEFAULT NULL,
    release_remarks TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (released_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,             -- NULL = system-wide admin notification
    type VARCHAR(80) NOT NULL,            -- e.g. new_application, approved, rejected
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    reference_number VARCHAR(20) DEFAULT NULL,
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- ACTIVITY LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    user_name VARCHAR(120) DEFAULT NULL,
    action VARCHAR(100) NOT NULL,
    reference_number VARCHAR(20) DEFAULT NULL,
    application_id INT DEFAULT NULL,
    old_status VARCHAR(50) DEFAULT NULL,
    new_status VARCHAR(50) DEFAULT NULL,
    remarks TEXT DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- QR CODES (Registration QR Code management)
-- ============================================================
CREATE TABLE IF NOT EXISTS qr_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(64) NOT NULL UNIQUE,
    registration_url VARCHAR(500) NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    generated_by INT DEFAULT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- SETTINGS (System branding & config)
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(100) NOT NULL UNIQUE,
    value TEXT DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_barangay ON applications(barangay);
CREATE INDEX idx_applications_reference ON applications(reference_number);
CREATE INDEX idx_applications_cellphone ON applications(cellphone);
CREATE INDEX idx_applications_surname ON applications(surname);
CREATE INDEX idx_attachments_app ON application_attachments(application_id);
CREATE INDEX idx_beneficiaries_claim ON beneficiaries(claim_status);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_ref ON activity_logs(reference_number);

-- ============================================================
-- DEFAULT ADMIN (password: Admin@2026)
-- ============================================================
INSERT INTO users (name, email, password, role) VALUES
('Super Administrator', 'admin@mrd.gov.ph',
 '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
 'superadmin');

-- ============================================================
-- DEFAULT SETTINGS
-- ============================================================
INSERT INTO settings (`key`, value) VALUES
  ('system_name',     'MRD – Monthly Rice Distribution Program'),
  ('system_subtitle', 'Tricycle Franchise Holders / TODA Members'),
  ('system_logo',     NULL),
  ('lgu_name',        'Local Government Unit'),
  ('max_file_size_mb','5'),
  ('qr_active',       '1'),
  ('reg_url',         'http://localhost/MRD/public/#/register')
ON DUPLICATE KEY UPDATE `key` = `key`;
