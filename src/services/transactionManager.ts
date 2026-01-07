import { db } from './database';
import { Transaction } from 'dexie';

export interface TransactionOperation {
  operation: () => Promise<void>;
  rollback?: () => Promise<void>;
  description?: string;
}

export interface TransactionOptions {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
}

class TransactionManager {
  private activeTransactions: Set<string> = new Set();
  private readonly DEFAULT_RETRIES = 3;
  private readonly DEFAULT_RETRY_DELAY = 100;
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds

  /**
   * Execute operations in a single ACID transaction
   */
  async execute<T>(
    storeNames: string[],
    operations: (tx: Transaction) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    const retries = options.retries ?? this.DEFAULT_RETRIES;
    const retryDelay = options.retryDelay ?? this.DEFAULT_RETRY_DELAY;
    const timeout = options.timeout ?? this.DEFAULT_TIMEOUT;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await Promise.race([
          db.transaction('rw', storeNames, async (tx) => {
            return await operations(tx);
          }),
          this.createTimeoutPromise(timeout),
        ]);
        return result as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < retries) {
          const delay = retryDelay * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(
      `Transaction failed after ${retries} retries: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Execute multiple operations with rollback support
   */
  async executeWithRollback(
    storeNames: string[],
    operations: TransactionOperation[],
    options: TransactionOptions = {}
  ): Promise<void> {
    const executed: TransactionOperation[] = [];

    try {
      await this.execute(storeNames, async (_tx) => {
        for (const op of operations) {
          try {
            await op.operation();
            executed.push(op);
          } catch (error) {
            // Rollback executed operations in reverse order
            for (let i = executed.length - 1; i >= 0; i--) {
              const executedOp = executed[i];
              if (executedOp.rollback) {
                try {
                  await executedOp.rollback();
                } catch (rollbackError) {
                  console.error(`Rollback failed for operation: ${executedOp.description}`, rollbackError);
                }
              }
            }
            throw error;
          }
        }
      }, options);
    } catch (error) {
      // Additional rollback if transaction itself fails
      for (let i = executed.length - 1; i >= 0; i--) {
        const executedOp = executed[i];
        if (executedOp.rollback) {
          try {
            await executedOp.rollback();
          } catch (rollbackError) {
            console.error(`Rollback failed for operation: ${executedOp.description}`, rollbackError);
          }
        }
      }
      throw error;
    }
  }

  /**
   * Batch operations for better performance
   */
  async batch<T>(
    storeName: string,
    items: T[],
    operation: (tx: Transaction, item: T) => Promise<void>,
    batchSize: number = 100
  ): Promise<void> {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      await this.execute([storeName], async (tx) => {
        await Promise.all(batch.map(item => operation(tx, item)));
      });
    }
  }

  /**
   * Check if transaction is currently active
   */
  isTransactionActive(transactionId: string): boolean {
    return this.activeTransactions.has(transactionId);
  }

  /**
   * Create a timeout promise
   */
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Transaction timed out after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if error is non-retryable
   */
  private isNonRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      // Don't retry on constraint violations, invalid data, etc.
      return (
        message.includes('constraint') ||
        message.includes('invalid') ||
        message.includes('not found') ||
        message.includes('permission denied')
      );
    }
    return false;
  }

  /**
   * Execute read-only transaction (faster, no locks)
   */
  async read<T>(
    storeNames: string[],
    operation: (tx: Transaction) => Promise<T>
  ): Promise<T> {
    return await db.transaction('r', storeNames, async (tx) => {
      return await operation(tx);
    });
  }

  /**
   * Execute write transaction with conflict detection
   */
  async write<T>(
    storeNames: string[],
    operation: (tx: Transaction) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    return await this.execute(storeNames, operation, options);
  }
}

export const transactionManager = new TransactionManager();

