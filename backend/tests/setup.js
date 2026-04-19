// Load .env FIRST so DATABASE_URL is available
require('dotenv').config();

// Override with test-specific values
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-12345';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-12345';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Only override DATABASE_URL if a dedicated test DB is configured
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
