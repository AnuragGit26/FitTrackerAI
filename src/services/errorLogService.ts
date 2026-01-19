import { requireUserId } from '@/utils/userIdValidation';
import { ErrorLog, ErrorLogCreateInput, ErrorType, ErrorSeverity } from '@/types/error';
import { db } from './database';
import { logger } from '@/utils/logger';

interface LocalErrorLog {
    id?: number;
    userId: string;
    errorType: ErrorType;
    errorMessage: string;
    errorStack?: string;
    context?: Record<string, unknown>;
    tableName?: string;
    recordId?: string | number;
    operation?: string;
    severity: ErrorSeverity;
    resolved: boolean;
    resolvedAt?: number | null;
    resolvedBy?: string;
    version?: number;
    deletedAt?: number | null;
    createdAt: number;
    updatedAt: number;
}

class ErrorLogService {
    private isOfflineError(error: Error | string): boolean {
        const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
        return message.includes('client is offline');
    }

    /**
     * Send error log to Vercel API endpoint (non-blocking)
     */
    private async sendToVercel(errorLog: LocalErrorLog): Promise<void> {
        // Only send in production or if explicitly enabled
        const isProduction = import.meta.env.PROD;
        const enableVercelLogging = import.meta.env.VITE_ENABLE_VERCEL_LOGGING === 'true';
        
        // Skip Vercel logging in development unless explicitly enabled
        if (!isProduction && !enableVercelLogging) {
            return;
        }

        // Ensure we have a valid API URL (must be absolute in production)
        const vercelApiUrl = import.meta.env.VITE_VERCEL_API_URL;
        if (!vercelApiUrl) {
            // In production, we need an API URL configured
            if (isProduction) {
                logger.warn('[ErrorLogService] VITE_VERCEL_API_URL not configured, skipping Vercel logging');
            }
            return;
        }

        try {
            await fetch(vercelApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: errorLog.userId,
                    errorType: errorLog.errorType,
                    errorMessage: errorLog.errorMessage,
                    errorStack: errorLog.errorStack,
                    context: errorLog.context,
                    tableName: errorLog.tableName,
                    recordId: errorLog.recordId,
                    operation: errorLog.operation,
                    severity: errorLog.severity,
                    timestamp: new Date(errorLog.createdAt).toISOString(),
                }),
            });
        } catch (error) {
            // Silently fail - don't block error logging if Vercel endpoint is unavailable
            // Only log in production to avoid console spam in development
            if (isProduction) {
                logger.warn('[ErrorLogService] Failed to send error log to Vercel:', error);
            }
        }
    }

    /**
     * Log an error to IndexedDB and queue for Supabase sync
     */
    async logError(input: ErrorLogCreateInput): Promise<number> {
        const validatedUserId = requireUserId(input.userId, {
            functionName: 'logError',
            additionalInfo: { errorType: input.errorType },
        });

        const errorLog: LocalErrorLog = {
            userId: validatedUserId,
            errorType: input.errorType,
            errorMessage: input.errorMessage,
            errorStack: input.errorStack,
            context: input.context,
            tableName: input.tableName,
            recordId: input.recordId,
            operation: input.operation,
            severity: input.severity || 'error',
            resolved: false,
            version: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        try {
            // Convert LocalErrorLog to ErrorLog format for database
            const errorLogForDb: ErrorLog = {
                id: errorLog.id,
                userId: errorLog.userId,
                errorType: errorLog.errorType,
                errorMessage: errorLog.errorMessage,
                errorStack: errorLog.errorStack,
                context: errorLog.context,
                tableName: errorLog.tableName,
                recordId: errorLog.recordId,
                operation: errorLog.operation as ErrorLog['operation'],
                severity: errorLog.severity,
                resolved: errorLog.resolved,
                resolvedAt: errorLog.resolvedAt ? new Date(errorLog.resolvedAt) : null,
                resolvedBy: errorLog.resolvedBy,
                version: errorLog.version,
                deletedAt: errorLog.deletedAt ? new Date(errorLog.deletedAt) : null,
                createdAt: new Date(errorLog.createdAt),
                updatedAt: new Date(errorLog.updatedAt),
            };
            
            const id = await db.errorLogs.add(errorLogForDb);
            
            // Send to Vercel (non-blocking)
            this.sendToVercel(errorLog).catch(() => {
                // Already handled in sendToVercel
            });
            
            return id as number;
        } catch (error) {
            logger.error('Failed to save error log to IndexedDB:', error);
            throw error;
        }
    }

    /**
     * Log a sync error
     */
    async logSyncError(
        userId: string,
        tableName: string,
        recordId: string | number,
        error: Error | string,
        operation: 'create' | 'update' | 'delete' | 'read' = 'read',
        context?: Record<string, unknown>
    ): Promise<number> {
        const severity: ErrorSeverity = this.isOfflineError(error) ? 'warning' : 'error';
        return this.logError({
            userId,
            errorType: 'sync_error',
            errorMessage: error instanceof Error ? error.message : error,
            errorStack: error instanceof Error ? error.stack : undefined,
            tableName,
            recordId,
            operation,
            severity,
            context,
        });
    }

    /**
     * Log a workout error
     */
    async logWorkoutError(
        userId: string,
        error: Error | string,
        workoutId?: string,
        context?: Record<string, unknown>
    ): Promise<number> {
        return this.logError({
            userId,
            errorType: 'workout_error',
            errorMessage: error instanceof Error ? error.message : error,
            errorStack: error instanceof Error ? error.stack : undefined,
            recordId: workoutId,
            operation: 'other',
            severity: 'error',
            context,
        });
    }

    /**
     * Get all error logs for a user from IndexedDB
     */
    async getErrorLogs(userId: string, resolved?: boolean): Promise<ErrorLog[]> {
        const validatedUserId = requireUserId(userId, {
            functionName: 'getErrorLogs',
        });

        let query = db.errorLogs.where('userId').equals(validatedUserId);

        if (resolved !== undefined) {
            query = query.filter((log) => log.resolved === resolved);
        }

        const logs = await query.toArray();
        // Convert ErrorLog[] from database to LocalErrorLog format, then back to ErrorLog
        return logs.map((log: ErrorLog): ErrorLog => {
            // Convert ErrorLog (with Date) to LocalErrorLog (with number), then back
            const localLog: LocalErrorLog = {
                id: log.id,
                userId: log.userId,
                errorType: log.errorType,
                errorMessage: log.errorMessage,
                errorStack: log.errorStack,
                context: log.context,
                tableName: log.tableName,
                recordId: log.recordId,
                operation: log.operation,
                severity: log.severity,
                resolved: log.resolved,
                resolvedAt: log.resolvedAt ? log.resolvedAt.getTime() : null,
                resolvedBy: log.resolvedBy,
                version: log.version,
                deletedAt: log.deletedAt ? log.deletedAt.getTime() : null,
                createdAt: log.createdAt.getTime(),
                updatedAt: log.updatedAt.getTime(),
            };
            return this.convertFromLocalFormat(localLog);
        });
    }

    /**
     * Mark an error as resolved
     */
    async markResolved(
        id: number,
        userId: string,
        resolvedBy?: string
    ): Promise<void> {
        const validatedUserId = requireUserId(userId, {
            functionName: 'markResolved',
        });

        const log = await db.errorLogs.get(id);
        if (!log || log.userId !== validatedUserId) {
            throw new Error('Error log not found');
        }

        await db.errorLogs.update(id, {
            resolved: true,
            resolvedAt: Date.now(),
            resolvedBy: resolvedBy || validatedUserId,
            updatedAt: Date.now(),
        });
    }

    /**
     * Sync error logs (deprecated - error logs now local-only)
     */
    async syncToMongoDB(_userId: string): Promise<void> {
        // Error logs are now stored locally only in IndexedDB
        // Cloud sync will be implemented with Firestore in future if needed
        logger.log('[ErrorLogService] Error log sync is deprecated - logs are local-only');
        return Promise.resolve();
    }

    /**
     * Sync error logs (deprecated - error logs now local-only)
     */
    async syncToSupabase(_userId: string): Promise<void> {
        return this.syncToMongoDB(_userId);
    }

    /**
     * Pull error logs (deprecated - error logs now local-only)
     */
    async pullFromSupabase(_userId: string, _since?: Date): Promise<void> {
        // Error logs are now stored locally only in IndexedDB
        logger.log('[ErrorLogService] Error log pull is deprecated - logs are local-only');
        return Promise.resolve();
    }

    // Unused but kept for potential future use
    // @ts-expect-error - Unused but kept for potential future use
    private convertToSupabaseFormat(log: LocalErrorLog): Record<string, unknown> {
        return {
            id: log.id,
            user_id: log.userId,
            error_type: log.errorType,
            error_message: log.errorMessage,
            error_stack: log.errorStack,
            context: log.context ? JSON.stringify(log.context) : null,
            table_name: log.tableName,
            record_id: log.recordId ? String(log.recordId) : null,
            operation: log.operation,
            severity: log.severity,
            resolved: log.resolved,
            resolved_at: log.resolvedAt
                ? new Date(log.resolvedAt).toISOString()
                : null,
            resolved_by: log.resolvedBy,
            version: log.version || 1,
            deleted_at: log.deletedAt
                ? new Date(log.deletedAt).toISOString()
                : null,
            created_at: new Date(log.createdAt).toISOString(),
            updated_at: new Date(log.updatedAt).toISOString(),
        };
    }

    private convertFromSupabaseFormat(
        record: Record<string, unknown>
    ): LocalErrorLog {
        return {
            id: record.id as number,
            userId: record.user_id as string,
            errorType: record.error_type as ErrorType,
            errorMessage: record.error_message as string,
            errorStack: record.error_stack as string | undefined,
            context: record.context
                ? (typeof record.context === 'string'
                      ? JSON.parse(record.context)
                      : record.context)
                : undefined,
            tableName: record.table_name as string | undefined,
            recordId: record.record_id as string | number | undefined,
            operation: record.operation as string | undefined,
            severity: record.severity as ErrorSeverity,
            resolved: record.resolved as boolean,
            resolvedAt: record.resolved_at
                ? new Date(record.resolved_at as string).getTime()
                : null,
            resolvedBy: record.resolved_by as string | undefined,
            version: record.version as number | undefined,
            deletedAt: record.deleted_at
                ? new Date(record.deleted_at as string).getTime()
                : null,
            createdAt: new Date(record.created_at as string).getTime(),
            updatedAt: new Date(record.updated_at as string).getTime(),
        };
    }

    private convertFromLocalFormat(log: LocalErrorLog): ErrorLog {
        return {
            id: log.id,
            userId: log.userId,
            errorType: log.errorType,
            errorMessage: log.errorMessage,
            errorStack: log.errorStack,
            context: log.context,
            tableName: log.tableName,
            recordId: log.recordId,
            operation: log.operation as 'create' | 'update' | 'delete' | 'read' | 'sync' | 'other' | undefined,
            severity: log.severity,
            resolved: log.resolved,
            resolvedAt: log.resolvedAt ? new Date(log.resolvedAt) : null,
            resolvedBy: log.resolvedBy,
            version: log.version,
            deletedAt: log.deletedAt ? new Date(log.deletedAt) : null,
            createdAt: new Date(log.createdAt),
            updatedAt: new Date(log.updatedAt),
        };
    }

    /**
     * Get current local date/time as a Date object
     */
    private getCurrentLocalDate(): Date {
        return new Date();
    }

    /**
     * Convert a timestamp to a local Date object
     */
    private timestampToLocalDate(timestamp: number | Date | string | null | undefined): Date | null {
        if (!timestamp) {
    return null;
  }
        if (timestamp instanceof Date) {
    return timestamp;
  }
        if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
        return new Date(timestamp);
    }

    private convertToMongoFormat(log: LocalErrorLog): Record<string, unknown> {
        const result: Record<string, unknown> = {
            userId: log.userId,
            errorType: log.errorType,
            errorMessage: log.errorMessage,
            errorStack: log.errorStack,
            context: log.context,
            tableName: log.tableName,
            recordId: log.recordId,
            operation: log.operation,
            severity: log.severity,
            resolved: log.resolved,
            resolvedAt: this.timestampToLocalDate(log.resolvedAt),
            resolvedBy: log.resolvedBy,
            version: log.version || 1,
            deletedAt: this.timestampToLocalDate(log.deletedAt),
            createdAt: this.timestampToLocalDate(log.createdAt) || this.getCurrentLocalDate(),
            updatedAt: this.getCurrentLocalDate(), // Always use current local date/time for updates
        };
        
        // Include id if it exists (for updates/upserts)
        if (log.id !== undefined) {
            result.id = String(log.id);
        }
        
        return result;
    }
}

export const errorLogService = new ErrorLogService();

