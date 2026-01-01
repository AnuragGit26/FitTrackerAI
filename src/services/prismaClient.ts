/**
 * Prisma Browser Client
 * 
 * Makes HTTP requests to Vercel API routes that use Prisma Client server-side.
 * This allows Prisma operations to work in the browser.
 */

// Base URL for Prisma API
const prismaApiUrl = '/api/prisma/query';

/**
 * Make a request to Prisma API route
 */
async function prismaRequest(model: string, action: string, params: unknown) {
    try {
        const response = await fetch(prismaApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ model, action, params }),
        });

        // Clone the response so we can read it multiple times if needed
        const responseClone = response.clone();
        
        if (!response.ok) {
            let errorMessage = `Prisma API error: ${response.statusText}`;
            let errorDetails: unknown = null;
            try {
                const error = await response.json();
                // Extract error message from various possible fields
                errorMessage = error.error || error.message || error.details || errorMessage;
                // Include additional context if available
                if (error.details && typeof error.details === 'string') {
                    errorMessage += ` - ${error.details}`;
                }
                if (error.requestBody) {
                    errorMessage += ` (Model: ${error.requestBody.model}, Action: ${error.requestBody.action})`;
                }
                errorDetails = error;
                console.error('[Prisma Client] API Error Details:', error);
            } catch (jsonError) {
                // If response is not JSON, try to read as text from the clone
                try {
                    const text = await responseClone.text();
                    errorMessage = text || errorMessage;
                    console.error('[Prisma Client] API Error (non-JSON):', {
                        status: response.status,
                        statusText: response.statusText,
                        responseText: text,
                        contentType: response.headers.get('content-type'),
                        jsonError: jsonError instanceof Error ? jsonError.message : String(jsonError)
                    });
                } catch (textError) {
                    // If both fail, just use status text
                    console.error('[Prisma Client] API Error (could not read response):', {
                        status: response.status,
                        statusText: response.statusText,
                        textError: textError instanceof Error ? textError.message : String(textError)
                    });
                }
            }
            const fullError = new Error(errorMessage);
            // Attach details to error object for debugging
            (fullError as Error & { details?: unknown }).details = errorDetails;
            throw fullError;
        }

        // Read the response body once
        const data = await response.json();
        return data;
    } catch (error) {
        if (error instanceof Error) {
            // Check if it's a network error (API route not available)
            if (error.message.includes('Failed to fetch') || error.message.includes('404')) {
                throw new Error(
                    'Prisma API route not available. ' +
                    'Please start the dev API server: npm run dev:api ' +
                    'Or use "vercel dev" for full API support.'
                );
            }
            throw error;
        }
        throw new Error('Unknown error in Prisma request');
    }
}

/**
 * Browser-compatible Prisma Client interface
 * Maps Prisma operations to API route calls
 */
class BrowserPrismaClient {
    // Workout operations
    get workout() {
        return {
            findMany: async (params?: { where?: unknown; orderBy?: unknown; take?: number; skip?: number }) => {
                return prismaRequest('workout', 'findMany', params || {});
            },
            findFirst: async (params?: { where?: unknown }) => {
                return prismaRequest('workout', 'findFirst', params || {});
            },
            findUnique: async (params: { where: { id: string } }) => {
                return prismaRequest('workout', 'findUnique', params);
            },
            create: async (params: { data: unknown }) => {
                return prismaRequest('workout', 'create', params);
            },
            update: async (params: { where: { id: string }; data: unknown }) => {
                return prismaRequest('workout', 'update', params);
            },
            upsert: async (params: { where: { id: string }; update: unknown; create: unknown }) => {
                return prismaRequest('workout', 'upsert', params);
            },
            delete: async (params: { where: { id: string } }) => {
                return prismaRequest('workout', 'delete', params);
            },
        };
    }

    // Exercise operations
    get exercise() {
        return {
            findMany: async (params?: { where?: unknown; orderBy?: unknown; take?: number; skip?: number }) => {
                return prismaRequest('exercise', 'findMany', params || {});
            },
            findFirst: async (params?: { where?: unknown }) => {
                return prismaRequest('exercise', 'findFirst', params || {});
            },
            findUnique: async (params: { where: { exerciseId: string } }) => {
                return prismaRequest('exercise', 'findUnique', params);
            },
            create: async (params: { data: unknown }) => {
                return prismaRequest('exercise', 'create', params);
            },
            update: async (params: { where: { exerciseId: string }; data: unknown }) => {
                return prismaRequest('exercise', 'update', params);
            },
            upsert: async (params: { where: { exerciseId: string }; update: unknown; create: unknown }) => {
                return prismaRequest('exercise', 'upsert', params);
            },
        };
    }

