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

        // Note: Error logs are now captured in Vercel logs only
        // Previously stored in Supabase, now local-only (client-side IndexedDB)
        // Future enhancement: Store in Firestore if cloud error tracking is needed

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

