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
-- Test Salesperson Accounts
-- ============================================================
-- Salesperson 1: Alice Sales (EMP00001 / Sales12345)
-- Salesperson 2: Bob Sales   (EMP00002 / Sales12345)

INSERT INTO `salespersons` (`id`, `name`, `employeeId`, `phone`, `password`, `email`, `region`, `jobRole`, `status`, `targetAmount`, `budgetAmount`, `createdAt`, `updatedAt`)
VALUES (
  UUID(),
  'Alice Sales',
  'EMP00001',
  '9111111111',
  '$2a$10$29bncL561SstynyS6Bi0p.c3OCccQ9fCrVKcapjU5qedoXO2M0mz.',
  'alice@sales.com',
  'North',
  'Sales Executive',
  'Active',
  500000,
  20000,
  NOW(3),
  NOW(3)
);

INSERT INTO `salespersons` (`id`, `name`, `employeeId`, `phone`, `password`, `email`, `region`, `jobRole`, `status`, `targetAmount`, `budgetAmount`, `createdAt`, `updatedAt`)
VALUES (
  UUID(),
  'Bob Sales',
  'EMP00002',
  '9222222222',
  '$2a$10$29bncL561SstynyS6Bi0p.c3OCccQ9fCrVKcapjU5qedoXO2M0mz.',
  'bob@sales.com',
  'South',
  'Sales Executive',
  'Active',
  400000,
  15000,
  NOW(3),
  NOW(3)
);

-- ============================================================
-- DONE! Seed data inserted.
-- 
-- Login credentials:
--   SuperAdmin:     superadmin@sms.com    / Admin@123
--   Salesperson 1:  EMP00001              / Sales12345
--   Salesperson 2:  EMP00002              / Sales12345
-- ============================================================
