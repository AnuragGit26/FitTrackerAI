/**
 * Development API Server
 * Runs API routes locally for development
 */

// IMPORTANT: Setup DATABASE_URL BEFORE importing PrismaClient
// Import the setup module which sets DATABASE_URL
import './setup-prisma-env';

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';

const app = express();
app.use(cors());
app.use(express.json());

// Verify DATABASE_URL is still set after imports
const finalDatabaseUrl = process.env.DATABASE_URL;
console.log(`[Dev API Server] DATABASE_URL after imports: ${finalDatabaseUrl?.substring(0, 50)}...`);

if (!finalDatabaseUrl) {
    console.error('ERROR: DATABASE_URL is not set after imports!');
    process.exit(1);
}

// Prisma Client initialization
// Prisma 7 for MongoDB should read DATABASE_URL from process.env
// But we verify it's set before creating the client
console.log(`[Dev API Server] Creating Prisma Client...`);
console.log(`[Dev API Server] DATABASE_URL exists: ${!!process.env.DATABASE_URL}`);
console.log(`[Dev API Server] DATABASE_URL length: ${process.env.DATABASE_URL?.length}`);

// Create a .env.local file content to ensure DATABASE_URL is available
// Prisma Client reads from process.env.DATABASE_URL
// Double-check it's set
if (!process.env.DATABASE_URL) {
    console.error('CRITICAL: DATABASE_URL is not set when creating PrismaClient!');
    console.error('This should not happen - DATABASE_URL was set earlier');
    process.exit(1);
}

// Log the actual value (truncated for security)
const dbUrlPreview = process.env.DATABASE_URL.substring(0, 50) + '...';
console.log(`[Dev API Server] Creating PrismaClient with DATABASE_URL: ${dbUrlPreview}`);

// Prisma 6 supports direct MongoDB connections without adapters
// DATABASE_URL is read automatically from process.env
const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// Prisma query endpoint
app.post('/api/prisma/query', async (req, res) => {
    let model: string | undefined;
    let action: string | undefined;
    let params: unknown;
    
    try {
        ({ model, action, params } = req.body);

        console.log('[Dev API Server] Request:', { model, action, paramsKeys: params ? Object.keys(params) : [] });

        if (!model || !action) {
            return res.status(400).json({ error: 'Model and action are required' });
        }

        // Convert model name to Prisma model name (camelCase)
        // e.g., "workout" -> "workout", "workoutTemplate" -> "workoutTemplate"
        const prismaModelName = model;

        // Get the model from Prisma Client
        // When using $extends, models are still accessible directly
        const prismaModel = (prisma as unknown as Record<string, unknown>)[prismaModelName] as {
            [key: string]: (params: unknown) => Promise<unknown>;
        } | undefined;

        if (!prismaModel) {
            console.error(`[Dev API Server] Model not found: ${prismaModelName}`);
            // Try to get available models
            const availableModels = Object.keys(prisma).filter(key => 
                !key.startsWith('$') && 
                typeof (prisma as unknown as Record<string, unknown>)[key] === 'object'
            );
            console.error(`[Dev API Server] Available models:`, availableModels);
            return res.status(400).json({ 
                error: `Invalid model: ${prismaModelName}`,
                availableModels: availableModels
            });
        }

        if (typeof prismaModel[action] !== 'function') {
            console.error(`[Dev API Server] Action not found: ${prismaModelName}.${action}`);
            console.error(`[Dev API Server] Available actions:`, Object.keys(prismaModel));
            return res.status(400).json({ 
                error: `Invalid action: ${prismaModelName}.${action}`,
                availableActions: Object.keys(prismaModel)
            });
        }

        // Execute the Prisma operation
        console.log(`[Dev API Server] Executing: ${prismaModelName}.${action}`);
        console.log(`[Dev API Server] Params:`, JSON.stringify(params, null, 2));
        try {
            const result = await prismaModel[action](params);
            console.log(`[Dev API Server] Success: ${prismaModelName}.${action}`);
            // Return the result as-is. null is a valid return value for findFirst/findUnique
            // Only use fallback for undefined (which shouldn't happen with Prisma)
            if (result === undefined) {
                return res.status(200).json({ success: true });
            }
            return res.status(200).json(result);
        } catch (prismaError) {
            console.error(`[Dev API Server] Prisma operation error for ${prismaModelName}.${action}:`, prismaError);
            // Make sure we send a proper error response before re-throwing
            if (!res.headersSent) {
                const errorMsg = prismaError instanceof Error ? prismaError.message : String(prismaError);
                return res.status(500).json({ 
                    error: errorMsg,
                    code: (prismaError as { code?: string })?.code,
                    meta: (prismaError as { meta?: unknown })?.meta
                });
            }
            throw prismaError; // Re-throw to be caught by outer catch
        }
    } catch (error) {
        console.error('[Dev API Server] Prisma API error:', error);
        
        // Extract error information
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        const errorName = error instanceof Error ? error.constructor.name : typeof error;
        
        // For Prisma errors, extract more details
        let prismaErrorCode: string | undefined;
        let prismaMeta: unknown;
        if (error && typeof error === 'object' && 'code' in error) {
            prismaErrorCode = String(error.code);
        }
        if (error && typeof error === 'object' && 'meta' in error) {
            prismaMeta = error.meta;
        }
        
        console.error('[Dev API Server] Error details:', {
            message: errorMessage,
            code: prismaErrorCode,
            meta: prismaMeta,
            stack: errorStack,
            type: errorName,
        });
        
        return res.status(500).json({ 
            error: errorMessage,
            code: prismaErrorCode,
            meta: prismaMeta,
            details: errorStack,
            type: errorName,
            // Include more details in development
            ...(process.env.NODE_ENV !== 'production' && {
                fullError: String(error),
                requestBody: { model, action, paramsKeys: params ? Object.keys(params) : [] }
            })
        });
    }
});

const PORT = 3001;
const server = createServer(app);

server.listen(PORT, () => {
    console.log(`[Dev API Server] Running on http://localhost:${PORT}`);
    console.log(`[Dev API Server] Prisma API: http://localhost:${PORT}/api/prisma/query`);
    console.log(`[Dev API Server] Database connection configured`);
    
    // Test Prisma connection
    prisma.$connect()
        .then(() => {
            console.log(`[Dev API Server] Prisma Client connected successfully`);
        })
        .catch((error) => {
            console.error(`[Dev API Server] Prisma Client connection error:`, error);
        });
});

process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    server.close();
});

