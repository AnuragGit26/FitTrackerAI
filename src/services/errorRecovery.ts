export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  exponentialBackoff?: boolean;
  retryableErrors?: (error: Error) => boolean;
}

export interface RecoveryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
}

class ErrorRecovery {
  private readonly DEFAULT_MAX_RETRIES = 3;
  private readonly DEFAULT_BASE_DELAY = 100;
  private readonly DEFAULT_MAX_DELAY = 5000;

  /**
   * Execute operation with automatic retry and exponential backoff
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const maxRetries = options.maxRetries ?? this.DEFAULT_MAX_RETRIES;
    const baseDelay = options.baseDelay ?? this.DEFAULT_BASE_DELAY;
    const maxDelay = options.maxDelay ?? this.DEFAULT_MAX_DELAY;
    const exponentialBackoff = options.exponentialBackoff ?? true;
    const retryableErrors = options.retryableErrors ?? this.defaultRetryableError;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is retryable
        if (!retryableErrors(lastError)) {
          throw lastError;
        }

        // Don't retry on last attempt
        if (attempt < maxRetries) {
          const delay = exponentialBackoff
            ? Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
            : baseDelay;

          await this.sleep(delay);
        }
      }
    }

    throw new Error(
      `Operation failed after ${maxRetries} retries: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Execute operation with circuit breaker pattern
   */
  async withCircuitBreaker<T>(
    operation: () => Promise<T>,
    options: {
      failureThreshold?: number;
      resetTimeout?: number;
      timeout?: number;
    } = {}
  ): Promise<T> {
    const failureThreshold = options.failureThreshold ?? 5;
    const resetTimeout = options.resetTimeout ?? 60000; // 1 minute
    const timeout = options.timeout ?? 30000; // 30 seconds

    // Simple in-memory circuit breaker state
    const state = {
      failures: 0,
      lastFailureTime: 0,
      isOpen: false,
    };

    // Check if circuit is open
    if (state.isOpen) {
      const timeSinceLastFailure = Date.now() - state.lastFailureTime;
      if (timeSinceLastFailure < resetTimeout) {
        throw new Error('Circuit breaker is open. Service temporarily unavailable.');
      } else {
        // Reset circuit
        state.isOpen = false;
        state.failures = 0;
      }
    }

    try {
      const result = await Promise.race([
        operation(),
        this.createTimeoutPromise(timeout),
      ]);

      // Reset on success
      state.failures = 0;
      state.isOpen = false;

      return result;
    } catch (error) {
      state.failures++;
      state.lastFailureTime = Date.now();

      if (state.failures >= failureThreshold) {
        state.isOpen = true;
      }

      throw error;
    }
  }

  /**
   * Execute operation with timeout
   */
  async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      operation(),
      this.createTimeoutPromise(timeoutMs),
    ]);
  }

  /**
   * Execute operation with data integrity check
   */
  async withIntegrityCheck<T>(
    operation: () => Promise<T>,
    validator: (result: T) => boolean,
    options: RetryOptions = {}
  ): Promise<T> {
    return this.withRetry(async () => {
      const result = await operation();

      if (!validator(result)) {
        throw new Error('Data integrity check failed');
      }

      return result;
    }, options);
  }

  /**
   * Execute batch operations with partial failure handling
   */
  async batchWithPartialFailure<T, R>(
    items: T[],
    operation: (item: T) => Promise<R>,
    options: {
      continueOnError?: boolean;
      maxConcurrency?: number;
    } = {}
  ): Promise<{ successes: R[]; failures: Array<{ item: T; error: Error }> }> {
    const continueOnError = options.continueOnError ?? true;
    const maxConcurrency = options.maxConcurrency ?? 5;

    const successes: R[] = [];
    const failures: Array<{ item: T; error: Error }> = [];

    // Process in batches to limit concurrency
    for (let i = 0; i < items.length; i += maxConcurrency) {
      const batch = items.slice(i, i + maxConcurrency);

      const results = await Promise.allSettled(
        batch.map(item => operation(item))
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const item = batch[j];

        if (result.status === 'fulfilled') {
          successes.push(result.value);
        } else {
          const error = result.reason instanceof Error
            ? result.reason
            : new Error(String(result.reason));

          failures.push({ item, error });

          if (!continueOnError) {
            throw error;
          }
        }
      }
    }

    return { successes, failures };
  }

  /**
   * Default retryable error checker
   */
  private defaultRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Retry on network errors, timeouts, and temporary failures
    const retryablePatterns = [
      'network',
      'timeout',
      'temporary',
      'unavailable',
      'econnreset',
      'enotfound',
      'econnrefused',
      'etimedout',
    ];

    // Don't retry on client errors (4xx) except 429 (rate limit)
    const nonRetryablePatterns = [
      'not found',
      'unauthorized',
      'forbidden',
      'bad request',
      'invalid',
      'constraint',
    ];

    if (nonRetryablePatterns.some(pattern => message.includes(pattern))) {
      return false;
    }

    return retryablePatterns.some(pattern => message.includes(pattern)) ||
           error.name === 'NetworkError' ||
           error.name === 'TimeoutError';
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise<T>(timeoutMs: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  /**
   * Validate data integrity
   */
  validateDataIntegrity<T>(data: T, validators: Array<(data: T) => boolean>): boolean {
    return validators.every(validator => validator(data));
  }

  /**
   * Recover from corrupted data
   */
  async recoverFromCorruption<T>(
    corruptedData: T,
    recoveryStrategy: (data: T) => Promise<T>
  ): Promise<T> {
    try {
      return await recoveryStrategy(corruptedData);
    } catch (error) {
      throw new Error(
        `Failed to recover from data corruption: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

export const errorRecovery = new ErrorRecovery();

