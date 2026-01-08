// Supabase Edge Function: Sync to MongoDB
// Syncs data from Supabase PostgreSQL to MongoDB Atlas
// Supports webhook triggers, manual invocation, and scheduled cron jobs

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { MongoClient } from 'https://deno.land/x/mongo@v0.32.0/mod.ts';
import type { SyncableTable, SyncRequest, SyncResult, SyncStatus } from './types.ts';
import { syncTable, syncRecordById } from './syncHandlers.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const DATABASE_URL = Deno.env.get('DATABASE_URL') || '';
const CRON_SECRET = Deno.env.get('CRON_SECRET') || '';
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') || '';

const ALL_TABLES: SyncableTable[] = [
    'workouts',
    'exercises',
    'workout_templates',
    'planned_workouts',
    'muscle_statuses',
    'user_profiles',
    'settings',
    'notifications',
    'sleep_logs',
    'recovery_logs',
    'error_logs',
];

/**
 * Authenticate request
 */
function authenticateRequest(req: Request): { authorized: boolean; error?: string } {
    const authHeader = req.headers.get('authorization');
    const cronSecret = req.headers.get('x-cron-secret');
    const webhookSecret = req.headers.get('x-webhook-secret');
    const url = new URL(req.url);
    const requestType = url.searchParams.get('type') || 'manual';
    
    // Check for cron secret
    if (cronSecret && CRON_SECRET && cronSecret === CRON_SECRET) {
        return { authorized: true };
    }
    
    // Check for webhook secret (client-triggered syncs)
    if (webhookSecret && WEBHOOK_SECRET && webhookSecret === WEBHOOK_SECRET) {
        return { authorized: true };
    }
    
    // Check for service role key (manual/admin requests)
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        if (token === SUPABASE_SERVICE_ROLE_KEY) {
            return { authorized: true };
        }
    }
    
    // For webhook type requests, also accept Supabase anon key (from client)
    if (requestType === 'webhook' || req.headers.get('trigger') === 'client_sync') {
        const anonKey = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
        // Allow if anon key is provided (Supabase will validate it)
        if (anonKey) {
            return { authorized: true };
        }
    }
    
    return {
        authorized: false,
        error: 'Unauthorized: Missing or invalid authentication',
    };
}

/**
 * Parse request to determine sync type and parameters
 */
async function parseRequest(req: Request): Promise<SyncRequest> {
    const url = new URL(req.url);
    const method = req.method;
    
    // Check if it's a webhook (POST with payload)
    if (method === 'POST') {
        try {
            const body = await req.json();
            
            // Webhook format: { type: 'INSERT'|'UPDATE'|'DELETE', table: string, record: {...}, old_record: {...} }
            if (body.type && body.table && (body.record || body.old_record)) {
                return {
                    type: 'webhook',
                    tableName: body.table as SyncableTable,
                    recordId: body.record?.id || body.old_record?.id,
                    operation: body.type.toLowerCase() as 'insert' | 'update' | 'delete',
                    payload: body.record || body.old_record,
                };
            }
            
            // Manual request format
            if (body.userId || body.tableName) {
                return {
                    type: 'manual',
                    userId: body.userId,
                    tableName: body.tableName,
                    recordId: body.recordId,
                    operation: body.operation,
                    payload: body.payload,
                };
            }
        } catch {
            // Not JSON, treat as query params
        }
    }
    
    // Check query parameters (manual or cron)
    const userId = url.searchParams.get('userId');
    const tableName = url.searchParams.get('tableName') as SyncableTable | null;
    const recordId = url.searchParams.get('recordId');
    const isCron = url.searchParams.get('cron') === 'true' || req.headers.get('x-cron-secret');
    
    if (isCron) {
        return {
            type: 'cron',
            userId: userId || undefined,
            tableName: tableName || undefined,
        };
    }
    
    return {
        type: 'manual',
        userId: userId || undefined,
        tableName: tableName || undefined,
        recordId: recordId ? (isNaN(Number(recordId)) ? recordId : Number(recordId)) : undefined,
    };
}

/**
 * Get or create sync metadata
 */
