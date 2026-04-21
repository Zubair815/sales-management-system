-- ============================================================
-- STEP 1: CREATE ALL 16 TABLES
-- Select ALL of this and click Run in TiDB SQL Editor
-- ============================================================

USE test;

CREATE TABLE IF NOT EXISTS `super_admins` (
  `id`           VARCHAR(191) NOT NULL,
  `name`         VARCHAR(191) NOT NULL,
  `email`        VARCHAR(191) NOT NULL,
  `password`     VARCHAR(191) NOT NULL,
  `status`       VARCHAR(191) NOT NULL DEFAULT 'Active',
  `lastLoginAt`  DATETIME(3) NULL,
  `createdAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3) NOT NULL,
  `deletedAt`    DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `super_admins_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `admins` (
  `id`             VARCHAR(191) NOT NULL,
  `name`           VARCHAR(191) NOT NULL,
  `email`          VARCHAR(191) NOT NULL,
  `phone`          VARCHAR(191) NULL,
  `password`       VARCHAR(191) NOT NULL,
  `status`         VARCHAR(191) NOT NULL DEFAULT 'Active',
  `failedAttempts` INT NOT NULL DEFAULT 0,
  `lockedUntil`    DATETIME(3) NULL,
  `lastLoginAt`    DATETIME(3) NULL,
  `createdAt`      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`      DATETIME(3) NOT NULL,
  `deletedAt`      DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `admins_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `salespersons` (
  `id`             VARCHAR(191) NOT NULL,
  `employeeId`     VARCHAR(191) NOT NULL,
  `name`           VARCHAR(191) NOT NULL,
  `email`          VARCHAR(191) NULL,
  `phone`          VARCHAR(191) NOT NULL,
  `password`       VARCHAR(191) NOT NULL,
  `region`         VARCHAR(191) NULL,
  `jobRole`        VARCHAR(191) NULL,
  `status`         VARCHAR(191) NOT NULL DEFAULT 'Active',
  `targetAmount`   DECIMAL(15,2) NULL,
  `budgetAmount`   DECIMAL(15,2) NULL,
  `failedAttempts` INT NOT NULL DEFAULT 0,
  `lockedUntil`    DATETIME(3) NULL,
  `lastLoginAt`    DATETIME(3) NULL,
  `createdAt`      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`      DATETIME(3) NOT NULL,
  `deletedAt`      DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `salespersons_employeeId_key` (`employeeId`),
  UNIQUE INDEX `salespersons_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `module_permissions` (
  `id`              VARCHAR(191) NOT NULL,
  `adminId`         VARCHAR(191) NOT NULL,
  `moduleName`      VARCHAR(191) NOT NULL,
  `permissionLevel` VARCHAR(191) NOT NULL,
  `createdAt`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`       DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `module_permissions_adminId_moduleName_key` (`adminId`, `moduleName`),
  INDEX `module_permissions_adminId_idx` (`adminId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `parties` (
  `id`          VARCHAR(191) NOT NULL,
  `name`        VARCHAR(191) NOT NULL,
  `contactName` VARCHAR(191) NULL,
  `phone`       VARCHAR(191) NOT NULL,
  `email`       VARCHAR(191) NULL,
  `address`     VARCHAR(191) NULL,
  `city`        VARCHAR(191) NULL,
  `state`       VARCHAR(191) NULL,
  `gstNumber`   VARCHAR(191) NULL,
  `status`      VARCHAR(191) NOT NULL DEFAULT 'Active',
  `createdAt`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3) NOT NULL,
  `deletedAt`   DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  INDEX `parties_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `inventory_items` (
  `id`                VARCHAR(191) NOT NULL,
  `sku`               VARCHAR(191) NOT NULL,
  `name`              VARCHAR(191) NOT NULL,
  `description`       VARCHAR(191) NULL,
  `category`          VARCHAR(191) NULL,
  `unit`              VARCHAR(191) NOT NULL DEFAULT 'Piece',
  `costPrice`         DECIMAL(15,2) NULL,
  `sellingPrice`      DECIMAL(15,2) NOT NULL,
  `stockQuantity`     INT NOT NULL DEFAULT 0,
  `lowStockThreshold` INT NOT NULL DEFAULT 10,
  `status`            VARCHAR(191) NOT NULL DEFAULT 'Active',
  `createdAt`         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`         DATETIME(3) NOT NULL,
  `deletedAt`         DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `inventory_items_sku_key` (`sku`),
  INDEX `inventory_items_status_idx` (`status`),
  INDEX `inventory_items_category_idx` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `orders` (
  `id`            VARCHAR(191) NOT NULL,
  `orderNumber`   VARCHAR(191) NOT NULL,
  `salespersonId` VARCHAR(191) NOT NULL,
  `partyId`       VARCHAR(191) NOT NULL,
  `status`        VARCHAR(191) NOT NULL DEFAULT 'Pending',
  `totalAmount`   DECIMAL(15,2) NOT NULL,
  `taxAmount`     DECIMAL(15,2) NULL DEFAULT 0,
  `grandTotal`    DECIMAL(15,2) NOT NULL,
  `notes`         VARCHAR(191) NULL,
  `printedCount`  INT NOT NULL DEFAULT 0,
  `lastPrintedAt` DATETIME(3) NULL,
  `createdAt`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3) NOT NULL,
  `deletedAt`     DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `orders_orderNumber_key` (`orderNumber`),
  INDEX `orders_salespersonId_idx` (`salespersonId`),
  INDEX `orders_partyId_idx` (`partyId`),
  INDEX `orders_status_idx` (`status`),
  INDEX `orders_createdAt_idx` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `order_items` (
  `id`         VARCHAR(191) NOT NULL,
  `orderId`    VARCHAR(191) NOT NULL,
  `itemId`     VARCHAR(191) NOT NULL,
  `quantity`   INT NOT NULL,
  `unitPrice`  DECIMAL(15,2) NOT NULL,
  `totalPrice` DECIMAL(15,2) NOT NULL,
  `createdAt`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`  DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `order_items_orderId_idx` (`orderId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `expense_types` (
  `id`          VARCHAR(191) NOT NULL,
  `name`        VARCHAR(191) NOT NULL,
  `description` VARCHAR(191) NULL,
  `status`      VARCHAR(191) NOT NULL DEFAULT 'Active',
  `createdAt`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3) NOT NULL,
  `deletedAt`   DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `expense_types_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `expenses` (
  `id`              VARCHAR(191) NOT NULL,
  `salespersonId`   VARCHAR(191) NOT NULL,
  `expenseTypeId`   VARCHAR(191) NOT NULL,
  `description`     VARCHAR(191) NOT NULL,
  `amount`          DECIMAL(15,2) NOT NULL,
  `expenseDate`     DATETIME(3) NOT NULL,
  `proofFilePath`   VARCHAR(191) NULL,
  `status`          VARCHAR(191) NOT NULL DEFAULT 'Draft',
  `submittedAt`     DATETIME(3) NULL,
  `approvedById`    VARCHAR(191) NULL,
  `approvedAt`      DATETIME(3) NULL,
  `rejectionReason` VARCHAR(191) NULL,
  `budgetCode`      VARCHAR(191) NULL,
  `remarks`         VARCHAR(191) NULL,
  `createdAt`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`       DATETIME(3) NOT NULL,
  `deletedAt`       DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  INDEX `expenses_salespersonId_idx` (`salespersonId`),
  INDEX `expenses_status_idx` (`status`),
  INDEX `expenses_expenseDate_idx` (`expenseDate`),
  INDEX `expenses_submittedAt_idx` (`submittedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payments` (
  `id`              VARCHAR(191) NOT NULL,
  `receiptNumber`   VARCHAR(191) NOT NULL,
  `salespersonId`   VARCHAR(191) NOT NULL,
  `partyId`         VARCHAR(191) NOT NULL,
  `orderId`         VARCHAR(191) NULL,
  `amount`          DECIMAL(15,2) NOT NULL,
  `paymentMode`     VARCHAR(191) NOT NULL,
  `transactionId`   VARCHAR(191) NULL,
  `paymentDate`     DATETIME(3) NOT NULL,
  `purpose`         VARCHAR(191) NULL,
  `status`          VARCHAR(191) NOT NULL DEFAULT 'Pending',
  `verifiedById`    VARCHAR(191) NULL,
  `verifiedAt`      DATETIME(3) NULL,
  `rejectionReason` VARCHAR(191) NULL,
  `proofFilePath`   VARCHAR(191) NULL,
  `createdAt`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`       DATETIME(3) NOT NULL,
  `deletedAt`       DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `payments_receiptNumber_key` (`receiptNumber`),
  INDEX `payments_salespersonId_idx` (`salespersonId`),
  INDEX `payments_partyId_idx` (`partyId`),
  INDEX `payments_status_idx` (`status`),
  INDEX `payments_paymentDate_idx` (`paymentDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `announcements` (
  `id`             VARCHAR(191) NOT NULL,
  `createdById`    VARCHAR(191) NOT NULL,
  `title`          VARCHAR(191) NOT NULL,
  `message`        TEXT NOT NULL,
  `priority`       VARCHAR(191) NOT NULL DEFAULT 'Medium',
  `attachmentPath` VARCHAR(191) NULL,
  `expiryDate`     DATETIME(3) NULL,
  `status`         VARCHAR(191) NOT NULL DEFAULT 'Draft',
  `sentAt`         DATETIME(3) NULL,
  `targetType`     VARCHAR(191) NOT NULL DEFAULT 'All',
  `targetRegions`  JSON NULL,
  `targetRoles`    JSON NULL,
  `createdAt`      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`      DATETIME(3) NOT NULL,
  `deletedAt`      DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  INDEX `announcements_status_idx` (`status`),
  INDEX `announcements_priority_idx` (`priority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `announcement_recipients` (
  `id`             VARCHAR(191) NOT NULL,
  `announcementId` VARCHAR(191) NOT NULL,
  `salespersonId`  VARCHAR(191) NOT NULL,
  `createdAt`      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `announcement_recipients_announcementId_salespersonId_key` (`announcementId`, `salespersonId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `announcement_reads` (
  `id`             VARCHAR(191) NOT NULL,
  `announcementId` VARCHAR(191) NOT NULL,
  `salespersonId`  VARCHAR(191) NOT NULL,
  `readAt`         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `announcement_reads_announcementId_salespersonId_key` (`announcementId`, `salespersonId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `system_configs` (
  `id`          VARCHAR(191) NOT NULL,
  `key`         VARCHAR(191) NOT NULL,
  `value`       VARCHAR(191) NOT NULL,
  `description` VARCHAR(191) NULL,
  `createdAt`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `system_configs_key_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `print_templates` (
  `id`             VARCHAR(191) NOT NULL,
  `name`           VARCHAR(191) NOT NULL,
  `companyName`    VARCHAR(191) NULL,
  `companyAddress` VARCHAR(191) NULL,
  `companyPhone`   VARCHAR(191) NULL,
  `companyEmail`   VARCHAR(191) NULL,
  `logoPath`       VARCHAR(191) NULL,
  `footerText`     VARCHAR(191) NULL,
  `customCss`      TEXT NULL,
  `isActive`       TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt`      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`      DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `print_templates_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id`            VARCHAR(191) NOT NULL,
  `userId`        VARCHAR(191) NULL,
  `userType`      VARCHAR(191) NULL,
  `superAdminId`  VARCHAR(191) NULL,
  `adminId`       VARCHAR(191) NULL,
  `salespersonId` VARCHAR(191) NULL,
  `action`        VARCHAR(191) NOT NULL,
  `module`        VARCHAR(191) NOT NULL,
  `recordId`      VARCHAR(191) NULL,
  `oldValues`     JSON NULL,
  `newValues`     JSON NULL,
  `ipAddress`     VARCHAR(191) NULL,
  `userAgent`     VARCHAR(191) NULL,
  `createdAt`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `audit_logs_userId_idx` (`userId`),
  INDEX `audit_logs_module_idx` (`module`),
  INDEX `audit_logs_createdAt_idx` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
