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
 * @param model - Prisma model name
 * @param action - Prisma action (findMany, create, etc.)
 * @param params - Parameters for the Prisma operation
 * @param accessToken - Optional Auth0 access token for authentication
 */
async function prismaRequest(
    model: string,
    action: string,
    params: unknown,
    accessToken?: string
) {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    // Add Authorization header if token is provided
    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    try {
        const response = await fetch(prismaApiUrl, {
            method: 'POST',
            headers,
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
 * 
 * Note: All operations require an Auth0 access token for authentication.
 * Pass the token obtained from useAuth0().getAccessTokenSilently() to methods.
 */
class BrowserPrismaClient {
    private accessToken: string | undefined;

    /**
     * Set the Auth0 access token for all subsequent operations
     */
    setAccessToken(token: string | undefined): void {
        this.accessToken = token;
    }

    /**
     * Get the current access token
     */
    getAccessToken(): string | undefined {
        return this.accessToken;
    }

    // Workout operations
    get workout() {
        const token = this.accessToken;
        return {
            findMany: async (params?: { where?: unknown; orderBy?: unknown; take?: number; skip?: number }, t?: string) => {
                return prismaRequest('workout', 'findMany', params || {}, t || token);
            },
            findFirst: async (params?: { where?: unknown }, t?: string) => {
                return prismaRequest('workout', 'findFirst', params || {}, t || token);
            },
            findUnique: async (params: { where: { id: string } }, t?: string) => {
                return prismaRequest('workout', 'findUnique', params, t || token);
            },
            create: async (params: { data: unknown }, t?: string) => {
                return prismaRequest('workout', 'create', params, t || token);
            },
            update: async (params: { where: { id: string }; data: unknown }, t?: string) => {
                return prismaRequest('workout', 'update', params, t || token);
            },
            upsert: async (params: { where: { id: string }; update: unknown; create: unknown }, t?: string) => {
                return prismaRequest('workout', 'upsert', params, t || token);
            },
            delete: async (params: { where: { id: string } }, t?: string) => {
                return prismaRequest('workout', 'delete', params, t || token);
            },
        };
    }

    // Exercise operations
    get exercise() {
        const token = this.accessToken;
        return {
            findMany: async (params?: { where?: unknown; orderBy?: unknown; take?: number; skip?: number }, t?: string) => {
                return prismaRequest('exercise', 'findMany', params || {}, t || token);
            },
            findFirst: async (params?: { where?: unknown }, t?: string) => {
                return prismaRequest('exercise', 'findFirst', params || {}, t || token);
            },
            findUnique: async (params: { where: { exerciseId: string } }, t?: string) => {
                return prismaRequest('exercise', 'findUnique', params, t || token);
            },
            create: async (params: { data: unknown }, t?: string) => {
                return prismaRequest('exercise', 'create', params, t || token);
            },
            update: async (params: { where: { exerciseId: string }; data: unknown }, t?: string) => {
                return prismaRequest('exercise', 'update', params, t || token);
            },
            upsert: async (params: { where: { exerciseId: string }; update: unknown; create: unknown }, t?: string) => {
                return prismaRequest('exercise', 'upsert', params, t || token);
            },
        };
    }

    // WorkoutTemplate operations
    get workoutTemplate() {
        const token = this.accessToken;
        return {
            findMany: async (params?: { where?: unknown; orderBy?: unknown }, t?: string) => {
                return prismaRequest('workoutTemplate', 'findMany', params || {}, t || token);
            },
            findFirst: async (params?: { where?: unknown }, t?: string) => {
                return prismaRequest('workoutTemplate', 'findFirst', params || {}, t || token);
            },
            create: async (params: { data: unknown }, t?: string) => {
                return prismaRequest('workoutTemplate', 'create', params, t || token);
            },
            update: async (params: { where: { templateId: string }; data: unknown }, t?: string) => {
                return prismaRequest('workoutTemplate', 'update', params, t || token);
            },
            upsert: async (params: { where: { templateId: string }; update: unknown; create: unknown }, t?: string) => {
                return prismaRequest('workoutTemplate', 'upsert', params, t || token);
            },
        };
    }

    // PlannedWorkout operations
    get plannedWorkout() {
        const token = this.accessToken;
        return {
            findMany: async (params?: { where?: unknown; orderBy?: unknown }, t?: string) => {
                return prismaRequest('plannedWorkout', 'findMany', params || {}, t || token);
            },
            findFirst: async (params?: { where?: unknown }, t?: string) => {
                return prismaRequest('plannedWorkout', 'findFirst', params || {}, t || token);
            },
            create: async (params: { data: unknown }, t?: string) => {
                return prismaRequest('plannedWorkout', 'create', params, t || token);
            },
            update: async (params: { where: { plannedWorkoutId: string }; data: unknown }, t?: string) => {
                return prismaRequest('plannedWorkout', 'update', params, t || token);
            },
            upsert: async (params: { where: { plannedWorkoutId: string }; update: unknown; create: unknown }, t?: string) => {
                return prismaRequest('plannedWorkout', 'upsert', params, t || token);
            },
        };
    }

    // MuscleStatus operations
    get muscleStatus() {
        const token = this.accessToken;
        return {
            findMany: async (params?: { where?: unknown; orderBy?: unknown }, t?: string) => {
                return prismaRequest('muscleStatus', 'findMany', params || {}, t || token);
            },
            findFirst: async (params?: { where?: unknown }, t?: string) => {
                return prismaRequest('muscleStatus', 'findFirst', params || {}, t || token);
            },
            create: async (params: { data: unknown }, t?: string) => {
                return prismaRequest('muscleStatus', 'create', params, t || token);
            },
            update: async (params: { where: { userId_muscle: { userId: string; muscle: string } }; data: unknown }, t?: string) => {
                return prismaRequest('muscleStatus', 'update', params, t || token);
            },
            upsert: async (params: { where: { userId_muscle: { userId: string; muscle: string } }; update: unknown; create: unknown }, t?: string) => {
                return prismaRequest('muscleStatus', 'upsert', params, t || token);
            },
        };
    }

    // UserProfile operations
    get userProfile() {
        const token = this.accessToken;
        return {
            findMany: async (params?: { where?: unknown }, t?: string) => {
                return prismaRequest('userProfile', 'findMany', params || {}, t || token);
            },
            findFirst: async (params?: { where?: unknown }, t?: string) => {
                return prismaRequest('userProfile', 'findFirst', params || {}, t || token);
            },
            create: async (params: { data: unknown }, t?: string) => {
                return prismaRequest('userProfile', 'create', params, t || token);
            },
            update: async (params: { where: { userId: string }; data: unknown }, t?: string) => {
                return prismaRequest('userProfile', 'update', params, t || token);
            },
            upsert: async (params: { where: { userId: string }; update: unknown; create: unknown }, t?: string) => {
                return prismaRequest('userProfile', 'upsert', params, t || token);
            },
        };
    }

    // Setting operations
    get setting() {
        const token = this.accessToken;
        return {
            findMany: async (params?: { where?: unknown; orderBy?: unknown }, t?: string) => {
                return prismaRequest('setting', 'findMany', params || {}, t || token);
            },
            findFirst: async (params?: { where?: unknown }, t?: string) => {
                return prismaRequest('setting', 'findFirst', params || {}, t || token);
            },
            create: async (params: { data: unknown }, t?: string) => {
                return prismaRequest('setting', 'create', params, t || token);
            },
            update: async (params: { where: { userId_key: { userId: string; key: string } }; data: unknown }, t?: string) => {
                return prismaRequest('setting', 'update', params, t || token);
            },
            upsert: async (params: { where: { userId_key: { userId: string; key: string } }; update: unknown; create: unknown }, t?: string) => {
                return prismaRequest('setting', 'upsert', params, t || token);
            },
        };
    }

    // Notification operations
    get notification() {
        const token = this.accessToken;
        return {
            findMany: async (params?: { where?: unknown; orderBy?: unknown }, t?: string) => {
                return prismaRequest('notification', 'findMany', params || {}, t || token);
            },
            findFirst: async (params?: { where?: unknown }, t?: string) => {
                return prismaRequest('notification', 'findFirst', params || {}, t || token);
            },
            create: async (params: { data: unknown }, t?: string) => {
                return prismaRequest('notification', 'create', params, t || token);
            },
            update: async (params: { where: { notificationId: string }; data: unknown }, t?: string) => {
                return prismaRequest('notification', 'update', params, t || token);
            },
            upsert: async (params: { where: { notificationId: string }; update: unknown; create: unknown }, t?: string) => {
                return prismaRequest('notification', 'upsert', params, t || token);
            },
        };
    }

    // SleepLog operations
    get sleepLog() {
        const token = this.accessToken;
        return {
            findMany: async (params?: { where?: unknown; orderBy?: unknown }, t?: string) => {
                return prismaRequest('sleepLog', 'findMany', params || {}, t || token);
            },
            findFirst: async (params?: { where?: unknown }, t?: string) => {
                return prismaRequest('sleepLog', 'findFirst', params || {}, t || token);
            },
            create: async (params: { data: unknown }, t?: string) => {
                return prismaRequest('sleepLog', 'create', params, t || token);
            },
            update: async (params: { where: { userId_date: { userId: string; date: Date } }; data: unknown }, t?: string) => {
                return prismaRequest('sleepLog', 'update', params, t || token);
            },
            upsert: async (params: { where: { userId_date: { userId: string; date: Date } }; update: unknown; create: unknown }, t?: string) => {
                return prismaRequest('sleepLog', 'upsert', params, t || token);
            },
        };
    }

    // RecoveryLog operations
    get recoveryLog() {
        const token = this.accessToken;
        return {
            findMany: async (params?: { where?: unknown; orderBy?: unknown }, t?: string) => {
                return prismaRequest('recoveryLog', 'findMany', params || {}, t || token);
            },
            findFirst: async (params?: { where?: unknown }, t?: string) => {
                return prismaRequest('recoveryLog', 'findFirst', params || {}, t || token);
            },
            create: async (params: { data: unknown }, t?: string) => {
                return prismaRequest('recoveryLog', 'create', params, t || token);
            },
            update: async (params: { where: { userId_date: { userId: string; date: Date } }; data: unknown }, t?: string) => {
                return prismaRequest('recoveryLog', 'update', params, t || token);
            },
            upsert: async (params: { where: { userId_date: { userId: string; date: Date } }; update: unknown; create: unknown }, t?: string) => {
                return prismaRequest('recoveryLog', 'upsert', params, t || token);
            },
        };
    }

    // ErrorLog operations
    get errorLog() {
        const token = this.accessToken;
        return {
            findMany: async (params?: { where?: unknown; orderBy?: unknown }, t?: string) => {
                return prismaRequest('errorLog', 'findMany', params || {}, t || token);
            },
            findFirst: async (params?: { where?: unknown }, t?: string) => {
                return prismaRequest('errorLog', 'findFirst', params || {}, t || token);
            },
            create: async (params: { data: unknown }, t?: string) => {
                return prismaRequest('errorLog', 'create', params, t || token);
            },
            update: async (params: { where: { id: string }; data: unknown }, t?: string) => {
                return prismaRequest('errorLog', 'update', params, t || token);
            },
            upsert: async (params: { where: { id: string }; update: unknown; create: unknown }, t?: string) => {
                return prismaRequest('errorLog', 'upsert', params, t || token);
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