async function getSyncMetadata(
    supabase: ReturnType<typeof createClient>,
    tableName: SyncableTable,
    userId: string
): Promise<{ lastSyncAt: Date | null; syncStatus: SyncStatus }> {
    const { data, error } = await supabase
        .from('sync_metadata')
        .select('last_sync_at, sync_status')
        .eq('table_name', tableName)
        .eq('user_id', userId)
        .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error(`Error fetching sync metadata: ${error.message}`);
    }
    
    return {
        lastSyncAt: data?.last_sync_at ? new Date(data.last_sync_at) : null,
        syncStatus: (data?.sync_status as SyncStatus) || 'idle',
    };
}

/**
 * Update sync metadata
 */
async function updateSyncMetadata(
    supabase: ReturnType<typeof createClient>,
    tableName: SyncableTable,
    userId: string,
    result: SyncResult
): Promise<void> {
    const now = new Date().toISOString();
    
    const updateData: Record<string, unknown> = {
        last_sync_at: now,
        sync_status: result.status,
        conflict_count: result.conflicts,
        record_count: result.recordsProcessed,
        updated_at: now,
    };
    
    if (result.errors.length > 0) {
        updateData.error_message = result.errors.map(e => e.error).join('; ');
        updateData.last_error_at = now;
    } else {
        updateData.error_message = null;
        updateData.last_error_at = null;
    }
    
    if (result.status === 'success') {
        updateData.last_successful_sync_at = now;
    }
    
    const { error } = await supabase
        .from('sync_metadata')
        .upsert({
            table_name: tableName,
            user_id: userId,
            ...updateData,
        }, {
            onConflict: 'table_name,user_id',
        });
    
    if (error) {
        console.error(`Error updating sync metadata: ${error.message}`);
    }
}

/**
 * Log error to error_logs table
 */
async function logError(
    supabase: ReturnType<typeof createClient>,
    userId: string,
    error: Error,
    context: Record<string, unknown>
): Promise<void> {
    try {
        await supabase.from('error_logs').insert({
            user_id: userId,
            error_type: 'sync_error',
            error_message: error.message,
            error_stack: error.stack,
            context: context,
            severity: 'error',
            resolved: false,
        });
    } catch (logError) {
        console.error('Failed to log error:', logError);
    }
}

/**
 * Handle webhook request
 */
