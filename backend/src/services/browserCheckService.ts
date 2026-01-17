import { chromium, firefox, webkit, Browser, BrowserContext, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import {
  BrowserConfiguration,
  ABTestErrorCookie,
  ABTestErrorCookieCompact,
  BrowserCheckResult,
  ERROR_TYPE_CODES,
  BROWSER_CODES,
} from '../types';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export class BrowserCheckService {
  /**
   * Truncate error message to prevent exceeding database column limits
   */
  private truncateErrorMessage(message: string): string {
    if (message.length <= config.maxErrorMessageLength) {
      return message;
    }
    const truncated = message.slice(0, config.maxErrorMessageLength - 3);
    return `${truncated}...`;
  }

  /**
   * Check if cookie data is in compact format
   */
  private isCompactFormat(data: any): data is ABTestErrorCookieCompact {
    return data && typeof data.t === 'string' && typeof data.ts === 'number';
  }

  /**
   * Decode compact cookie format to full format
   */
  private decodeCompactCookie(compact: ABTestErrorCookieCompact): ABTestErrorCookie {
    return {
      test_id: compact.t,
      variant: compact.v,
      error_type: ERROR_TYPE_CODES[compact.e] || compact.e,
      error_message: compact.m,
      browser: BROWSER_CODES[compact.b] || compact.b,
      timestamp: new Date(compact.ts * 1000).toISOString(),
    };
  }

  /**
   * Parse cookie value - supports both compact and full formats
   */
  private parseCookieValue(cookieValue: string): ABTestErrorCookie | null {
    try {
      const decoded = decodeURIComponent(cookieValue);
      const data = JSON.parse(decoded);

      // Check if compact format and decode
      if (this.isCompactFormat(data)) {
        logger.debug('Detected compact cookie format, decoding...');
        return this.decodeCompactCookie(data);
      }

      // Full format - return as-is
      return data as ABTestErrorCookie;
    } catch (error) {
      logger.error('Failed to parse cookie value:', error);
      return null;
    }
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if an error is retryable (network/timeout issues)
   */
  private isRetryableError(error: any): boolean {
    const retryablePatterns = [
      'Timeout',
      'net::ERR_',
      'ECONNREFUSED',
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'socket hang up',
      'Navigation failed',
      'Target closed',
      'Browser closed',
    ];
    const errorMessage = error?.message || '';
    return retryablePatterns.some(pattern => errorMessage.includes(pattern));
  }

  /**
   * Check if an error indicates the site is unreachable
   */
  private isUnreachableError(error: any): boolean {
    const unreachablePatterns = [
      'net::ERR_NAME_NOT_RESOLVED',
      'net::ERR_CONNECTION_REFUSED',
      'net::ERR_CONNECTION_RESET',
      'net::ERR_CONNECTION_CLOSED',
      'net::ERR_CONNECTION_TIMED_OUT',
      'net::ERR_INTERNET_DISCONNECTED',
      'net::ERR_ADDRESS_UNREACHABLE',
      'net::ERR_NETWORK_CHANGED',
      'net::ERR_SSL_PROTOCOL_ERROR',
      'net::ERR_CERT_',
      'net::ERR_EMPTY_RESPONSE',
      'net::ERR_FAILED',
      'ECONNREFUSED',
      'ECONNRESET',
      'ENOTFOUND',
      'EHOSTUNREACH',
      'EAI_AGAIN',
      'ENETUNREACH',
      'DNS resolution failed',
      'getaddrinfo',
    ];
    const errorMessage = error?.message || '';
    return unreachablePatterns.some(pattern => errorMessage.includes(pattern));
  }

  private async launchBrowser(browserConfig: BrowserConfiguration): Promise<Browser> {
    const options = {
      headless: true,
    };

    const browserName = browserConfig.browser_name.toLowerCase();

    // Launch appropriate browser based on config
    if (browserName.includes('firefox')) {
      return await firefox.launch(options);
    } else if (browserName.includes('safari') || browserName.includes('webkit')) {
      return await webkit.launch(options);
    } else if (browserName.includes('edge') || browserName.includes('chrome') || browserName.includes('chromium')) {
      // Edge, Chrome, and Chromium all use the Chromium engine
      return await chromium.launch(options);
    } else {
      // Default to Chromium for any other browser
      logger.warn(`Unknown browser "${browserConfig.browser_name}", defaulting to Chromium`);
      return await chromium.launch(options);
    }
  }

  private async createContext(
    browser: Browser,
    browserConfig: BrowserConfiguration
  ): Promise<BrowserContext> {
    const contextOptions: any = {
      userAgent: browserConfig.user_agent || undefined,
      viewport: {
        width: browserConfig.viewport_width || 1920,
        height: browserConfig.viewport_height || 1080,
      },
    };

    // Set device emulation for mobile
    if (browserConfig.device_type === 'mobile') {
      contextOptions.isMobile = true;
      contextOptions.hasTouch = true;
    }

    return await browser.newContext(contextOptions);
  }

  /**
   * Check URL with retry logic for handling flaky network conditions
   */
  async checkUrl(
    url: string,
    browserConfig: BrowserConfiguration
  ): Promise<BrowserCheckResult> {
    let lastError: any = null;

    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        const result = await this.performSingleCheck(url, browserConfig);

        // If successful or non-retryable error, return immediately
        if (result.success || !this.isRetryableError({ message: result.errorMessage })) {
          return result;
        }

        // Retryable failure - log and potentially retry
        lastError = { message: result.errorMessage };

        if (attempt < config.maxRetries) {
          logger.warn(`Check attempt ${attempt} failed for ${url}, retrying in ${config.retryDelayMs}ms...`, {
            browser: browserConfig.browser_name,
            error: result.errorMessage,
          });
          await this.delay(config.retryDelayMs * attempt); // Exponential backoff
        }
      } catch (error: any) {
        lastError = error;

        if (!this.isRetryableError(error) || attempt === config.maxRetries) {
          // Non-retryable error or last attempt - return failure
          return this.createFailureResult(error, Date.now());
        }

        logger.warn(`Check attempt ${attempt} threw error for ${url}, retrying...`, {
          browser: browserConfig.browser_name,
          error: error.message,
        });
        await this.delay(config.retryDelayMs * attempt);
      }
    }

    // All retries exhausted
    logger.error(`All ${config.maxRetries} attempts failed for ${url}`, {
      browser: browserConfig.browser_name,
      lastError: lastError?.message,
    });
    return this.createFailureResult(lastError, Date.now());
  }

  /**
   * Create a failure result from an error
   */
  private createFailureResult(error: any, startTime: number): BrowserCheckResult {
    const pageLoadTimeMs = Date.now() - startTime;
    let checkStatus: 'timeout' | 'error' | 'unreachable' = 'error';
    let errorMessage = this.truncateErrorMessage(error?.message || 'Unknown error');

    if (error?.message?.includes('Timeout')) {
      checkStatus = 'timeout';
      errorMessage = `Page load timeout after ${config.browserTimeout}ms`;
    } else if (this.isUnreachableError(error)) {
      checkStatus = 'unreachable';
      errorMessage = this.getUnreachableErrorMessage(error);
    }

    return {
      success: false,
      pageLoadTimeMs,
      cookieFound: false,
      errorDetected: false,
      errorData: null,
      screenshotPath: null,
      checkStatus,
      errorMessage,
    };
  }

  /**
   * Get a user-friendly error message for unreachable sites
   */
  private getUnreachableErrorMessage(error: any): string {
    const errorMessage = error?.message || '';

    if (errorMessage.includes('ERR_NAME_NOT_RESOLVED') || errorMessage.includes('ENOTFOUND')) {
      return 'Site unreachable: DNS resolution failed - domain name could not be resolved';
    }
    if (errorMessage.includes('ERR_CONNECTION_REFUSED') || errorMessage.includes('ECONNREFUSED')) {
      return 'Site unreachable: Connection refused - server is not accepting connections';
    }
    if (errorMessage.includes('ERR_CONNECTION_RESET') || errorMessage.includes('ECONNRESET')) {
      return 'Site unreachable: Connection reset - server closed the connection unexpectedly';
    }
    if (errorMessage.includes('ERR_CONNECTION_TIMED_OUT') || errorMessage.includes('ETIMEDOUT')) {
      return 'Site unreachable: Connection timed out - server did not respond';
    }
    if (errorMessage.includes('ERR_SSL') || errorMessage.includes('ERR_CERT_')) {
      return 'Site unreachable: SSL/Certificate error - secure connection could not be established';
    }
    if (errorMessage.includes('ERR_INTERNET_DISCONNECTED')) {
      return 'Site unreachable: No internet connection available';
    }
    if (errorMessage.includes('ERR_ADDRESS_UNREACHABLE') || errorMessage.includes('EHOSTUNREACH')) {
      return 'Site unreachable: Host address is unreachable';
    }
    if (errorMessage.includes('ERR_EMPTY_RESPONSE')) {
      return 'Site unreachable: Server returned an empty response';
    }

    return `Site unreachable: ${this.truncateErrorMessage(errorMessage)}`;
  }

  /**
   * Perform a single browser check (called by checkUrl with retry wrapper)
   */
  private async performSingleCheck(
    url: string,
    browserConfig: BrowserConfiguration
  ): Promise<BrowserCheckResult> {
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;
    const startTime = Date.now();

    try {
      // Launch browser
      browser = await this.launchBrowser(browserConfig);
      context = await this.createContext(browser, browserConfig);
      page = await context.newPage();

      // Navigate to URL with timeout
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: config.browserTimeout,
      });

      const pageLoadTimeMs = Date.now() - startTime;

      // Extract cookies
      const cookies = await context.cookies();
      const errorCookie = cookies.find(c => c.name === config.cookieName);

      if (!errorCookie) {
        // No error cookie found
        return {
          success: true,
          pageLoadTimeMs,
          cookieFound: false,
          errorDetected: false,
          errorData: null,
          screenshotPath: null,
          checkStatus: 'success',
          errorMessage: null,
        };
      }

      // Parse error cookie (supports both compact and full formats)
      let errorData = this.parseCookieValue(errorCookie.value);

      if (!errorData) {
        logger.error('Failed to parse error cookie:', { url });
        return {
          success: true,
          pageLoadTimeMs,
          cookieFound: true,
          errorDetected: false,
          errorData: null,
          screenshotPath: null,
          checkStatus: 'success',
          errorMessage: 'Invalid cookie format',
        };
      }

      // Validate error data structure
      if (!this.isValidErrorData(errorData)) {
        logger.warn('Invalid error data structure:', { url, errorData });
        return {
          success: true,
          pageLoadTimeMs,
          cookieFound: true,
          errorDetected: false,
          errorData: null,
          screenshotPath: null,
          checkStatus: 'success',
          errorMessage: 'Invalid error data structure',
        };
      }

      // Truncate error message if too long
      errorData = {
        ...errorData,
        error_message: this.truncateErrorMessage(errorData.error_message),
      };

      // Error detected - capture screenshot
      const screenshotPath = await this.captureScreenshot(page, url, browserConfig);

      return {
        success: true,
        pageLoadTimeMs,
        cookieFound: true,
        errorDetected: true,
        errorData,
        screenshotPath,
        checkStatus: 'success',
        errorMessage: null,
      };
    } catch (error: any) {
      const pageLoadTimeMs = Date.now() - startTime;

      // Determine error type
      let checkStatus: 'timeout' | 'error' | 'unreachable' = 'error';
      let errorMessage = this.truncateErrorMessage(error.message || 'Unknown error');

      if (error.message && error.message.includes('Timeout')) {
        checkStatus = 'timeout';
        errorMessage = `Page load timeout after ${config.browserTimeout}ms`;
      } else if (this.isUnreachableError(error)) {
        checkStatus = 'unreachable';
        errorMessage = this.getUnreachableErrorMessage(error);
      }

      logger.error('Browser check failed:', {
        url,
        browser: browserConfig.browser_name,
        error: errorMessage,
        checkStatus,
      });

      return {
        success: false,
        pageLoadTimeMs,
        cookieFound: false,
        errorDetected: false,
        errorData: null,
        screenshotPath: null,
        checkStatus,
        errorMessage,
      };
    } finally {
      // Cleanup
      try {
        if (page) await page.close();
        if (context) await context.close();
        if (browser) await browser.close();
      } catch (cleanupError) {
        logger.error('Browser cleanup error:', cleanupError);
      }
    }
  }

  private isValidErrorData(data: any): data is ABTestErrorCookie {
    return (
      data &&
      typeof data.test_id === 'string' &&
      typeof data.variant === 'string' &&
      typeof data.error_type === 'string' &&
      typeof data.error_message === 'string' &&
      typeof data.browser === 'string' &&
      typeof data.timestamp === 'string'
    );
  }

  private async captureScreenshot(
    page: Page,
    url: string,
    browserConfig: BrowserConfiguration
  ): Promise<string> {
    try {
      // Ensure screenshot directory exists
      if (!fs.existsSync(config.screenshotDir)) {
        fs.mkdirSync(config.screenshotDir, { recursive: true });
      }

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const urlHash = Buffer.from(url).toString('base64').slice(0, 10).replace(/[/+=]/g, '');
      const browserType = browserConfig.device_type;
      const filename = `failure_${urlHash}_${browserType}_${timestamp}.png`;
      const filepath = path.join(config.screenshotDir, filename);

      // Capture screenshot
      await page.screenshot({
        path: filepath,
        fullPage: true,
      });

      logger.info('Screenshot captured:', { filepath });
      return filepath;
    } catch (error) {
      logger.error('Screenshot capture failed:', error);
      return '';
    }
  }
}

export const browserCheckService = new BrowserCheckService();
