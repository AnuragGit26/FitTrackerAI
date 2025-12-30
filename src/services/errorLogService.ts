import { getSupabaseClientWithAuth } from './supabaseClient';
import { userScopedQuery } from './supabaseQueryBuilder';
import { requireUserId } from '@/utils/userIdValidation';
import { ErrorLog, ErrorLogCreateInput, ErrorType, ErrorSeverity } from '@/types/error';
import { db } from './database';

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
    /**
     * Send error log to Vercel API endpoint (non-blocking)
     */
    private async sendToVercel(errorLog: LocalErrorLog): Promise<void> {
        // Only send in production or if explicitly enabled
        const isProduction = import.meta.env.PROD;
        const enableVercelLogging = import.meta.env.VITE_ENABLE_VERCEL_LOGGING !== 'false';
        
        if (!isProduction && !enableVercelLogging) {
            return;
        }

        try {
            const vercelApiUrl = import.meta.env.VITE_VERCEL_API_URL || '/api/logs/error';
            
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
            console.warn('Failed to send error log to Vercel:', error);
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
            const id = await db.errorLogs.add(errorLog);
            
            // Send to Vercel (non-blocking)
            this.sendToVercel(errorLog).catch(() => {
                // Already handled in sendToVercel
            });
            
            return id as number;
        } catch (error) {
            console.error('Failed to save error log to IndexedDB:', error);
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
        return this.logError({
            userId,
            errorType: 'sync_error',
            errorMessage: error instanceof Error ? error.message : error,
            errorStack: error instanceof Error ? error.stack : undefined,
            tableName,
            recordId,
            operation,
            severity: 'error',
            context,
        });
    }

    /**
     * Log a workout error
     */
    async logWorkoutError(
        userId: string,
        error: Error | string,
        workoutId?: number,
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
        return logs.map(this.convertFromLocalFormat);
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
     * Sync error logs to Supabase
     */
    async syncToSupabase(userId: string): Promise<void> {
        const validatedUserId = requireUserId(userId, {
            functionName: 'syncToSupabase',
        });

        try {
            const client = await getSupabaseClientWithAuth(validatedUserId);
            const localLogs = await db.errorLogs
                .where('userId')
                .equals(validatedUserId)
                .filter((log) => !log.resolved || !log.resolvedAt)
                .toArray();

            if (localLogs.length === 0) {
                return;
            }

            const supabaseLogs = localLogs.map((log) =>
                this.convertToSupabaseFormat(log)
            );

            const { error } = await client
                .from('error_logs')
                .upsert(supabaseLogs, {
                    onConflict: 'id',
                    ignoreDuplicates: false,
                });

            if (error) {
                console.error('Failed to sync error logs to Supabase:', error);
                throw error;
            }
        } catch (error) {
            console.error('Error syncing error logs to Supabase:', error);
            throw error;
        }
    }

    /**
     * Pull error logs from Supabase
     */
    async pullFromSupabase(userId: string, since?: Date): Promise<void> {
        const validatedUserId = requireUserId(userId, {
            functionName: 'pullFromSupabase',
        });

        try {
            const client = await getSupabaseClientWithAuth(validatedUserId);
            let query = userScopedQuery(client, 'error_logs', validatedUserId).select('*');

            if (since) {
                query = query.gt('created_at', since.toISOString());
            }

            const { data, error } = await query.order('created_at', {
                ascending: false,
            });

            if (error) {
                throw error;
            }

            if (data && data.length > 0) {
                const localLogs = data.map((log) =>
                    this.convertFromSupabaseFormat(log)
                );

                await db.errorLogs.bulkPut(localLogs);
            }
        } catch (error) {
            console.error('Error pulling error logs from Supabase:', error);
            throw error;
        }
    }

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
            operation: log.operation as any,
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
}

export const errorLogService = new ErrorLogService();

