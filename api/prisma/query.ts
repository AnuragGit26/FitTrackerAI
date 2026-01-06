import { PrismaClient } from '@prisma/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Set DATABASE_URL from ORM_PRISMA_DATABASE_URL if needed
// PrismaClient reads DATABASE_URL from process.env automatically
if (process.env.ORM_PRISMA_DATABASE_URL && !process.env.DATABASE_URL) {
    process.env.DATABASE_URL = process.env.ORM_PRISMA_DATABASE_URL;
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
        const prismaModel = (prisma as Record<string, unknown>)[model] as {
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
        return res.status(500).json({ 
            error: error instanceof Error ? error.message : 'Unknown error',
            details: error instanceof Error ? error.stack : undefined
        });
    }
}