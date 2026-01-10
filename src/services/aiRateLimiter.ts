/**
 * AI API Rate Limiter - Enforces per-user API call limits
 *
 * Implements multi-tier rate limiting:
 * - Per-request rate limiting (30s between calls)
 * - Hourly limits (10 calls/hour)
 * - Daily limits (50 calls/day)
 * - Tracks usage in localStorage for persistence
 */

interface RateLimitEntry {
  timestamp: number;
  type: 'progress' | 'insights' | 'recommendations';
}

interface RateLimitState {
  userId: string;
  calls: RateLimitEntry[];
  lastReset: number;
}

const STORAGE_KEY = 'fitTrackAI_apiRateLimit';
const HOURLY_LIMIT = 10; // 10 calls per hour
const DAILY_LIMIT = 20; // 20 calls per day
const MIN_CALL_INTERVAL = 30000; // 30 seconds between calls
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

class AIRateLimiter {
  private state: RateLimitState | null = null;

  /**
   * Initialize or load rate limit state for a user
   */
  private ensureState(userId: string): RateLimitState {
    if (this.state && this.state.userId === userId) {
      return this.state;
    }

    // Try to load from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as RateLimitState;
        if (parsed.userId === userId) {
          // Filter out expired entries (older than 24 hours)
          const now = Date.now();
          parsed.calls = parsed.calls.filter(
            (call) => now - call.timestamp < DAY_MS
          );
          this.state = parsed;
          this.saveState();
          return this.state;
        }
      }
    } catch (error) {
      console.warn('[AIRateLimiter] Failed to load state from localStorage:', error);
    }

    // Create new state
    this.state = {
      userId,
      calls: [],
      lastReset: Date.now(),
    };
    this.saveState();
    return this.state;
  }

  /**
   * Save state to localStorage
   */
  private saveState(): void {
    if (!this.state) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.warn('[AIRateLimiter] Failed to save state to localStorage:', error);
    }
  }

  /**
   * Check if a call is allowed based on rate limits
   * Returns { allowed: boolean, reason?: string, retryAfter?: number }
   */
  canMakeCall(
    userId: string,
    _type: 'progress' | 'insights' | 'recommendations' // Type recorded but rate limit applies globally
  ): { allowed: boolean; reason?: string; retryAfter?: number } {
    const state = this.ensureState(userId);
    const now = Date.now();

    // Check minimum interval (30s between any calls)
    if (state.calls.length > 0) {
      const lastCall = state.calls[state.calls.length - 1];
      const timeSinceLastCall = now - lastCall.timestamp;
      if (timeSinceLastCall < MIN_CALL_INTERVAL) {
        return {
          allowed: false,
          reason: 'Rate limit: Please wait between API calls',
          retryAfter: MIN_CALL_INTERVAL - timeSinceLastCall,
        };
      }
    }

    // Check hourly limit
    const lastHourCalls = state.calls.filter(
      (call) => now - call.timestamp < HOUR_MS
    );
    if (lastHourCalls.length >= HOURLY_LIMIT) {
      const oldestCallInHour = lastHourCalls[0];
      const retryAfter = HOUR_MS - (now - oldestCallInHour.timestamp);
      return {
        allowed: false,
        reason: `Hourly limit reached (${HOURLY_LIMIT} calls/hour)`,
        retryAfter,
      };
    }

    // Check daily limit
    const lastDayCalls = state.calls.filter(
      (call) => now - call.timestamp < DAY_MS
    );
    if (lastDayCalls.length >= DAILY_LIMIT) {
      const oldestCallInDay = lastDayCalls[0];
      const retryAfter = DAY_MS - (now - oldestCallInDay.timestamp);
      return {
        allowed: false,
        reason: `Daily limit reached (${DAILY_LIMIT} calls/day)`,
        retryAfter,
      };
    }

    return { allowed: true };
  }

  /**
   * Record a successful API call
   */
  recordCall(
    userId: string,
    type: 'progress' | 'insights' | 'recommendations'
  ): void {
    const state = this.ensureState(userId);
    const now = Date.now();

    // Add new call
    state.calls.push({
      timestamp: now,
      type,
    });

    // Clean up old entries (older than 24 hours)
    state.calls = state.calls.filter((call) => now - call.timestamp < DAY_MS);

    this.saveState();
  }

  /**
   * Get usage statistics for a user
   */
  getUsageStats(userId: string): {
    hourly: { used: number; limit: number; remaining: number };
    daily: { used: number; limit: number; remaining: number };
    lastCall: Date | null;
  } {
    const state = this.ensureState(userId);
    const now = Date.now();

    const lastHourCalls = state.calls.filter(
      (call) => now - call.timestamp < HOUR_MS
    );
    const lastDayCalls = state.calls.filter(
      (call) => now - call.timestamp < DAY_MS
    );

    const lastCall = state.calls.length > 0
      ? new Date(state.calls[state.calls.length - 1].timestamp)
      : null;

    return {
      hourly: {
        used: lastHourCalls.length,
        limit: HOURLY_LIMIT,
        remaining: Math.max(0, HOURLY_LIMIT - lastHourCalls.length),
      },
      daily: {
        used: lastDayCalls.length,
        limit: DAILY_LIMIT,
        remaining: Math.max(0, DAILY_LIMIT - lastDayCalls.length),
      },
      lastCall,
    };
  }

  /**
   * Reset rate limits for a user (admin/debug only)
   */
  resetLimits(userId: string): void {
    this.state = {
      userId,
      calls: [],
      lastReset: Date.now(),
    };
    this.saveState();
  }

  /**
   * Format retry time in human-readable format
   */
  formatRetryTime(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);

    if (minutes > 60) {
      const hours = Math.floor(minutes / 60);
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

export const aiRateLimiter = new AIRateLimiter();
