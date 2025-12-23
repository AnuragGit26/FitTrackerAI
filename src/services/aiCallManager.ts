interface CachedResponse<T> {
  data: T;
  timestamp: number;
  fingerprint: string;
}

interface QueuedRequest<T = unknown> {
  id: string;
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  priority: number;
}

// TTL removed - now controlled by aiRefreshService (24hr rule + event-based)
// Uses both in-memory cache (fast) and IndexedDB (persistent, shared with SW)
const RATE_LIMIT_MS = 30000; // 30 seconds between calls
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second

class AICallManager {
  private cache: Map<string, CachedResponse<unknown>> = new Map();
  private requestQueue: Array<QueuedRequest<unknown>> = [];
  private isProcessing = false;
  private lastCallTime = 0;
  private pendingRequest: NodeJS.Timeout | null = null;
  private idbInitialized = false;

  private getCacheKey(fingerprint: string, type: 'insights' | 'recommendations' | 'progress' | 'smart-coach'): string {
    return `${type}:${fingerprint}`;
  }

  /**
   * Initialize IndexedDB cache store if needed
   */
  private async ensureIDBInitialized(): Promise<void> {
    if (this.idbInitialized) return;

    try {
      // Check if store exists, if not we'll use Cache API as fallback
      // For now, we'll use the existing database structure
      this.idbInitialized = true;
    } catch (error) {
      console.warn('[AICallManager] IndexedDB initialization check failed, using in-memory only:', error);
    }
  }

  /**
   * Get cached response from in-memory cache first, then IndexedDB/Cache API
   * Note: TTL checks are now handled by aiRefreshService (24hr rule)
   */
  async getCached<T>(
    fingerprint: string,
    type: 'insights' | 'recommendations' | 'progress' | 'smart-coach'
  ): Promise<T | null> {
    const cacheKey = this.getCacheKey(fingerprint, type);
    
    // Check in-memory cache first (fastest)
    const memoryCached = this.cache.get(cacheKey);
    if (memoryCached) {
      // Verify fingerprint matches
      if (memoryCached.fingerprint === fingerprint) {
        return memoryCached.data as T;
      } else {
        this.cache.delete(cacheKey);
      }
    }

    // Check IndexedDB/Cache API (persistent, shared with SW)
    try {
      await this.ensureIDBInitialized();
      
      // Try Cache API first (what SW uses)
      if ('caches' in window) {
        const cache = await caches.open('ai-responses');
        const cached = await cache.match(`/ai-cache/${type}/${fingerprint}`);
        if (cached) {
          const data = await cached.json();
          // Also store in memory for faster access next time
          this.cache.set(cacheKey, {
            data,
            timestamp: Date.now(),
            fingerprint,
          });
          return data as T;
        }
      }
    } catch (error) {
      console.warn('[AICallManager] Failed to get from persistent cache:', error);
    }

    return null;
  }

  /**
   * Set cached response in both in-memory cache and IndexedDB/Cache API
   */
  async setCached<T>(
    fingerprint: string,
    type: 'insights' | 'recommendations' | 'progress' | 'smart-coach',
    data: T
  ): Promise<void> {
    const cacheKey = this.getCacheKey(fingerprint, type);
    
    // Store in memory (fast access)
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      fingerprint,
    });

    // Also store in persistent cache (shared with SW)
    try {
      await this.ensureIDBInitialized();
      
      // Store in Cache API (what SW uses)
      if ('caches' in window) {
        const cache = await caches.open('ai-responses');
        const response = new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' },
        });
        await cache.put(`/ai-cache/${type}/${fingerprint}`, response);
      }
    } catch (error) {
      console.warn('[AICallManager] Failed to persist to cache:', error);
      // Continue - in-memory cache is still set
    }
  }

  async invalidateCache(fingerprint?: string): Promise<void> {
    if (fingerprint) {
      // Invalidate specific fingerprint
      for (const [key, value] of this.cache.entries()) {
        if (value.fingerprint === fingerprint) {
          this.cache.delete(key);
        }
      }
      
      // Also invalidate from persistent cache
      try {
        if ('caches' in window) {
          const cache = await caches.open('ai-responses');
          const types: Array<'insights' | 'recommendations' | 'progress' | 'smart-coach'> = 
            ['insights', 'recommendations', 'progress', 'smart-coach'];
          for (const type of types) {
            await cache.delete(`/ai-cache/${type}/${fingerprint}`);
          }
        }
      } catch (error) {
        console.warn('[AICallManager] Failed to invalidate persistent cache:', error);
      }
    } else {
      // Invalidate all cache
      this.cache.clear();
      
      // Also clear persistent cache
      try {
        if ('caches' in window) {
          const cache = await caches.open('ai-responses');
          await cache.delete('/ai-cache/');
        }
      } catch (error) {
        console.warn('[AICallManager] Failed to clear persistent cache:', error);
      }
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    // Sort by priority (higher priority first)
    this.requestQueue.sort((a, b) => b.priority - a.priority);

    while (this.requestQueue.length > 0) {
      const now = Date.now();
      const timeSinceLastCall = now - this.lastCallTime;

      // Rate limiting: Wait if called too recently
      if (timeSinceLastCall < RATE_LIMIT_MS) {
        const waitTime = RATE_LIMIT_MS - timeSinceLastCall;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      const request = this.requestQueue.shift()!;
      this.lastCallTime = Date.now();

      try {
        const result = await this.executeWithRetry(request.fn, MAX_RETRIES);
        (request.resolve as (value: unknown) => void)(result);
      } catch (error) {
        request.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }

    this.isProcessing = false;
  }

  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = RETRY_DELAY_BASE * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  async queueRequest<T>(
    fn: () => Promise<T>,
    priority: number = 0
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const request: QueuedRequest<unknown> = {
        id: `${Date.now()}-${Math.random()}`,
        fn: fn as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject: reject as (error: Error) => void,
        priority,
      };

      this.requestQueue.push(request);

      // Process queue if not already processing
      if (!this.isProcessing) {
        if (this.pendingRequest) {
          clearTimeout(this.pendingRequest);
        }
        this.pendingRequest = setTimeout(() => {
          this.processQueue();
        }, 0);
      }
    });
  }

  /**
   * Execute AI call with in-memory caching
   * Note: This is called by aiRefreshService after it validates 24hr rule
   * The refresh service handles when to actually call this method
   */
  async executeWithCache<T>(
    fingerprint: string,
    type: 'insights' | 'recommendations' | 'progress' | 'smart-coach',
    fn: () => Promise<T>,
    priority: number = 0
  ): Promise<T> {
    // Check in-memory cache first (for immediate access)
    const cached = await this.getCached<T>(fingerprint, type);
    if (cached !== null) {
      return cached;
    }

    // Execute and cache result in memory and persistent storage
    const result = await this.queueRequest(fn, priority);
    await this.setCached(fingerprint, type, result);
    return result;
  }

  clearQueue(): void {
    this.requestQueue.forEach(req => {
      req.reject(new Error('Request queue cleared'));
    });
    this.requestQueue = [];
    this.isProcessing = false;
    if (this.pendingRequest) {
      clearTimeout(this.pendingRequest);
      this.pendingRequest = null;
    }
  }

  getQueueLength(): number {
    return this.requestQueue.length;
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}

export const aiCallManager = new AICallManager();

