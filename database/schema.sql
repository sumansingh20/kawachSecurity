-- ============================================
-- KAVACH-INFINITY Database Schema (CORRECTED)
-- ============================================

CREATE DATABASE IF NOT EXISTS kavach_infinity
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE kavach_infinity;

-- ================= USERS ====================
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER',
  status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  avatar_url VARCHAR(500) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  department VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL DEFAULT NULL,
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- ================= AUDIT LOGS =================
CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  user_email VARCHAR(255) DEFAULT NULL,
  action VARCHAR(100) NOT NULL,
  category ENUM('AUTH','USER','SYSTEM','SECURITY','CONFIG') NOT NULL DEFAULT 'SYSTEM',
  description TEXT,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  metadata JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_category (category),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ================= SYSTEM EVENTS =================
CREATE TABLE system_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_type ENUM('ALERT','WARNING','INFO','ERROR','CRITICAL') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  source VARCHAR(100) DEFAULT 'SYSTEM',
  severity INT DEFAULT 1,
  is_read BOOLEAN DEFAULT FALSE,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_by INT DEFAULT NULL,
  resolved_at TIMESTAMP NULL DEFAULT NULL,
  metadata JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_event_type (event_type),
  INDEX idx_is_read (is_read),
  INDEX idx_is_resolved (is_resolved),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ================= SESSIONS =================
CREATE TABLE sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(500) NOT NULL UNIQUE,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_token (token),
  INDEX idx_expires_at (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ================= SYSTEM SETTINGS =================
CREATE TABLE system_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type ENUM('STRING','NUMBER','BOOLEAN','JSON') DEFAULT 'STRING',
  description VARCHAR(255),
  updated_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ================= DEMO USERS (VALID BCRYPT) =================
-- admin@kavach.in : Kavach@123
-- user@kavach.in  : User@123

INSERT INTO users (name, email, password_hash, role, status, department) VALUES
('System Administrator','admin@kavach.in',
 '$2b$10$wH6Y5t0R6wO4bC0O1xJ9KeGmYlOZ2Bq3bE1nMZQF6lFz2uE0xY1rC',
 'ADMIN','ACTIVE','IT Administration'),
('Demo User','user@kavach.in',
 '$2b$10$9YyZf0mQX3Hk3UqU0gJb2e9X7F9z2NwKqk3cP8JmGzK0Qq4ZPp6yO',
 'USER','ACTIVE','Operations');

-- ================= DEFAULT SETTINGS =================
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('session_timeout','30','NUMBER','Session timeout in minutes'),
('max_login_attempts','5','NUMBER','Maximum failed login attempts'),
('password_min_length','8','NUMBER','Minimum password length'),
('require_2fa','false','BOOLEAN','Require two-factor authentication'),
('system_name','KAVACH-INFINITY','STRING','System display name'),
('maintenance_mode','false','BOOLEAN','System maintenance mode');

-- ================= SAMPLE EVENTS =================
INSERT INTO system_events (event_type, title, message, source, severity) VALUES
('INFO','System Initialized','KAVACH-INFINITY platform initialized.','SYSTEM',1),
('INFO','Database Setup Complete','All tables created successfully.','DATABASE',1),
('WARNING','Security Check Pending','Initial security audit pending.','SECURITY',2);