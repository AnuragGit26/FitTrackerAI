/**
 * Error handling utilities for consistent error management across the app
 */

export interface AppErrorInterface {
    message: string;
    code?: string;
    statusCode?: number;
    originalError?: Error;
    context?: Record<string, unknown>;
}

export class AppError extends Error implements AppErrorInterface {
    code?: string;
    statusCode?: number;
    originalError?: Error;
    context?: Record<string, unknown>;

    constructor(
        message: string,
        code?: string,
        statusCode?: number,
        originalError?: Error,
        context?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.statusCode = statusCode;
        this.originalError = originalError;
        this.context = context;

        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AppError);
        }
    }
}

/**
 * Wraps an async function with error handling and retry logic
 */
export async function withErrorHandling<T>(
    fn: () => Promise<T>,
    options: {
        retries?: number;
        retryDelay?: number;
        onError?: (error: Error) => void;
        errorMessage?: string;
    } = {}
): Promise<T> {
    const {
        retries = 0,
        retryDelay = 1000,
        onError,
        errorMessage = 'An error occurred',
    } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (onError) {
                onError(lastError);
            }

            // Don't retry on the last attempt
            if (attempt < retries) {
                await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
                continue;
            }

            // If it's already an AppError, throw it as-is
            if (error instanceof AppError) {
                throw error;
            }

            // Wrap unknown errors
            throw new AppError(
                errorMessage,
                'UNKNOWN_ERROR',
                undefined,
                lastError
            );
        }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError || new Error('Unknown error');
}

/**
 * Gets a user-friendly error message from an error
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
    if (error instanceof AppError) {
        return error.message;
    }

    if (error instanceof Error) {
        // Handle common error types
        if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            return 'Network error. Please check your internet connection and try again.';
        }

        if (error.message.includes('timeout')) {
            return 'Request timed out. Please try again.';
        }

        if (error.message.includes('API')) {
            return 'Service temporarily unavailable. Please try again later.';
        }

        // Return the error message if it's user-friendly
        if (error.message.length < 100) {
            return error.message;
        }
    }

    return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
}

/**
 * Logs an error (in production, this would send to an error tracking service)
 */
export async function logError(error: Error | AppError, context?: Record<string, unknown>, userId?: string): Promise<void> {
    const errorData = {
        message: error.message,
        stack: error.stack,
        name: error.name,
        ...(error instanceof AppError && {
            code: error.code,
            statusCode: error.statusCode,
            context: error.context,
        }),
        ...context,
        timestamp: new Date().toISOString(),
    };

    // In development, log to console
    if (import.meta.env.DEV) {
        console.error('Error logged:', errorData);
    }

    // Log to Supabase if userId is provided (non-blocking)
    if (userId) {
        try {
            const { errorLogService } = await import('@/services/errorLogService');
            await errorLogService.logError({
                userId,
                errorType: 'application_error',
                errorMessage: error.message,
                errorStack: error.stack,
                context: errorData,
                severity: error instanceof AppError && error.statusCode && error.statusCode >= 500 ? 'critical' : 'error',
            });
        } catch (logError) {
            console.error('Failed to log error to Supabase:', logError);
        }
    }

    // In production, send to error tracking service (e.g., Sentry)
    // Example:
    // if (import.meta.env.PROD) {
    //   Sentry.captureException(error, { extra: errorData });
    // }
}

/**
 * Creates an error handler for async operations
 */
export function createErrorHandler(
    defaultMessage: string,
    options: {
        log?: boolean;
        throwAppError?: boolean;
    } = {}
) {
    return (error: unknown, context?: Record<string, unknown>) => {
        const appError = error instanceof AppError
            ? error
            : new AppError(
                defaultMessage,
                'OPERATION_ERROR',
                undefined,
                error instanceof Error ? error : new Error(String(error)),
                context
            );

        if (options.log !== false) {
            logError(appError, context);
        }

        if (options.throwAppError) {
            throw appError;
        }

        return appError;
    };
}

