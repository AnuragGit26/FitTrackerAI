/**
 * Analytics and monitoring utilities
 * In production, integrate with services like Sentry, Google Analytics, etc.
 */

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp?: number;
}

class Analytics {
  private events: AnalyticsEvent[] = [];
  private enabled = true;

  /**
   * Track an event
   */
  track(eventName: string, properties?: Record<string, unknown>): void {
    if (!this.enabled) return;

    const event: AnalyticsEvent = {
      name: eventName,
      properties,
      timestamp: Date.now(),
    };

    this.events.push(event);

    // In development, log to console
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('[Analytics]', eventName, properties);
    }

    // In production, send to analytics service
    // Example: if (import.meta.env.PROD) {
    //   gtag('event', eventName, properties);
    //   // or
    //   analytics.track(eventName, properties);
    // }
  }

  /**
   * Track page view
   */
  pageView(path: string, title?: string): void {
    this.track('page_view', { path, title });
  }

  /**
   * Track error
   */
  trackError(error: Error, context?: Record<string, unknown>): void {
    this.track('error', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...context,
    });

    // In production, send to error tracking service
    // Example: if (import.meta.env.PROD) {
    //   Sentry.captureException(error, { extra: context });
    // }
  }

  /**
   * Track performance metric
   */
  trackPerformance(metricName: string, value: number, unit: string = 'ms'): void {
    this.track('performance', {
      metric: metricName,
      value,
      unit,
    });
  }

  /**
   * Get all tracked events (for debugging)
   */
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  /**
   * Clear events
   */
  clearEvents(): void {
    this.events = [];
  }

  /**
   * Enable/disable analytics
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

export const analytics = new Analytics();

/**
 * Performance monitoring
 */
export function measurePerformance<T>(
  name: string,
  fn: () => T
): T {
  const start = performance.now();
  try {
    const result = fn();
    const duration = performance.now() - start;
    analytics.trackPerformance(name, duration);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    analytics.trackPerformance(`${name}_error`, duration);
    throw error;
  }
}

export async function measurePerformanceAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    analytics.trackPerformance(name, duration);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    analytics.trackPerformance(`${name}_error`, duration);
    throw error;
  }
}

