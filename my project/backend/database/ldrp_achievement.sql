-- LDRP-ITR Achievement Portal - FRESH DATABASE
-- No previous student/alumni accounts, achievements, assignments or demo records.
-- Only one initial Admin and one initial Mentor are created so the portal can be managed.
-- Change these passwords immediately after first login.

SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS ldrp_achievement
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ldrp_achievement;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS mentor_assignments;
DROP TABLE IF EXISTS achievements;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name           VARCHAR(120) NOT NULL,
  email          VARCHAR(190) NOT NULL,
  password       VARCHAR(255) NOT NULL,
  role           ENUM('student','alumni','mentor','admin') NOT NULL DEFAULT 'student',
  enrollment_no  VARCHAR(50) NULL,
  department     VARCHAR(120) NULL,
  semester       VARCHAR(20) NULL,
  status         ENUM('active','blocked') NOT NULL DEFAULT 'active',
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role),
  KEY idx_users_status (status)
) ENGINE=InnoDB;

CREATE TABLE categories (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name         VARCHAR(100) NOT NULL,
  description  VARCHAR(255) NULL,
  icon         VARCHAR(16) NULL,
  status       ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_name (name)
) ENGINE=InnoDB;

CREATE TABLE achievements (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id           INT UNSIGNED NOT NULL,
  category_id       INT UNSIGNED NOT NULL,
  title             VARCHAR(200) NOT NULL,
  description       TEXT NOT NULL,
  achievement_date  DATE NOT NULL,
  organization      VARCHAR(190) NULL,
  position          VARCHAR(120) NULL,
  certificate_path  VARCHAR(255) NULL,
  status            ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  rejection_reason  VARCHAR(500) NULL,
  points            INT UNSIGNED NOT NULL DEFAULT 0,
  featured          TINYINT(1) NOT NULL DEFAULT 0,
  reviewed_by       INT UNSIGNED NULL,
  reviewed_at       DATETIME NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ach_user (user_id),
  KEY idx_ach_category (category_id),
  KEY idx_ach_status (status),
  KEY idx_ach_featured (featured),
  CONSTRAINT fk_ach_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ach_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ach_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE mentor_assignments (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  mentor_id   INT UNSIGNED NOT NULL,
  student_id  INT UNSIGNED NOT NULL,
  status      ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_assignment_student (student_id),
  KEY idx_assignment_mentor (mentor_id),
  CONSTRAINT fk_ma_mentor FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ma_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE password_resets (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_password_reset_token (token_hash),
  KEY idx_password_reset_user (user_id),
  CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO categories (name, description, icon) VALUES
  ('Academics', 'Toppers, awards, scholarships and academic excellence', '🎓'),
  ('Sports', 'Inter-college and national level sports achievements', '🏅'),
  ('Hackathons', 'Hackathon wins and coding competitions', '💻'),
  ('Research', 'Published papers, patents and research projects', '🔬'),
  ('Placements', 'Campus placements and internships', '💼'),
  ('Cultural', 'Arts, music, dance and cultural events', '🎭');

-- Initial management accounts only.
-- Admin:  admin@ldrp.edu / Admin@123
-- Mentor: mentor@ldrp.edu / Mentor@123
INSERT INTO users
(name, email, password, role, department, status)
VALUES
('Portal Administrator', 'admin@ldrp.edu',
 '$2y$10$MNfsEM4lPnk/Ojr29tAF7eLX0U7M4ofSNj0dJ/D1PVdwIZ4tLq9A.',
 'admin', 'Administration', 'active'),
('Portal Mentor', 'mentor@ldrp.edu',
 '$2y$10$/v2rWWhTuqzRNjdT3FU2JeGGZAVtILqBSyo96xWiRWMuc/Jd24JX.',
 'mentor', 'Information Technology', 'active');
