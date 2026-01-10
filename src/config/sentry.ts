/**
 * Sentry Configuration
 * Provides centralized error tracking and performance monitoring
 */

import * as Sentry from '@sentry/react';

interface SentryConfig {
  dsn?: string;
  environment: string;
  release?: string;
  enabled: boolean;
}

/**
 * Get Sentry configuration from environment variables
 */
function getSentryConfig(): SentryConfig {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.MODE || 'development';
  const release = import.meta.env.VITE_APP_VERSION;

  // Only enable Sentry if DSN is provided and not in development
  const enabled = Boolean(dsn) && environment !== 'development';

  return {
    dsn,
    environment,
    release,
    enabled,
  };
}

/**
 * Initialize Sentry error tracking
 * Call this once at app startup in main.tsx
 */
export function initializeSentry(): void {
  const config = getSentryConfig();

  if (!config.enabled) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('[Sentry] Disabled in development or no DSN provided');
    }
    return;
  }

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,

    // Performance monitoring - 10% sample rate
    tracesSampleRate: 0.1,

    // Filter out known errors
    beforeSend(event) {
      // Filter out Auth0 errors (handled separately)
      if (event.exception?.values?.[0]?.value?.includes('auth0')) {
        return null;
      }

      // Filter out network errors (often temporary)
      if (event.exception?.values?.[0]?.value?.includes('NetworkError')) {
        return null;
      }

      // Filter out quota errors (handled by app)
      if (event.exception?.values?.[0]?.value?.includes('QuotaExceeded')) {
        return null;
      }

      return event;
    },

    // Don't send too many breadcrumbs
    maxBreadcrumbs: config.environment === 'production' ? 50 : 100,

    // Enable debug mode in staging
    debug: config.environment === 'staging',
  });

  // eslint-disable-next-line no-console
  console.log(`[Sentry] Initialized (${config.environment})`);
}

/**
 * Set user context for Sentry
 * Call this after user authentication
 */
export function setSentryUser(user: {
  id: string;
  email?: string;
  username?: string;
}): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
}

/**
 * Manually capture an error
 */
export function captureError(error: Error, context?: Record<string, unknown>): void {
  if (context) {
    Sentry.setContext('error_context', context);
  }
  Sentry.captureException(error);
}

/**
 * Capture a message (for non-error events)
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(breadcrumb: {
  message: string;
  category?: string;
  level?: 'info' | 'warning' | 'error';
  data?: Record<string, unknown>;
}): void {
  Sentry.addBreadcrumb({
    message: breadcrumb.message,
    category: breadcrumb.category || 'custom',
    level: breadcrumb.level || 'info',
    data: breadcrumb.data,
  });
}

// Re-export Sentry for direct use if needed
export { Sentry };
