/**
 * MongoDB Client - Prisma Compatibility Layer
 * 
 * This file provides backward compatibility for code that imports from mongodbClient.
 * All functionality has been migrated to Prisma Client.
 * 
 * @deprecated Use prismaClient.ts instead
 */

import { prisma, getPrismaClient, getPrismaConnectionStatus, disconnectPrisma } from './prismaClient';

/**
 * @deprecated Use getPrismaClient() from prismaClient.ts instead
 */
export async function connectToMongoDB() {
    // Prisma Client is already initialized, just return it
    return getPrismaClient();
}

/**
 * @deprecated Use getPrismaConnectionStatus() from prismaClient.ts instead
 */
export function getMongoDBConnectionStatus() {
    const status = getPrismaConnectionStatus();
    return {
        isConnected: status.isConnected,
        readyState: status.isConnected ? 1 : 0,
    };
}

/**
 * @deprecated Use disconnectPrisma() from prismaClient.ts instead
 */
export async function disconnectFromMongoDB() {
    return disconnectPrisma();
}

/**
 * @deprecated Use getPrismaClient() from prismaClient.ts instead
 */
export async function getMongoDBConnection(userId?: string) {
    if (userId) {
        // Validate userId if provided
        const { requireUserId } = await import('@/utils/userIdValidation');
        requireUserId(userId, {
            functionName: 'getMongoDBConnection',
            additionalInfo: { operation: 'mongodb_connection' },
        });
    }
    return getPrismaClient();
}

/**
 * @deprecated Use resetPrismaClient() from prismaClient.ts instead
 */
export function resetMongoDBConnection() {
    // Import synchronously for compatibility
    import('./prismaClient').then(({ resetPrismaClient }) => {
        resetPrismaClient();
    });
}

// Export Prisma client for direct use
export { prisma };
