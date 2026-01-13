// Vercel Serverless Function: Client Error Logging Endpoint
// Receives error logs from the client and logs them to Vercel's logging system
import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ErrorLogPayload {
    userId: string;
    errorType: string;
    errorMessage: string;
    errorStack?: string;
    context?: Record<string, unknown>;
    tableName?: string;
    recordId?: string | number;
    operation?: string;
    severity?: string;
    timestamp?: string;
}

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const errorLog: ErrorLogPayload = req.body;

        // Validate required fields (userId is now optional)
        if (!errorLog.errorType || !errorLog.errorMessage) {
            return res.status(400).json({
                error: 'Missing required fields: errorType, errorMessage',
            });
        }

        // Log to Vercel's console (captured in deployment logs)
        console.error('[Client Error Log]', {
            userId: errorLog.userId || 'anonymous',
            errorType: errorLog.errorType,
            errorMessage: errorLog.errorMessage,
            errorStack: errorLog.errorStack,
            severity: errorLog.severity || 'error',
            tableName: errorLog.tableName,
            recordId: errorLog.recordId,
            operation: errorLog.operation,
            context: errorLog.context,
            timestamp: errorLog.timestamp || new Date().toISOString(),
            environment: process.env.VERCEL_ENV || 'development',
            deployment: process.env.VERCEL_URL || 'local',
        });

        // Optionally store in Supabase if configured
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (supabaseUrl && supabaseServiceKey) {
            try {
                const { createClient } = await import('@supabase/supabase-js');
                const supabase = createClient(supabaseUrl, supabaseServiceKey, {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false,
                    },
                });

                await supabase.from('error_logs').insert({
                    user_id: errorLog.userId,
                    error_type: errorLog.errorType,
                    error_message: errorLog.errorMessage,
                    error_stack: errorLog.errorStack || null,
                    context: errorLog.context ? JSON.stringify(errorLog.context) : null,
                    table_name: errorLog.tableName || null,
                    record_id: errorLog.recordId ? String(errorLog.recordId) : null,
                    operation: errorLog.operation || null,
                    severity: errorLog.severity || 'error',
                    resolved: false,
                    version: 1,
                    created_at: errorLog.timestamp || new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });
            } catch (supabaseError) {
                // Log Supabase error but don't fail the request
                console.error('[Error Log API] Failed to store in Supabase:', supabaseError);
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Error logged successfully',
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Error Log API] Handler error:', errorMessage);
        
        return res.status(500).json({
            error: 'Failed to log error',
            message: errorMessage,
        });
    }
}

