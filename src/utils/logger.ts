/**
 * Centralized logging utility
 * Replaces console.log statements with environment-aware logging
 */

type LogLevel = 'log' | 'warn' | 'error' | 'info' | 'debug';

interface LogContext {
    [key: string]: unknown;
}

class Logger {
    private isDevelopment = import.meta.env.DEV;
    private isProduction = import.meta.env.PROD;

  /**
   * Log informational messages (only in development)
   */
  log(message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console.log(`[LOG] ${message}`, ...args);
    }
  }

  /**
   * Log debug messages (only in development)
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Log info messages (only in development)
   */
  info(message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * Log warning messages (always logged)
   */
  warn(message: string, ...args: unknown[]): void {
    console.warn(`[WARN] ${message}`, ...args);
    
    // In production, send to error tracking service
    if (this.isProduction) {
      this.sendToErrorTracking('warn', message, args);
    }
  }

  /**
   * Log error messages (always logged)
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    console.error(`[ERROR] ${message}`, errorObj, context || '');
    
    // In production, send to error tracking service
    if (this.isProduction) {
      this.sendToErrorTracking('error', message, {
        error: errorObj.message,
        stack: errorObj.stack,
        ...context,
      });
    }
  }

  /**
   * Log service worker messages (only in development)
   */
  sw(message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console.log(`[SW] ${message}`, ...args);
    }
  }

  /**
   * Send error to tracking service (e.g., Sentry)
   * This is a placeholder - integrate with your error tracking service
   */
  private sendToErrorTracking(
    _level: LogLevel,
    _message: string,
    _data: unknown
  ): void {
    // TODO: Integrate with error tracking service (e.g., Sentry)
    // Example:
    // if (level === 'error' && typeof window !== 'undefined' && window.Sentry) {
    //   window.Sentry.captureException(new Error(message), { extra: data });
    // }
  }
}

export const logger = new Logger();

