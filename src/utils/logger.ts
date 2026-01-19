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
      // eslint-disable-next-line no-console
      console.log(message, ...args);
    }
  }

  /**
   * Log debug messages
   */
  debug(message: string, ...args: unknown[]): void {
    if (!this.isProduction) {
      // eslint-disable-next-line no-console
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Log info messages
   */
  info(message: string, ...args: unknown[]): void {
    if (!this.isProduction) {
      // eslint-disable-next-line no-console
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * Log warning messages (always logged)
   * Supports: warn(message), warn(message, error), warn(message, context), warn(message, error, context)
   */
  warn(message: string, errorOrContext?: Error | unknown | LogContext, context?: LogContext): void {
    // Detect if second arg is context object (plain object) or error
    let error: Error | unknown | undefined;
    let logContext: LogContext | undefined;
    
    if (errorOrContext === undefined) {
      // warn(message) - no args
      logContext = context;
    } else if (errorOrContext instanceof Error) {
      // warn(message, error) or warn(message, error, context)
      error = errorOrContext;
      logContext = context;
    } else if (typeof errorOrContext === 'object' && errorOrContext !== null && !Array.isArray(errorOrContext)) {
      // Check if it looks like a context object (has string keys) vs error-like
      const keys = Object.keys(errorOrContext);
      const hasErrorLikeKeys = keys.some(k => k === 'error' || k === 'stack' || k === 'message');
      const isPlainContext = keys.length > 0 && !hasErrorLikeKeys;
      
      if (isPlainContext) {
        // warn(message, context) - second arg is context
        logContext = errorOrContext as LogContext;
      } else {
        // warn(message, error) - treat as error
        error = errorOrContext;
        logContext = context;
      }
    } else {
      // warn(message, error) - primitive or other type
      error = errorOrContext;
      logContext = context;
    }
    
    const errorObj = error instanceof Error ? error : error ? new Error(String(error)) : undefined;
    
    if (errorObj) {
      console.warn(`[WARN] ${message}`, errorObj, logContext || '');
    } else {
      console.warn(`[WARN] ${message}`, logContext || '');
    }
    
    // In production, send to error tracking service
    if (this.isProduction) {
      const trackingData: Record<string, unknown> = {
        ...(logContext || {}),
      };
      
      if (errorObj) {
        trackingData.error = errorObj.message;
        trackingData.stack = errorObj.stack;
      } else if (error !== undefined) {
        trackingData.error = String(error);
      }
      
      this.sendToErrorTracking('warn', message, trackingData);
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
    // Use IIFE to handle async user ID retrieval without blocking
    (async () => {
      try {
        // Use the Vercel API endpoint
        const vercelApiUrl = '/api/logs/error';
        
        // Extract stack trace if available
        let errorStack: string | undefined;
        if (typeof data === 'object' && data !== null) {
          if ('stack' in data) {
            errorStack = (data as { stack: string }).stack;
          } else if ('error' in data && typeof (data as Record<string, unknown>).error === 'string') {
             // sometimes we pass { error: error.message }
          }
        }

        // Get actual user ID from userContextManager (lazy import to avoid circular dependency)
        let userId: string | null = null;
        try {
          const { userContextManager } = await import('@/services/userContextManager');
          userId = userContextManager.getUserId();
        } catch (e) {
          // If userContextManager is not available, fall back to null
          // This can happen during initialization or if there's a circular dependency issue
        }

        const payload = {
          userId: userId || 'anonymous',
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
    })();
  }
}

export const logger = new Logger();

