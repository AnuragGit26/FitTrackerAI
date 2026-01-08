import { PrismaClient } from '@prisma/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Set DATABASE_URL from ORM_PRISMA_DATABASE_URL if needed
// PrismaClient reads DATABASE_URL from process.env automatically
if (process.env.ORM_PRISMA_DATABASE_URL && !process.env.DATABASE_URL) {
    const accelerateUrl = process.env.ORM_PRISMA_DATABASE_URL.trim();
    
    // Prisma Accelerate requires connection strings to start with prisma+mongodb:// or mongo://
    // If it's a raw MongoDB connection string, we need to use Prisma Accelerate format
    if (accelerateUrl.startsWith('prisma+mongodb://') || accelerateUrl.startsWith('mongo://')) {
        process.env.DATABASE_URL = accelerateUrl;
    } else if (accelerateUrl.startsWith('mongodb://') || accelerateUrl.startsWith('mongodb+srv://')) {
        // Raw MongoDB connection string - Prisma Accelerate cannot use this directly
        // Log error but don't throw - let Prisma handle the error with a clearer message
        console.error('[Prisma API] ERROR: ORM_PRISMA_DATABASE_URL must be a Prisma Accelerate connection string.');
        console.error('[Prisma API] Expected format: prisma+mongodb://... or mongo://...');
        const protocolMatch = accelerateUrl.match(/^([a-z0-9+.-]+):\/\//i);
        const safePreview = protocolMatch ? `${protocolMatch[0]}...` : 'Invalid URL format';
        console.error('[Prisma API] Received format:', safePreview);
        console.error('[Prisma API] Please configure Prisma Accelerate and use the connection string from your Prisma dashboard.');
        // Still set it so Prisma can provide its own error message
        process.env.DATABASE_URL = accelerateUrl;
    } else {
        // Unknown format - set it and let Prisma handle validation
        process.env.DATABASE_URL = accelerateUrl;
    }
}

const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { model, action, params } = req.body;

        if (!model || !action) {
            return res.status(400).json({ error: 'Model and action are required' });
        }

        // Get the model from Prisma Client
        const prismaModel = (prisma as unknown as Record<string, unknown>)[model] as {
            [key: string]: (params: unknown) => Promise<unknown>;
        };

        if (!prismaModel || typeof prismaModel[action] !== 'function') {
            return res.status(400).json({ error: `Invalid model or action: ${model}.${action}` });
        }

        // Execute the Prisma operation
        const result = await prismaModel[action](params);

        return res.status(200).json(result);
    } catch (error) {
        console.error('Prisma API error:', error);
        
        // Provide helpful error message for connection string issues
        if (error instanceof Error) {
            const errorMessage = error.message;
            if (errorMessage.includes('the URL must start with the protocol `mongo`') || 
                errorMessage.includes('Accelerate was not able to connect')) {
                const dbUrl = process.env.DATABASE_URL || process.env.ORM_PRISMA_DATABASE_URL || 'not set';
                // Extract only the protocol to avoid leaking credentials
                const protocolMatch = dbUrl !== 'not set' ? dbUrl.match(/^([a-z0-9+.-]+):\/\//i) : null;
                const urlPreview = protocolMatch ? `${protocolMatch[0]}...` : (dbUrl === 'not set' ? 'not set' : 'Invalid URL format');
                
                return res.status(500).json({ 
                    error: 'Database connection configuration error',
                    message: 'Prisma Accelerate requires a connection string starting with `prisma+mongodb://` or `mongo://`.',
                    details: `Current connection string protocol: ${urlPreview}`,
                    solution: 'Please configure ORM_PRISMA_DATABASE_URL in Vercel with your Prisma Accelerate connection string from the Prisma dashboard.',
                    originalError: errorMessage
                });
            }
        }
        
        return res.status(500).json({ 
            error: error instanceof Error ? error.message : 'Unknown error',
            details: error instanceof Error ? error.stack : undefined
        });
    }
}