    // WorkoutTemplate operations
    get workoutTemplate() {
        return {
            findMany: async (params?: { where?: unknown; orderBy?: unknown }) => {
                return prismaRequest('workoutTemplate', 'findMany', params || {});
            },
            findFirst: async (params?: { where?: unknown }) => {
                return prismaRequest('workoutTemplate', 'findFirst', params || {});
            },
            create: async (params: { data: unknown }) => {
                return prismaRequest('workoutTemplate', 'create', params);
            },
            update: async (params: { where: { templateId: string }; data: unknown }) => {
                return prismaRequest('workoutTemplate', 'update', params);
            },
            upsert: async (params: { where: { templateId: string }; update: unknown; create: unknown }) => {
                return prismaRequest('workoutTemplate', 'upsert', params);
            },
        };
    }

    // PlannedWorkout operations
    get plannedWorkout() {
        return {
            findMany: async (params?: { where?: unknown; orderBy?: unknown }) => {
                return prismaRequest('plannedWorkout', 'findMany', params || {});
            },
            findFirst: async (params?: { where?: unknown }) => {
                return prismaRequest('plannedWorkout', 'findFirst', params || {});
            },
            create: async (params: { data: unknown }) => {
                return prismaRequest('plannedWorkout', 'create', params);
            },
            update: async (params: { where: { plannedWorkoutId: string }; data: unknown }) => {
                return prismaRequest('plannedWorkout', 'update', params);
            },
            upsert: async (params: { where: { plannedWorkoutId: string }; update: unknown; create: unknown }) => {
                return prismaRequest('plannedWorkout', 'upsert', params);
            },
        };
    }

    // MuscleStatus operations
    get muscleStatus() {
        return {
            findMany: async (params?: { where?: unknown; orderBy?: unknown }) => {
                return prismaRequest('muscleStatus', 'findMany', params || {});
            },
            findFirst: async (params?: { where?: unknown }) => {
                return prismaRequest('muscleStatus', 'findFirst', params || {});
            },
            create: async (params: { data: unknown }) => {
                return prismaRequest('muscleStatus', 'create', params);
            },
            update: async (params: { where: { userId_muscle: { userId: string; muscle: string } }; data: unknown }) => {
                return prismaRequest('muscleStatus', 'update', params);
            },
            upsert: async (params: { where: { userId_muscle: { userId: string; muscle: string } }; update: unknown; create: unknown }) => {
                return prismaRequest('muscleStatus', 'upsert', params);
            },
        };
    }

    // UserProfile operations
    get userProfile() {
        return {
            findMany: async (params?: { where?: unknown }) => {
                return prismaRequest('userProfile', 'findMany', params || {});
            },
            findFirst: async (params?: { where?: unknown }) => {
                return prismaRequest('userProfile', 'findFirst', params || {});
            },
            create: async (params: { data: unknown }) => {
                return prismaRequest('userProfile', 'create', params);
            },
            update: async (params: { where: { userId: string }; data: unknown }) => {
                return prismaRequest('userProfile', 'update', params);
            },
            upsert: async (params: { where: { userId: string }; update: unknown; create: unknown }) => {
                return prismaRequest('userProfile', 'upsert', params);
            },
        };
    }

    // Setting operations
    get setting() {
        return {
            findMany: async (params?: { where?: unknown; orderBy?: unknown }) => {
                return prismaRequest('setting', 'findMany', params || {});
            },
            findFirst: async (params?: { where?: unknown }) => {
                return prismaRequest('setting', 'findFirst', params || {});
            },
            create: async (params: { data: unknown }) => {
                return prismaRequest('setting', 'create', params);
            },
            update: async (params: { where: { userId_key: { userId: string; key: string } }; data: unknown }) => {
                return prismaRequest('setting', 'update', params);
            },
            upsert: async (params: { where: { userId_key: { userId: string; key: string } }; update: unknown; create: unknown }) => {
                return prismaRequest('setting', 'upsert', params);
            },
        };
    }

