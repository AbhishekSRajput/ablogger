import express, { Application } from 'express';
import cors from 'cors';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import { testConnection } from './config/database';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { startMonitoringCron } from './jobs/monitoringCron';
import { logger } from './utils/logger';

// Import routes
import authRoutes from './routes/auth.routes';
import clientsRoutes from './routes/clients.routes';
import urlsRoutes from './routes/urls.routes';
import browsersRoutes from './routes/browsers.routes';
import failuresRoutes from './routes/failures.routes';
import monitoringRoutes from './routes/monitoring.routes';
import analyticsRoutes from './routes/analytics.routes';

const app: Application = express();

// Middleware
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
});

app.use('/api/', limiter);

// Serve screenshots statically
app.use('/screenshots', express.static(config.screenshotDir));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/urls', urlsRoutes);
app.use('/api/browsers', browsersRoutes);
app.use('/api/failures', failuresRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      logger.error('Failed to connect to database. Server not started.');
      process.exit(1);
    }

    // Start cron job
    startMonitoringCron();

    // Start Express server
    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`CORS origin: ${config.corsOrigin}`);
      logger.info(`Monitoring cron: ${config.cronSchedule}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();

export default app;
