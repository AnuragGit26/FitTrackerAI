/**
 * Service Worker Communication Utility
 * Handles communication between main thread and service worker for background AI fetching
 */

type MessageType = 
  | 'FETCH_AI_INSIGHTS'
  | 'AI_INSIGHTS_READY'
  | 'AI_INSIGHTS_ERROR'
  | 'SKIP_WAITING'
  | 'CACHE_AI_RESPONSE'
  | 'GET_CACHED_AI'
  | 'AI_REFRESH_CHECK';

interface SWMessage {
  type: MessageType;
  [key: string]: unknown;
}

type MessageHandler = (data: SWMessage) => void;

class SWCommunication {
  private messageHandlers: Map<MessageType, Set<MessageHandler>> = new Map();
  private isListening = false;

  constructor() {
    this.setupMessageListener();
  }

  /**
   * Check if service worker is available
   */
  isServiceWorkerAvailable(): boolean {
    return 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null;
  }

  /**
   * Get the service worker controller
   */
  private getServiceWorker(): ServiceWorker | null {
    if (!this.isServiceWorkerAvailable()) {
      return null;
    }
    return navigator.serviceWorker.controller;
  }

  /**
   * Setup message listener for service worker messages
   */
  private setupMessageListener(): void {
    if (this.isListening) return;
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
        const message = event.data as SWMessage;
        if (message && message.type) {
          this.handleMessage(message);
        }
      });
      this.isListening = true;
    }
  }

  /**
   * Handle incoming messages from service worker
   */
  private handleMessage(message: SWMessage): void {
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error(`[SW Communication] Error in message handler for ${message.type}:`, error);
        }
      });
    }
  }

  /**
   * Deeply serialize data for postMessage (removes Promises, Functions, and converts Dates to strings)
   */
  private serializeForPostMessage(value: unknown, visited = new WeakSet()): unknown {
    // Handle null and undefined
    if (value === null || value === undefined) {
      return value;
    }

    // Handle primitives
    if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
      return value;
    }

    // Handle Date objects
    if (value instanceof Date) {
      return value.toISOString();
    }

    // Remove Promises and Functions (not serializable)
    if (value instanceof Promise || typeof value === 'function') {
      return undefined;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map(item => this.serializeForPostMessage(item, visited));
    }

    // Handle objects (check for circular references)
    if (typeof value === 'object') {
      // Check for circular reference
      if (visited.has(value as object)) {
        return '[Circular]';
      }
      visited.add(value as object);

      const serialized: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        const serializedValue = this.serializeForPostMessage(val, visited);
        // Only include if value is not undefined (removes Promises/Functions)
        if (serializedValue !== undefined) {
          serialized[key] = serializedValue;
        }
      }
      return serialized;
    }

    // Fallback: convert to string for unknown types
    return String(value);
  }

  /**
   * Send message to service worker
   */
  async sendMessage(type: MessageType, data: Record<string, unknown> = {}): Promise<void> {
    const sw = this.getServiceWorker();
    if (!sw) {
      console.warn('[SW Communication] Service worker not available, message not sent:', type);
      return;
    }

    try {
      // Serialize all data to ensure it's postMessage-compatible
      const serializedData = this.serializeForPostMessage(data) as Record<string, unknown>;
      
      sw.postMessage({
        type,
        ...serializedData,
      });
    } catch (error) {
      console.error('[SW Communication] Failed to send message:', error);
    }
  }

  /**
   * Request background AI insights fetch
   */
  async requestBackgroundFetch(
    context: Record<string, unknown>,
    fingerprint: string,
    insightTypes: string[],
    userId?: string,
    apiKey?: string
  ): Promise<void> {
    await this.sendMessage('FETCH_AI_INSIGHTS', {
      context,
      fingerprint,
      insightTypes,
      userId,
      apiKey,
    });
  }

  /**
   * Register handler for AI insights ready messages
   */
  onAIInsightsReady(handler: (data: { fingerprint: string; results: Record<string, unknown>; errors?: unknown }) => void): () => void {
    return this.registerHandler('AI_INSIGHTS_READY', handler);
  }

  /**
   * Register handler for AI insights error messages
   */
  onAIInsightsError(handler: (data: { error: string; fingerprint: string; insightTypes: string[] }) => void): () => void {
    return this.registerHandler('AI_INSIGHTS_ERROR', handler);
  }

  /**
   * Register a message handler
   */
  private registerHandler(type: MessageType, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  /**
   * Wait for service worker to be ready
   */
  async waitForServiceWorker(timeout: number = 5000): Promise<boolean> {
    if (this.isServiceWorkerAvailable()) {
      return true;
    }

    return new Promise((resolve) => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (this.isServiceWorkerAvailable()) {
          clearInterval(checkInterval);
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 100);
    });
  }
}

export const swCommunication = new SWCommunication();