    // Notification operations
    get notification() {
        return {
            findMany: async (params?: { where?: unknown; orderBy?: unknown }) => {
                return prismaRequest('notification', 'findMany', params || {});
            },
            findFirst: async (params?: { where?: unknown }) => {
                return prismaRequest('notification', 'findFirst', params || {});
            },
            create: async (params: { data: unknown }) => {
                return prismaRequest('notification', 'create', params);
            },
            update: async (params: { where: { notificationId: string }; data: unknown }) => {
                return prismaRequest('notification', 'update', params);
            },
            upsert: async (params: { where: { notificationId: string }; update: unknown; create: unknown }) => {
                return prismaRequest('notification', 'upsert', params);
            },
        };
    }

    // SleepLog operations
    get sleepLog() {
        return {
            findMany: async (params?: { where?: unknown; orderBy?: unknown }) => {
                return prismaRequest('sleepLog', 'findMany', params || {});
            },
            findFirst: async (params?: { where?: unknown }) => {
                return prismaRequest('sleepLog', 'findFirst', params || {});
            },
            create: async (params: { data: unknown }) => {
                return prismaRequest('sleepLog', 'create', params);
            },
            update: async (params: { where: { userId_date: { userId: string; date: Date } }; data: unknown }) => {
                return prismaRequest('sleepLog', 'update', params);
            },
            upsert: async (params: { where: { userId_date: { userId: string; date: Date } }; update: unknown; create: unknown }) => {
                return prismaRequest('sleepLog', 'upsert', params);
            },
        };
    }

    // RecoveryLog operations
    get recoveryLog() {
        return {
            findMany: async (params?: { where?: unknown; orderBy?: unknown }) => {
                return prismaRequest('recoveryLog', 'findMany', params || {});
            },
            findFirst: async (params?: { where?: unknown }) => {
                return prismaRequest('recoveryLog', 'findFirst', params || {});
            },
            create: async (params: { data: unknown }) => {
                return prismaRequest('recoveryLog', 'create', params);
            },
            update: async (params: { where: { userId_date: { userId: string; date: Date } }; data: unknown }) => {
                return prismaRequest('recoveryLog', 'update', params);
            },
            upsert: async (params: { where: { userId_date: { userId: string; date: Date } }; update: unknown; create: unknown }) => {
                return prismaRequest('recoveryLog', 'upsert', params);
            },
        };
    }

    // ErrorLog operations
    get errorLog() {
        return {
            findMany: async (params?: { where?: unknown; orderBy?: unknown }) => {
                return prismaRequest('errorLog', 'findMany', params || {});
            },
            findFirst: async (params?: { where?: unknown }) => {
                return prismaRequest('errorLog', 'findFirst', params || {});
            },
            create: async (params: { data: unknown }) => {
                return prismaRequest('errorLog', 'create', params);
            },
            update: async (params: { where: { id: string }; data: unknown }) => {
                return prismaRequest('errorLog', 'update', params);
            },
            upsert: async (params: { where: { id: string }; update: unknown; create: unknown }) => {
                return prismaRequest('errorLog', 'upsert', params);
            },
        };
    }

    // Transaction support (stub - executes operations sequentially)
    async $transaction<T>(callback: (tx: BrowserPrismaClient) => Promise<T>): Promise<T> {
        // Execute operations sequentially since we can't do real transactions via API
        return callback(this);
    }

    async $disconnect(): Promise<void> {
        // No-op for browser client
    }
}

let prismaClient: BrowserPrismaClient | null = null;

/**
 * Get Prisma Client instance (singleton)
 * Configured for browser use via API routes
 */
export function getPrismaClient(): BrowserPrismaClient {
    if (!prismaClient) {
        prismaClient = new BrowserPrismaClient();
    }
    return prismaClient;
}

/**
 * Get Prisma Client connection status
 */
export function getPrismaConnectionStatus(): {
    isConnected: boolean;
} {
    return {
        isConnected: prismaClient !== null,
    };
}

/**
 * Disconnect Prisma Client
 */
export async function disconnectPrisma(): Promise<void> {
    if (prismaClient) {
        await prismaClient.$disconnect();
        prismaClient = null;
    }
}

/**
 * Reset Prisma Client (useful for testing)
 */
export function resetPrismaClient(): void {
    prismaClient = null;
}

// Export Prisma Client instance for direct use
export const prisma = getPrismaClient();
