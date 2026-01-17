import { query, queryOne, insert, execute } from '../config/database';
import { browserCheckService } from './browserCheckService';
import { MonitoredUrl, BrowserConfiguration, MonitoringRun } from '../types';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export class MonitoringService {
  async runMonitoring(triggeredBy: 'cron' | 'manual' = 'cron'): Promise<number> {
    logger.info(`Starting monitoring run (triggered by: ${triggeredBy})`);

    // Create monitoring run record
    const runId = await insert(
      'INSERT INTO monitoring_runs (triggered_by, status) VALUES (?, ?)',
      [triggeredBy, 'running']
    );

    try {
      // Fetch active URLs with active tests
      const activeUrls = await query<MonitoredUrl>(`
        SELECT * FROM monitored_urls
        WHERE is_active = TRUE AND has_active_test = TRUE
      `);

      if (activeUrls.length === 0) {
        logger.warn('No active URLs to monitor');
        await this.completeRun(runId, 0, 0, 'completed');
        return runId;
      }

      // Fetch active browser configurations
      const browserConfigs = await query<BrowserConfiguration>(`
        SELECT * FROM browser_configurations
        WHERE is_active = TRUE
      `);

      if (browserConfigs.length === 0) {
        logger.warn('No active browser configurations');
        await this.completeRun(runId, 0, 0, 'completed');
        return runId;
      }

      logger.info(`Monitoring ${activeUrls.length} URLs across ${browserConfigs.length} browser configs`);

      // Generate all URL + browser combinations
      const checkTasks: Array<{
        url: MonitoredUrl;
        config: BrowserConfiguration;
      }> = [];

      for (const url of activeUrls) {
        for (const config of browserConfigs) {
          checkTasks.push({ url, config });
        }
      }

      // Process checks with concurrency limit
      let totalChecked = 0;
      let totalErrorsFound = 0;

      for (let i = 0; i < checkTasks.length; i += config.maxConcurrentChecks) {
        const batch = checkTasks.slice(i, i + config.maxConcurrentChecks);

        const batchResults = await Promise.allSettled(
          batch.map(task => this.performCheck(runId, task.url, task.config))
        );

        // Count errors in this batch
        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            totalChecked++;
            if (result.value) {
              totalErrorsFound++;
            }
          } else {
            logger.error('Check failed:', result.reason);
          }
        }

        logger.info(`Progress: ${totalChecked}/${checkTasks.length} checks completed`);
      }

      // Complete the run
      await this.completeRun(runId, totalChecked, totalErrorsFound, 'completed');

      logger.info(`Monitoring run ${runId} completed: ${totalChecked} checks, ${totalErrorsFound} errors found`);
      return runId;
    } catch (error) {
      logger.error('Monitoring run failed:', error);
      await this.completeRun(runId, 0, 0, 'failed');
      throw error;
    }
  }

  private async performCheck(
    runId: number,
    url: MonitoredUrl,
    browserConfig: BrowserConfiguration
  ): Promise<boolean> {
    logger.debug(`Checking ${url.url} with ${browserConfig.browser_name} ${browserConfig.device_type}`);

    try {
      // Perform browser check
      const result = await browserCheckService.checkUrl(url.url, browserConfig);

      // Record the check
      const checkId = await insert(
        `INSERT INTO url_checks
        (run_id, url_id, config_id, page_load_time_ms, cookie_found, error_detected, check_status, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          runId,
          url.url_id,
          browserConfig.config_id,
          result.pageLoadTimeMs,
          result.cookieFound,
          result.errorDetected,
          result.checkStatus,
          result.errorMessage,
        ]
      );

      // Update last_checked_at for URL
      await execute(
        'UPDATE monitored_urls SET last_checked_at = NOW() WHERE url_id = ?',
        [url.url_id]
      );

      // If error detected, create failure record
      if (result.errorDetected && result.errorData) {
        await this.recordFailure(
          checkId,
          url.url_id,
          url.client_id,
          result.errorData,
          result.screenshotPath
        );
        return true; // Error found
      }

      return false; // No error
    } catch (error) {
      logger.error(`Check failed for ${url.url}:`, error);

      // Record failed check
      await insert(
        `INSERT INTO url_checks
        (run_id, url_id, config_id, check_status, error_message)
        VALUES (?, ?, ?, ?, ?)`,
        [
          runId,
          url.url_id,
          browserConfig.config_id,
          'error',
          error instanceof Error ? error.message : 'Unknown error',
        ]
      );

      return false;
    }
  }

  private async recordFailure(
    checkId: number,
    urlId: number,
    clientId: number,
    errorData: any,
    screenshotPath: string | null
  ): Promise<void> {
    try {
      // Parse timestamp from cookie
      let timestampFromCookie: Date | null = null;
      try {
        timestampFromCookie = new Date(errorData.timestamp);
      } catch {
        // Invalid timestamp, use current time
        timestampFromCookie = null;
      }

      // Insert failure record
      const failureId = await insert(
        `INSERT INTO detected_failures
        (check_id, url_id, client_id, test_id, variant, error_type, error_message,
         browser_from_cookie, timestamp_from_cookie)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          checkId,
          urlId,
          clientId,
          errorData.test_id,
          errorData.variant,
          errorData.error_type,
          errorData.error_message,
          errorData.browser,
          timestampFromCookie,
        ]
      );

      // Insert screenshot record if screenshot was captured
      if (screenshotPath) {
        await insert(
          'INSERT INTO failure_screenshots (failure_id, file_path) VALUES (?, ?)',
          [failureId, screenshotPath]
        );
      }

      logger.info(`Failure recorded: ${errorData.test_id} (${errorData.variant})`);
    } catch (error) {
      logger.error('Failed to record failure:', error);
      throw error;
    }
  }

  private async completeRun(
    runId: number,
    totalChecked: number,
    totalErrorsFound: number,
    status: 'completed' | 'failed'
  ): Promise<void> {
    await execute(
      `UPDATE monitoring_runs
       SET completed_at = NOW(), total_urls_checked = ?, total_errors_found = ?, status = ?
       WHERE run_id = ?`,
      [totalChecked, totalErrorsFound, status, runId]
    );
  }

  async getRunHistory(limit: number = 50): Promise<MonitoringRun[]> {
    return await query<MonitoringRun>(
      `SELECT * FROM monitoring_runs
       ORDER BY started_at DESC
       LIMIT ?`,
      [limit]
    );
  }

  async getRunById(runId: number): Promise<MonitoringRun | null> {
    return await queryOne<MonitoringRun>(
      'SELECT * FROM monitoring_runs WHERE run_id = ?',
      [runId]
    );
  }

  async getRunChecks(runId: number) {
    return await query(`
      SELECT
        uc.*,
        mu.url,
        mu.url_label,
        c.client_name,
        bc.browser_name,
        bc.device_type
      FROM url_checks uc
      JOIN monitored_urls mu ON uc.url_id = mu.url_id
      JOIN clients c ON mu.client_id = c.client_id
      JOIN browser_configurations bc ON uc.config_id = bc.config_id
      WHERE uc.run_id = ?
      ORDER BY uc.checked_at DESC
    `, [runId]);
  }
}

export const monitoringService = new MonitoringService();
