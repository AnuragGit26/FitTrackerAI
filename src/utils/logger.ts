/**
 * Centralized logging utility
 * Replaces console.log statements with environment-aware logging
 */

type LogLevel = 'log' | 'warn' | 'error' | 'info' | 'debug';

interface LogContext {
    [key: string]: unknown;
}

class Logger {
    private isProduction = import.meta.env.PROD;

  /**
   * Log informational messages
   */
  log(message: string, ...args: unknown[]): void {
    if (!this.isProduction) {
      console.log(message, ...args);
    }
  }

  /**
   * Log debug messages
   */
  debug(message: string, ...args: unknown[]): void {
    if (!this.isProduction) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Log info messages
   */
  info(message: string, ...args: unknown[]): void {
    if (!this.isProduction) {
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
   * Log service worker messages (disabled - no-op)
   */
  sw(_message: string, ..._args: unknown[]): void {
    // Debug logging disabled
  }

  /**
   * Send error to tracking service (e.g., Sentry, Vercel Logs)
   */
  private sendToErrorTracking(
    level: LogLevel,
    message: string,
    data: unknown
  ): void {
    try {
      // Use the Vercel API endpoint
      const vercelApiUrl = '/api/logs/error';
      
      // Extract stack trace if available
      let errorStack: string | undefined;
      if (typeof data === 'object' && data !== null) {
        if ('stack' in data) {
          errorStack = (data as { stack: string }).stack;
        } else if ('error' in data && typeof (data as any).error === 'string') {
           // sometimes we pass { error: error.message }
        }
      }

      const payload = {
        // Default to 'system' - the API handles optional userId
        userId: 'system', 
        errorType: level === 'error' ? 'application_error' : 'application_warning',
        errorMessage: message,
        errorStack,
        context: typeof data === 'object' ? data as Record<string, unknown> : { data },
        severity: level === 'warn' ? 'warning' : level,
        timestamp: new Date().toISOString(),
        operation: 'log'
      };

      // Use fetch to send the log
      // Use keepalive: true to ensure it sends even if the page unloads
      fetch(vercelApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(err => {
        // Silent failure in production to avoid infinite loops
        if (!this.isProduction) {
          console.error('Failed to send log to Vercel:', err);
        }
      });
    } catch (e) {
      // Prevent logger from causing crashes
      if (!this.isProduction) {
        console.error('Logger internal error:', e);
      }
    }
  }
}

export const logger = new Logger();

