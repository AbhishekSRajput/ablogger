import { query, queryOne, insert, execute } from '../config/database';
import { browserCheckService } from './browserCheckService';
import { MonitoredUrl, BrowserConfiguration, MonitoringRun, BrowserCheckResult } from '../types';
import { config } from '../config/env';
import { logger } from '../utils/logger';

// Result type for performCheck
interface CheckResult {
  hasError: boolean;
  isUnreachable: boolean;
  checkStatus: BrowserCheckResult['checkStatus'];
}

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
        for (const bConfig of browserConfigs) {
          checkTasks.push({ url, config: bConfig });
        }
      }

      // Update run with total expected checks
      await this.updateRunProgress(runId, 0, checkTasks.length, null, null);

      // Process checks with concurrency limit
      let totalChecked = 0;
      let totalErrorsFound = 0;
      let totalUnreachable = 0;
      let totalTimeouts = 0;

      for (let i = 0; i < checkTasks.length; i += config.maxConcurrentChecks) {
        const batch = checkTasks.slice(i, i + config.maxConcurrentChecks);

        // Update current URL/browser being checked (use first item in batch)
        const currentTask = batch[0];
        await this.updateRunProgress(
          runId,
          totalChecked,
          checkTasks.length,
          currentTask.url.url,
          currentTask.config.browser_name
        );

        const batchResults = await Promise.allSettled(
          batch.map(task => this.performCheck(runId, task.url, task.config))
        );

        // Count errors in this batch
        for (const result of batchResults) {
          totalChecked++;

          if (result.status === 'fulfilled') {
            const checkResult = result.value;
            if (checkResult.hasError) {
              totalErrorsFound++;
            }
            if (checkResult.isUnreachable) {
              totalUnreachable++;
            }
            if (checkResult.checkStatus === 'timeout') {
              totalTimeouts++;
            }
          } else {
            logger.error('Check failed with exception:', result.reason);
            // Count exceptions as errors
            totalErrorsFound++;
          }
        }

        // Update progress after batch (include errors in the count for visibility)
        await this.updateRunProgressWithErrors(runId, totalChecked, checkTasks.length, totalErrorsFound, null, null);

        logger.info(`Progress: ${totalChecked}/${checkTasks.length} checks completed (${totalErrorsFound} errors, ${totalUnreachable} unreachable, ${totalTimeouts} timeouts)`);
      }

      // Complete the run
      await this.completeRun(runId, totalChecked, totalErrorsFound, 'completed');

      logger.info(`Monitoring run ${runId} completed: ${totalChecked} checks, ${totalErrorsFound} errors found (${totalUnreachable} unreachable, ${totalTimeouts} timeouts)`);
      return runId;
    } catch (error) {
      logger.error('Monitoring run failed:', error);
      await this.completeRun(runId, 0, 0, 'failed');
      throw error;
    }
  }

  private async updateRunProgress(
    runId: number,
    totalChecked: number,
    totalExpected: number,
    currentUrl: string | null,
    currentBrowser: string | null
  ): Promise<void> {
    await execute(
      `UPDATE monitoring_runs
       SET total_urls_checked = ?, total_checks_expected = ?, current_url = ?, current_browser = ?
       WHERE run_id = ?`,
      [totalChecked, totalExpected, currentUrl, currentBrowser, runId]
    );
  }

  private async updateRunProgressWithErrors(
    runId: number,
    totalChecked: number,
    totalExpected: number,
    totalErrors: number,
    currentUrl: string | null,
    currentBrowser: string | null
  ): Promise<void> {
    await execute(
      `UPDATE monitoring_runs
       SET total_urls_checked = ?, total_checks_expected = ?, total_errors_found = ?, current_url = ?, current_browser = ?
       WHERE run_id = ?`,
      [totalChecked, totalExpected, totalErrors, currentUrl, currentBrowser, runId]
    );
  }

  private async performCheck(
    runId: number,
    url: MonitoredUrl,
    browserConfig: BrowserConfiguration
  ): Promise<CheckResult> {
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

      // If error detected (from cookie), create failure record
      if (result.errorDetected && result.errorData) {
        await this.recordFailure(
          checkId,
          url.url_id,
          url.client_id,
          result.errorData,
          result.screenshotPath
        );
        return {
          hasError: true,
          isUnreachable: false,
          checkStatus: result.checkStatus,
        };
      }

      // Check if site was unreachable or had other errors
      const isUnreachable = result.checkStatus === 'unreachable';
      const hasError = !result.success || result.checkStatus === 'error' || result.checkStatus === 'timeout' || isUnreachable;

      return {
        hasError,
        isUnreachable,
        checkStatus: result.checkStatus,
      };
    } catch (error) {
      logger.error(`Check failed for ${url.url}:`, error);

      // Determine if this is an unreachable error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isUnreachable = this.isUnreachableError(errorMessage);
      const checkStatus = isUnreachable ? 'unreachable' : 'error';

      // Record failed check
      await insert(
        `INSERT INTO url_checks
        (run_id, url_id, config_id, check_status, error_message)
        VALUES (?, ?, ?, ?, ?)`,
        [
          runId,
          url.url_id,
          browserConfig.config_id,
          checkStatus,
          errorMessage,
        ]
      );

      return {
        hasError: true,
        isUnreachable,
        checkStatus,
      };
    }
  }

  private isUnreachableError(errorMessage: string): boolean {
    const unreachablePatterns = [
      'net::ERR_NAME_NOT_RESOLVED',
      'net::ERR_CONNECTION_REFUSED',
      'net::ERR_CONNECTION_RESET',
      'net::ERR_CONNECTION_CLOSED',
      'net::ERR_CONNECTION_TIMED_OUT',
      'net::ERR_INTERNET_DISCONNECTED',
      'net::ERR_ADDRESS_UNREACHABLE',
      'ECONNREFUSED',
      'ECONNRESET',
      'ENOTFOUND',
      'EHOSTUNREACH',
    ];
    return unreachablePatterns.some(pattern => errorMessage.includes(pattern));
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
        const parsed = new Date(errorData.timestamp);
        // Validate the parsed date is valid
        if (!isNaN(parsed.getTime())) {
          timestampFromCookie = parsed;
        }
      } catch {
        // Invalid timestamp, leave as null
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
    // Clear current URL/browser when completing
    await execute(
      `UPDATE monitoring_runs
       SET completed_at = NOW(), total_urls_checked = ?, total_errors_found = ?, status = ?, current_url = NULL, current_browser = NULL
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

  async getRunningRun(): Promise<MonitoringRun | null> {
    return await queryOne<MonitoringRun>(
      `SELECT * FROM monitoring_runs WHERE status = 'running' ORDER BY started_at DESC LIMIT 1`
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

  async cancelRun(runId: number): Promise<boolean> {
    const run = await this.getRunById(runId);

    if (!run) {
      return false;
    }

    if (run.status !== 'running') {
      return false;
    }

    // Mark the run as cancelled
    await execute(
      `UPDATE monitoring_runs
       SET completed_at = NOW(), status = 'cancelled', current_url = NULL, current_browser = NULL
       WHERE run_id = ? AND status = 'running'`,
      [runId]
    );

    logger.info(`Monitoring run ${runId} cancelled`);
    return true;
  }

  async cancelRunningRun(): Promise<{ cancelled: boolean; runId: number | null }> {
    const runningRun = await this.getRunningRun();

    if (!runningRun) {
      return { cancelled: false, runId: null };
    }

    const success = await this.cancelRun(runningRun.run_id);
    return { cancelled: success, runId: runningRun.run_id };
  }
}

export const monitoringService = new MonitoringService();
