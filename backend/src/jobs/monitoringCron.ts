import cron from 'node-cron';
import { monitoringService } from '../services/monitoringService';
import { config } from '../config/env';
import { logger } from '../utils/logger';

let cronJob: cron.ScheduledTask | null = null;

export function startMonitoringCron(): void {
  if (cronJob) {
    logger.warn('Monitoring cron job is already running');
    return;
  }

  // Validate cron schedule
  if (!cron.validate(config.cronSchedule)) {
    logger.error(`Invalid cron schedule: ${config.cronSchedule}`);
    return;
  }

  logger.info(`Scheduling monitoring cron job: ${config.cronSchedule}`);

  cronJob = cron.schedule(config.cronSchedule, async () => {
    logger.info('Cron job triggered - Starting automated monitoring run');

    try {
      const runId = await monitoringService.runMonitoring('cron');
      logger.info(`Automated monitoring run ${runId} completed successfully`);
    } catch (error) {
      logger.error('Automated monitoring run failed:', error);
    }
  });

  cronJob.start();
  logger.info('Monitoring cron job started successfully');
}

export function stopMonitoringCron(): void {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    logger.info('Monitoring cron job stopped');
  }
}

export function getCronStatus(): { running: boolean; schedule: string } {
  return {
    running: cronJob !== null,
    schedule: config.cronSchedule,
  };
}