async function handleWebhook(
    supabase: ReturnType<typeof createClient>,
    mongoClient: MongoClient,
    request: SyncRequest
): Promise<Response> {
    if (!request.tableName || !request.recordId || !request.payload) {
        return new Response(
            JSON.stringify({ error: 'Missing required webhook parameters' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }
    
    const userId = (request.payload as Record<string, unknown>).user_id as string;
    if (!userId) {
        return new Response(
            JSON.stringify({ error: 'Missing user_id in payload' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }
    
    try {
        const result = await syncRecordById(
            supabase,
            mongoClient,
            request.tableName,
            request.recordId,
            userId
        );
        
        // Update sync metadata
        await updateSyncMetadata(supabase, request.tableName, userId, result);
        
        return new Response(
            JSON.stringify({
                success: result.status === 'success',
                result,
            }),
            { status: result.status === 'success' ? 200 : 500, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        await logError(supabase, userId, error as Error, {
            type: 'webhook',
            tableName: request.tableName,
            recordId: request.recordId,
        });
        
        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : 'Unknown error',
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

/**
 * Handle manual request
 */
async function handleManual(
    supabase: ReturnType<typeof createClient>,
    mongoClient: MongoClient,
    request: SyncRequest
): Promise<Response> {
    const results: SyncResult[] = [];
    
    try {
        // If specific record ID provided
        if (request.tableName && request.recordId && request.userId) {
            const result = await syncRecordById(
                supabase,
                mongoClient,
                request.tableName,
                request.recordId,
                request.userId
            );
            results.push(result);
            await updateSyncMetadata(supabase, request.tableName, request.userId, result);
        }
        // If specific table provided
        else if (request.tableName && request.userId) {
            const metadata = await getSyncMetadata(supabase, request.tableName, request.userId);
            const result = await syncTable(
                supabase,
                mongoClient,
                request.tableName,
                request.userId,
                metadata.lastSyncAt || undefined
            );
            results.push(result);
            await updateSyncMetadata(supabase, request.tableName, request.userId, result);
        }
        // If only userId provided, sync all tables
        else if (request.userId) {
            for (const tableName of ALL_TABLES) {
                const metadata = await getSyncMetadata(supabase, tableName, request.userId);
                const result = await syncTable(
                    supabase,
                    mongoClient,
                    tableName,
                    request.userId,
                    metadata.lastSyncAt || undefined
                );
                results.push(result);
                await updateSyncMetadata(supabase, tableName, request.userId, result);
            }
        }
        // If no userId, return error
        else {
            return new Response(
                JSON.stringify({ error: 'userId is required for manual sync' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }
        
        const totalProcessed = results.reduce((sum, r) => sum + r.recordsProcessed, 0);
        const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
        
        return new Response(
            JSON.stringify({
                success: totalErrors === 0,
                results,
                summary: {
                    tablesProcessed: results.length,
                    totalRecordsProcessed: totalProcessed,
                    totalErrors,
                },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : 'Unknown error',
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

/**
 * Handle cron request (scheduled sync)
 */
async function handleCron(
    supabase: ReturnType<typeof createClient>,
    mongoClient: MongoClient,
    request: SyncRequest
): Promise<Response> {
    const results: SyncResult[] = [];
    const errors: string[] = [];
    
    try {
        // Get all active users
        const { data: users, error: usersError } = await supabase
            .from('user_profiles')
            .select('user_id')
            .is('deleted_at', null);
        
        if (usersError) {
            throw new Error(`Failed to fetch users: ${usersError.message}`);
        }
        
        if (!users || users.length === 0) {
            return new Response(
                JSON.stringify({
                    message: 'No active users found',
                    results: [],
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }
        
        const tablesToSync = request.tableName ? [request.tableName] : ALL_TABLES;
        const userIdsToSync = request.userId ? [request.userId] : users.map(u => u.user_id as string);
        
        // Sync each user's tables
        for (const userId of userIdsToSync) {
            for (const tableName of tablesToSync) {
                try {
                    const metadata = await getSyncMetadata(supabase, tableName, userId);
                    
                    // Skip if synced recently (within last hour)
                    if (metadata.lastSyncAt) {
                        const hoursSinceSync = (Date.now() - metadata.lastSyncAt.getTime()) / (1000 * 60 * 60);
                        if (hoursSinceSync < 1) {
                            continue;
                        }
                    }
                    
                    const result = await syncTable(
                        supabase,
                        mongoClient,
                        tableName,
                        userId,
                        metadata.lastSyncAt || undefined
                    );
                    
                    results.push(result);
                    await updateSyncMetadata(supabase, tableName, userId, result);
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    errors.push(`User ${userId}, Table ${tableName}: ${errorMsg}`);
                    await logError(supabase, userId, error as Error, {
                        type: 'cron',
                        tableName,
                    });
                }
            }
        }
        
        const totalProcessed = results.reduce((sum, r) => sum + r.recordsProcessed, 0);
        const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
        
        return new Response(
            JSON.stringify({
                success: errors.length === 0 && totalErrors === 0,
                results,
                errors: errors.length > 0 ? errors : undefined,
                summary: {
                    usersProcessed: userIdsToSync.length,
                    tablesProcessed: tablesToSync.length,
                    totalRecordsProcessed: totalProcessed,
                    totalErrors: totalErrors + errors.length,
                },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : 'Unknown error',
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

/**
 * Main handler
 */
serve(async (req) => {
    try {
        // Authenticate request
        const auth = authenticateRequest(req);
        if (!auth.authorized) {
            return new Response(
                JSON.stringify({ error: auth.error || 'Unauthorized' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }
        
        // Validate environment variables
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !DATABASE_URL) {
            return new Response(
                JSON.stringify({
                    error: 'Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or DATABASE_URL',
                }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }
        
        // Initialize Supabase client
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
        
        // Initialize MongoDB client
        const mongoClient = new MongoClient();
        await mongoClient.connect(DATABASE_URL);
        
        try {
            // Parse request
            const syncRequest = await parseRequest(req);
            
            // Route to appropriate handler
            let response: Response;
            switch (syncRequest.type) {
                case 'webhook':
                    response = await handleWebhook(supabase, mongoClient, syncRequest);
                    break;
                case 'cron':
                    response = await handleCron(supabase, mongoClient, syncRequest);
                    break;
                case 'manual':
                default:
                    response = await handleManual(supabase, mongoClient, syncRequest);
                    break;
            }
            
            return response;
        } finally {
            // Close MongoDB connection
            await mongoClient.close();
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Edge function error:', errorMessage);
        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
});
