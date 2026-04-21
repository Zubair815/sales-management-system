-- ============================================================
-- STEP 2: SEED DATA
-- Run this AFTER step 1 (01_create_tables.sql) has completed
-- ============================================================

USE test;

-- Default SuperAdmin account
-- Email:    superadmin@sms.com
-- Password: Admin@123
INSERT INTO `super_admins` (`id`, `name`, `email`, `password`, `status`, `createdAt`, `updatedAt`)
VALUES (
  UUID(),
  'Super Admin',
  'superadmin@sms.com',
  '$2a$10$zPiLInZdBbDBGBOPFqGLbO8rdwPr.IN2U5PFCsMwEalnMZjExgzHK',
  'Active',
  NOW(3),
  NOW(3)
);

-- Default Print Templates
INSERT INTO `print_templates` (`id`, `name`, `companyName`, `companyAddress`, `companyPhone`, `companyEmail`, `footerText`, `isActive`, `createdAt`, `updatedAt`)
VALUES (UUID(), 'order', 'Your Company Name', 'Company Address', '0000-0000000', 'info@company.com', 'Thank you for your business!', 1, NOW(3), NOW(3));

INSERT INTO `print_templates` (`id`, `name`, `companyName`, `companyAddress`, `companyPhone`, `companyEmail`, `footerText`, `isActive`, `createdAt`, `updatedAt`)
VALUES (UUID(), 'expense', 'Your Company Name', 'Company Address', '0000-0000000', 'info@company.com', 'Expense Report', 1, NOW(3), NOW(3));

INSERT INTO `print_templates` (`id`, `name`, `companyName`, `companyAddress`, `companyPhone`, `companyEmail`, `footerText`, `isActive`, `createdAt`, `updatedAt`)
VALUES (UUID(), 'payment', 'Your Company Name', 'Company Address', '0000-0000000', 'info@company.com', 'Payment Receipt', 1, NOW(3), NOW(3));

-- ============================================================
-- DONE! Seed data inserted.
-- 
-- Login with:
--   Email:    superadmin@sms.com
--   Password: Admin@123
-- ============================================================
