import type { Plugin } from 'vite';

/**
 * Vite plugin to prevent Prisma Client from being bundled in the browser
 * Type-only imports are fine, but runtime imports will be replaced with a stub
 */
export function excludePrismaPlugin(): Plugin {
    return {
        name: 'exclude-prisma',
        enforce: 'pre',
        resolveId(id) {
            // Intercept @prisma/client imports and replace with stub
            // Type-only imports (import type) won't reach here, but runtime imports will
            if (id === '@prisma/client') {
                return {
                    id: '\0virtual:prisma-client-stub',
                    moduleSideEffects: false,
                };
            }
            return null;
        },
        load(id) {
            if (id === '\0virtual:prisma-client-stub') {
                // Return a minimal stub that won't cause bundling issues
                // This should never be called since we use type-only imports
                return `
                    console.warn('Prisma Client should not be imported in browser code. Use prismaClient.ts instead.');
                    export const PrismaClient = class {};
                    export const Prisma = {};
                    export default {};
                `;
            }
            return null;
        },
    };
}

