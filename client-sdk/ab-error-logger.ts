/**
 * AB Test Error Logger - Client-Side SDK (TypeScript)
 *
 * Lightweight module to log A/B test errors via cookies.
 * Uses compact format to minimize cookie size (~100-200 bytes vs ~300-500 bytes).
 */

// Error type codes
export const ERROR_TYPES = {
  JS: 'javascript_error',
  NW: 'network_error',
  TO: 'timeout',
  RN: 'render_error',
  AP: 'api_error',
  VL: 'validation_error',
  AU: 'auth_error',
  CF: 'config_error',
  UK: 'unknown',
} as const;

// Browser codes
export const BROWSERS = {
  CH: 'chrome',
  FF: 'firefox',
  SF: 'safari',
  ED: 'edge',
  OP: 'opera',
  BR: 'brave',
  UK: 'unknown',
} as const;

export type ErrorTypeCode = keyof typeof ERROR_TYPES;
export type BrowserCode = keyof typeof BROWSERS;

// Compact cookie format
export interface ABErrorCompact {
  t: string;   // test_id
  v: string;   // variant
  e: string;   // error_type code
  m: string;   // message
  b: string;   // browser code
  ts: number;  // timestamp (unix seconds)
}

export interface LogErrorParams {
  testId: string;
  variant: string;
  errorType: ErrorTypeCode;
  message: string;
  browser?: BrowserCode;
}

export interface ABErrorLoggerOptions {
  maxMessageLength?: number;
  cookieExpiry?: number;
  cookiePath?: string;
  autoDetectBrowser?: boolean;
}

/**
 * Detect browser automatically
 */
export function detectBrowser(): BrowserCode {
  if (typeof navigator === 'undefined') return 'UK';

  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('edg/')) return 'ED';
  if (ua.includes('brave')) return 'BR';
  if (ua.includes('opr/') || ua.includes('opera')) return 'OP';
  if (ua.includes('chrome')) return 'CH';
  if (ua.includes('safari')) return 'SF';
  if (ua.includes('firefox')) return 'FF';
  return 'UK';
}

/**
 * ABErrorLogger class
 */
export class ABErrorLogger {
  private cookieName: string;
  private maxMessageLength: number;
  private cookieExpiry: number;
  private cookiePath: string;
  private autoDetectBrowser: boolean;

  constructor(cookieName = 'ab_test_error', options: ABErrorLoggerOptions = {}) {
    this.cookieName = cookieName;
    this.maxMessageLength = options.maxMessageLength ?? 200;
    this.cookieExpiry = options.cookieExpiry ?? 3600; // 1 hour default
    this.cookiePath = options.cookiePath ?? '/';
    this.autoDetectBrowser = options.autoDetectBrowser !== false;
  }

  /**
   * Log an error using compact cookie format
   */
  logError({ testId, variant, errorType, message, browser }: LogErrorParams): boolean {
    if (!testId || !variant || !errorType || !message) {
      console.warn('ABErrorLogger: Missing required fields');
      return false;
    }

    // Validate error type
    let validErrorType = errorType;
    if (!ERROR_TYPES[errorType]) {
      console.warn(`ABErrorLogger: Unknown error type "${errorType}", using UK`);
      validErrorType = 'UK';
    }

    // Auto-detect browser if not provided
    let validBrowser: BrowserCode = browser ?? (this.autoDetectBrowser ? detectBrowser() : 'UK');

    // Validate browser code
    if (!BROWSERS[validBrowser]) {
      console.warn(`ABErrorLogger: Unknown browser "${validBrowser}", using UK`);
      validBrowser = 'UK';
    }

    // Truncate message if too long
    let truncatedMessage = message;
    if (message.length > this.maxMessageLength) {
      truncatedMessage = message.substring(0, this.maxMessageLength - 3) + '...';
    }

    // Create compact cookie data
    const cookieData: ABErrorCompact = {
      t: testId,
      v: variant,
      e: validErrorType,
      m: truncatedMessage,
      b: validBrowser,
      ts: Math.floor(Date.now() / 1000),
    };

    // Encode and set cookie
    const cookieValue = encodeURIComponent(JSON.stringify(cookieData));
    const expires = new Date(Date.now() + this.cookieExpiry * 1000).toUTCString();

    if (typeof document !== 'undefined') {
      document.cookie = `${this.cookieName}=${cookieValue}; expires=${expires}; path=${this.cookiePath}`;
    }

    console.debug('ABErrorLogger: Error logged', cookieData);
    return true;
  }

  /** Log a JavaScript error */
  logJSError(testId: string, variant: string, message: string): boolean {
    return this.logError({ testId, variant, errorType: 'JS', message });
  }

  /** Log a network error */
  logNetworkError(testId: string, variant: string, message: string): boolean {
    return this.logError({ testId, variant, errorType: 'NW', message });
  }

  /** Log an API error */
  logAPIError(testId: string, variant: string, message: string): boolean {
    return this.logError({ testId, variant, errorType: 'AP', message });
  }

  /** Log a render error */
  logRenderError(testId: string, variant: string, message: string): boolean {
    return this.logError({ testId, variant, errorType: 'RN', message });
  }

  /** Log a timeout error */
  logTimeoutError(testId: string, variant: string, message: string): boolean {
    return this.logError({ testId, variant, errorType: 'TO', message });
  }

  /** Clear the error cookie */
  clearError(): void {
    if (typeof document !== 'undefined') {
      document.cookie = `${this.cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${this.cookiePath}`;
    }
  }

  /** Check if an error is currently logged */
  hasError(): boolean {
    if (typeof document === 'undefined') return false;
    return document.cookie.includes(`${this.cookieName}=`);
  }

  /** Get current error data (if any) */
  getError(): ABErrorCompact | null {
    if (typeof document === 'undefined') return null;

    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === this.cookieName && value) {
        try {
          return JSON.parse(decodeURIComponent(value));
        } catch {
          return null;
        }
      }
    }
    return null;
  }
}

// Default export
export default ABErrorLogger;
