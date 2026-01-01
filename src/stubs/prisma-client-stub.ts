/**
 * Prisma Client Stub
 * 
 * This file is used to prevent Prisma Client from being bundled in the browser.
 * Type-only imports from @prisma/client will still work, but runtime imports
 * will use this stub which throws an error.
 * 
 * DO NOT import PrismaClient directly in browser code.
 * Use prismaClient.ts instead which makes HTTP requests.
 */

// Stub exports that match Prisma Client's API
export const PrismaClient = class {
    constructor() {
        throw new Error(
            'PrismaClient cannot be used directly in the browser. ' +
            'Use the prisma client from ./prismaClient.ts instead, ' +
            'which makes HTTP requests to the API server.'
        );
    }
};

// Export Prisma namespace for types (this is a stub - types come from @prisma/client)
export const Prisma = {} as unknown;

export default {};

