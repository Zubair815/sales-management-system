const { app, server } = require('./app');
const logger = require('./utils/logger');
const prisma = require('./config/database');
const { PORT, NODE_ENV } = require('./config/env');

// Global unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { reason: reason?.stack || reason });
  // In production: log and continue. The process stays alive.
  // Only crash if the rejection is truly unrecoverable (e.g., DB connection lost).
});

// Global uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception — shutting down:', { error: error.stack });
  // Uncaught exceptions leave the process in an undefined state.
  // Always restart after logging.
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Graceful shutdown on SIGTERM/SIGINT (Docker, K8s, Render, Ctrl+C)
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

async function gracefulShutdown(signal) {
  logger.info(`${signal} received — starting graceful shutdown`);

  // 1. Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed');

    // 2. Close database pool
    try {
      await prisma.$disconnect();
      logger.info('Database connection closed');
    } catch (err) {
      logger.error('Error closing database:', err);
    }

    // 3. Exit
    process.exit(signal === 'UNCAUGHT_EXCEPTION' ? 1 : 0);
  });

  // Force kill after 10s if shutdown hangs
  setTimeout(() => {
    logger.error('Forced shutdown — timeout exceeded');
    process.exit(1);
  }, 10000);
}

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${NODE_ENV} mode`);
});
