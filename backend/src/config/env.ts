import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',

  // Database
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ab_test_monitor',
  },

  // Monitoring
  cronSchedule: process.env.CRON_SCHEDULE || '0 2 * * *',
  browserTimeout: parseInt(process.env.BROWSER_TIMEOUT || '30000', 10),
  screenshotDir: process.env.SCREENSHOT_DIR || path.join(__dirname, '../../screenshots'),
  maxConcurrentChecks: parseInt(process.env.MAX_CONCURRENT_CHECKS || '5', 10),
  cookieName: process.env.COOKIE_NAME || 'ab_test_error',
  pageSize: parseInt(process.env.PAGE_SIZE || '50', 10),
  maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
  retryDelayMs: parseInt(process.env.RETRY_DELAY_MS || '1000', 10),
  maxErrorMessageLength: parseInt(process.env.MAX_ERROR_MESSAGE_LENGTH || '2000', 10),

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
};

// Validate required environment variables in production
if (config.nodeEnv === 'production') {
  const required = ['JWT_SECRET', 'DB_PASSWORD'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
