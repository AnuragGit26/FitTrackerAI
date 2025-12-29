// Vercel Serverless Function: Daily Notifications Cron Job
// Triggers Supabase Edge Function daily at 9:00 AM
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    // Verify cron secret
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error('Missing Supabase configuration');
        }

        // Call Supabase Edge Function
        const edgeFunctionUrl = `${supabaseUrl}/functions/v1/daily-notifications`;

        const response = await fetch(edgeFunctionUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Edge function error: ${response.status} ${errorText}`);
        }

        const result = await response.json();

        return res.status(200).json({
            message: 'Daily notifications cron job executed successfully',
            result,
        });
    } catch (error) {
        console.error('Cron job error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return res.status(500).json({
            error: 'Failed to execute daily notifications cron job',
            message: errorMessage,
        });
    }
}

