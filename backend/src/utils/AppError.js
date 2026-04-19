class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

class UnauthorizedError extends AppError {
  constructor(msg = 'Authentication required') {
    super(msg, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(msg = 'Access denied') {
    super(msg, 403);
  }
}

class ValidationError extends AppError {
  constructor(msg = 'Validation failed', errors = []) {
    super(msg, 400);
    this.errors = errors;
  }
}

module.exports = { AppError, NotFoundError, UnauthorizedError, ForbiddenError, ValidationError };
