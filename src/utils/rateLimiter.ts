/**
 * Rate limiting utility to prevent API abuse
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  /**
   * Checks if a request should be allowed based on rate limit
   */
  isAllowed(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const requestTimes = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requestTimes.filter(time => now - time < config.windowMs);
    
    if (validRequests.length >= config.maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return true;
  }

  /**
   * Gets the time until the next request is allowed
   */
  getTimeUntilNextAllowed(key: string, config: RateLimitConfig): number {
    const now = Date.now();
    const requestTimes = this.requests.get(key) || [];
    const validRequests = requestTimes.filter(time => now - time < config.windowMs);
    
    if (validRequests.length < config.maxRequests) {
      return 0;
    }
    
    // Return time until oldest request expires
    const oldestRequest = Math.min(...validRequests);
    return config.windowMs - (now - oldestRequest);
  }

  /**
   * Clears rate limit data for a key
   */
  clear(key: string): void {
    this.requests.delete(key);
  }

  /**
   * Clears all rate limit data
   */
  clearAll(): void {
    this.requests.clear();
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Default rate limit configs
export const RATE_LIMITS = {
  AI_INSIGHTS: { maxRequests: 5, windowMs: 60 * 1000 }, // 10 requests per minute
  AI_RECOMMENDATIONS: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 requests per minute
  GENERAL_API: { maxRequests: 20, windowMs: 60 * 1000 }, // 30 requests per minute
} as const;

/**
 * Checks if an AI API call is allowed
 */
export function canMakeAICall(type: 'insights' | 'recommendations' | 'general' = 'general'): boolean {
  const config = type === 'insights' 
    ? RATE_LIMITS.AI_INSIGHTS 
    : type === 'recommendations'
    ? RATE_LIMITS.AI_RECOMMENDATIONS
    : RATE_LIMITS.GENERAL_API;
  
  return rateLimiter.isAllowed(`ai-${type}`, config);
}

/**
 * Gets time until next AI call is allowed
 */
export function getTimeUntilNextAICall(type: 'insights' | 'recommendations' | 'general' = 'general'): number {
  const config = type === 'insights' 
    ? RATE_LIMITS.AI_INSIGHTS 
    : type === 'recommendations'
    ? RATE_LIMITS.AI_RECOMMENDATIONS
    : RATE_LIMITS.GENERAL_API;
  
  return rateLimiter.getTimeUntilNextAllowed(`ai-${type}`, config);
}

