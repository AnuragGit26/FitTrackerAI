// Supabase Sync Webhook Service
// Triggers Supabase Edge Function to sync data to MongoDB when client sync starts

import type { SyncableTable, SyncDirection } from '@/types/sync';

const WEBHOOK_TIMEOUT = 5000; // 5 seconds

/**
 * Get Supabase URL from environment
 */
function getSupabaseUrl(): string {
    const url =
        import.meta.env.VITE_SUPABASE_URL ||
        import.meta.env.REACT_APP_SUPABASE_URL;

    if (!url) {
        console.warn('[SupabaseSyncWebhook] Supabase URL not configured');
        return '';
    }

    return url;
}

/**
 * Get webhook secret from environment (optional)
 */
function getWebhookSecret(): string | undefined {
    return import.meta.env.VITE_SUPABASE_SYNC_WEBHOOK_SECRET;
}

/**
 * Trigger Supabase Edge Function to sync data to MongoDB
 * This is a fire-and-forget operation that doesn't block the client sync
 * 
 * @param userId - User ID to sync
 * @param options - Sync options (tables, direction, etc.)
 */
export async function triggerSyncWebhook(
    userId: string,
    options?: {
        tables?: SyncableTable[];
        tableName?: SyncableTable;
        recordId?: string | number;
        direction?: SyncDirection;
    }
): Promise<void> {
    // Don't block if Supabase URL is not configured
    const supabaseUrl = getSupabaseUrl();
    if (!supabaseUrl) {
        console.warn('[SupabaseSyncWebhook] Skipping webhook - Supabase URL not configured');
        return;
    }

    // Fire and forget - don't await, catch errors silently
    triggerSyncWebhookInternal(userId, options).catch((error) => {
        // Log error but don't throw - this is non-critical
        console.warn('[SupabaseSyncWebhook] Failed to trigger webhook:', error);
    });
}

/**
 * Internal function to actually trigger the webhook
 */
async function triggerSyncWebhookInternal(
    userId: string,
    options?: {
        tables?: SyncableTable[];
        tableName?: SyncableTable;
        recordId?: string | number;
        direction?: SyncDirection;
    }
): Promise<void> {
    const supabaseUrl = getSupabaseUrl();
    if (!supabaseUrl) {
        return;
    }

    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/sync-to-mongodb`;

    // Build query parameters
    const params = new URLSearchParams();
    params.append('userId', userId);

    if (options?.tableName) {
        params.append('tableName', options.tableName);
    }

    if (options?.recordId !== undefined) {
        params.append('recordId', String(options.recordId));
    }

    if (options?.direction) {
        params.append('direction', options.direction);
    }

    // Build request body
    const body: Record<string, unknown> = {
        userId,
        trigger: 'client_sync',
    };

    if (options?.tables && options.tables.length > 0) {
        body.tables = options.tables;
    }

    if (options?.tableName) {
        body.tableName = options.tableName;
    }

    if (options?.recordId !== undefined) {
        body.recordId = options.recordId;
    }

    if (options?.direction) {
        body.direction = options.direction;
    }

    // Build headers
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    // Add webhook secret if configured
    const webhookSecret = getWebhookSecret();
    if (webhookSecret) {
        headers['x-webhook-secret'] = webhookSecret;
    }

    // Use Supabase anon key for authentication
    const anonKey =
        import.meta.env.VITE_SUPABASE_ANON_KEY ||
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
        import.meta.env.REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

    if (anonKey) {
        headers['Authorization'] = `Bearer ${anonKey}`;
    }

    try {
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT);

        const response = await fetch(`${edgeFunctionUrl}?${params.toString()}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`Webhook failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        // eslint-disable-next-line no-console
        console.log('[SupabaseSyncWebhook] Webhook triggered successfully for userId:', userId);
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Webhook request timed out');
        }
        throw error;
    }
}
