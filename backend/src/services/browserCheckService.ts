import { chromium, firefox, webkit, Browser, BrowserContext, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { BrowserConfiguration, ABTestErrorCookie, BrowserCheckResult } from '../types';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export class BrowserCheckService {
  private async launchBrowser(browserConfig: BrowserConfiguration): Promise<Browser> {
    const options = {
      headless: true,
    };

    // Launch appropriate browser based on config
    if (browserConfig.browser_name.toLowerCase().includes('firefox')) {
      return await firefox.launch(options);
    } else if (browserConfig.browser_name.toLowerCase().includes('safari') ||
               browserConfig.browser_name.toLowerCase().includes('webkit')) {
      return await webkit.launch(options);
    } else {
      // Default to Chromium for Chrome and others
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

  async checkUrl(
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

      // Parse error cookie JSON
      let errorData: ABTestErrorCookie;
      try {
        errorData = JSON.parse(decodeURIComponent(errorCookie.value));
      } catch (parseError) {
        logger.error('Failed to parse error cookie:', { url, parseError });
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
      let checkStatus: 'timeout' | 'error' = 'error';
      let errorMessage = error.message;

      if (error.message && error.message.includes('Timeout')) {
        checkStatus = 'timeout';
        errorMessage = `Page load timeout after ${config.browserTimeout}ms`;
      }

      logger.error('Browser check failed:', {
        url,
        browser: browserConfig.browser_name,
        error: errorMessage,
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
