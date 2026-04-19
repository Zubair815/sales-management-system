/**
 * Wraps async route handlers to automatically catch errors
 * and forward them to Express error handling middleware.
 * Eliminates try-catch boilerplate in every controller.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
