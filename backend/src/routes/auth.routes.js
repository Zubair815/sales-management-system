const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { loginLimiter } = require('../middleware/rateLimiter');
const { validate, sanitizeInputs } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');

const loginValidation = [
  body('password').notEmpty().withMessage('Password is required'),
];

const superAdminLoginValidation = [
  ...loginValidation,
  body('email').isEmail().withMessage('Valid email is required'),
];

const salespersonLoginValidation = [
  ...loginValidation,
  body('employeeId')
    .notEmpty().withMessage('Employee ID is required')
    .isAlphanumeric().withMessage('Employee ID must be alphanumeric')
    .isLength({ min: 8, max: 12 }).withMessage('Employee ID must be 8-12 characters'),
];

router.post('/super-admin/login',
  loginLimiter,
  sanitizeInputs,
  superAdminLoginValidation,
  validate,
  authController.superAdminLogin
);

router.post('/admin/login',
  loginLimiter,
  sanitizeInputs,
  superAdminLoginValidation,
  validate,
  authController.adminLogin
);

router.post('/salesperson/login',
  loginLimiter,
  sanitizeInputs,
  salespersonLoginValidation,
  validate,
  authController.salespersonLogin
);

router.post('/logout',
  authenticate,
  authController.logout
);

router.get('/me',
  authenticate,
  authController.getMe
);

module.exports = router;
