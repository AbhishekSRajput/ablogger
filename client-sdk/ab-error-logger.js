/**
 * AB Test Error Logger - Client-Side SDK
 *
 * Lightweight script to log A/B test errors via cookies.
 * Uses compact format to minimize cookie size (~100-200 bytes vs ~300-500 bytes).
 *
 * Usage:
 *   // Initialize
 *   const logger = new ABErrorLogger('ab_test_error');
 *
 *   // Log an error
 *   logger.logError({
 *     testId: 'homepage_hero_v2',
 *     variant: 'B',
 *     errorType: 'JS',        // Use short codes: JS, NW, TO, RN, AP, VL, AU, CF, UK
 *     message: 'Button click handler failed',
 *     browser: 'CH'           // Use short codes: CH, FF, SF, ED, OP, BR, UK
 *   });
 */

(function(global) {
  'use strict';

  // Error type codes
  const ERROR_TYPES = {
    JS: 'javascript_error',
    NW: 'network_error',
    TO: 'timeout',
    RN: 'render_error',
    AP: 'api_error',
    VL: 'validation_error',
    AU: 'auth_error',
    CF: 'config_error',
    UK: 'unknown'
  };

  // Browser codes
  const BROWSERS = {
    CH: 'chrome',
    FF: 'firefox',
    SF: 'safari',
    ED: 'edge',
    OP: 'opera',
    BR: 'brave',
    UK: 'unknown'
  };

  /**
   * Detect browser automatically
   */
  function detectBrowser() {
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
  class ABErrorLogger {
    constructor(cookieName = 'ab_test_error', options = {}) {
      this.cookieName = cookieName;
      this.maxMessageLength = options.maxMessageLength || 200;
      this.cookieExpiry = options.cookieExpiry || 3600; // 1 hour default
      this.cookiePath = options.cookiePath || '/';
      this.autoDetectBrowser = options.autoDetectBrowser !== false;
    }

    /**
     * Log an error using compact cookie format
     *
     * @param {Object} error - Error details
     * @param {string} error.testId - A/B test identifier
     * @param {string} error.variant - Test variant (A, B, control, etc.)
     * @param {string} error.errorType - Error type code (JS, NW, TO, RN, AP, VL, AU, CF, UK)
     * @param {string} error.message - Error message
     * @param {string} [error.browser] - Browser code (auto-detected if not provided)
     */
    logError({ testId, variant, errorType, message, browser }) {
      if (!testId || !variant || !errorType || !message) {
        console.warn('ABErrorLogger: Missing required fields');
        return false;
      }

      // Validate error type
      if (!ERROR_TYPES[errorType]) {
        console.warn(`ABErrorLogger: Unknown error type "${errorType}", using UK`);
        errorType = 'UK';
      }

      // Auto-detect browser if not provided
      if (!browser && this.autoDetectBrowser) {
        browser = detectBrowser();
      } else if (!browser) {
        browser = 'UK';
      }

      // Validate browser code
      if (!BROWSERS[browser]) {
        console.warn(`ABErrorLogger: Unknown browser "${browser}", using UK`);
        browser = 'UK';
      }

      // Truncate message if too long
      let truncatedMessage = message;
      if (message.length > this.maxMessageLength) {
        truncatedMessage = message.substring(0, this.maxMessageLength - 3) + '...';
      }

      // Create compact cookie data
      const cookieData = {
        t: testId,                              // test_id
        v: variant,                             // variant
        e: errorType,                           // error_type code
        m: truncatedMessage,                    // message
        b: browser,                             // browser code
        ts: Math.floor(Date.now() / 1000)       // timestamp (unix seconds)
      };

      // Encode and set cookie
      const cookieValue = encodeURIComponent(JSON.stringify(cookieData));
      const expires = new Date(Date.now() + this.cookieExpiry * 1000).toUTCString();

      document.cookie = `${this.cookieName}=${cookieValue}; expires=${expires}; path=${this.cookiePath}`;

      console.debug('ABErrorLogger: Error logged', cookieData);
      return true;
    }

    /**
     * Log a JavaScript error
     */
    logJSError(testId, variant, message) {
      return this.logError({ testId, variant, errorType: 'JS', message });
    }

    /**
     * Log a network error
     */
    logNetworkError(testId, variant, message) {
      return this.logError({ testId, variant, errorType: 'NW', message });
    }

    /**
     * Log an API error
     */
    logAPIError(testId, variant, message) {
      return this.logError({ testId, variant, errorType: 'AP', message });
    }

    /**
     * Log a render error
     */
    logRenderError(testId, variant, message) {
      return this.logError({ testId, variant, errorType: 'RN', message });
    }

    /**
     * Log a timeout error
     */
    logTimeoutError(testId, variant, message) {
      return this.logError({ testId, variant, errorType: 'TO', message });
    }

    /**
     * Clear the error cookie
     */
    clearError() {
      document.cookie = `${this.cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${this.cookiePath}`;
    }

    /**
     * Check if an error is currently logged
     */
    hasError() {
      return document.cookie.includes(`${this.cookieName}=`);
    }

    /**
     * Get current error data (if any)
     */
    getError() {
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

  // Export for different module systems
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ABErrorLogger, ERROR_TYPES, BROWSERS, detectBrowser };
  } else if (typeof define === 'function' && define.amd) {
    define(function() { return { ABErrorLogger, ERROR_TYPES, BROWSERS, detectBrowser }; });
  } else {
    global.ABErrorLogger = ABErrorLogger;
    global.AB_ERROR_TYPES = ERROR_TYPES;
    global.AB_BROWSERS = BROWSERS;
  }

})(typeof window !== 'undefined' ? window : this);
