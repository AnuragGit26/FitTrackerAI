// Data transformation utilities: PostgreSQL (snake_case) → MongoDB (camelCase)

import type { SyncableTable } from './types.ts';

/**
 * Convert snake_case string to camelCase
 */
function snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert PostgreSQL table name to MongoDB collection name
 */
export function mapTableToCollection(tableName: SyncableTable): string {
    const mapping: Record<SyncableTable, string> = {
        'workouts': 'workouts',
        'exercises': 'exercises',
        'workout_templates': 'workouttemplates',
        'planned_workouts': 'plannedworkouts',
        'muscle_statuses': 'musclestatuses',
        'user_profiles': 'userprofiles',
        'settings': 'settings',
        'notifications': 'notifications',
        'sleep_logs': 'sleeplogs',
        'recovery_logs': 'recoverylogs',
        'error_logs': 'errorlogs',
    };
    return mapping[tableName] || tableName;
}

/**
 * Transform PostgreSQL record to MongoDB format
 */
export function transformRecord(
    record: Record<string, unknown>,
    tableName: SyncableTable
): Record<string, unknown> {
    const transformed: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(record)) {
        // Skip null values
        if (value === null) {
            continue;
        }
        
        // Convert snake_case to camelCase
        const camelKey = snakeToCamel(key);
        
        // Handle special field transformations
        if (key === 'id' && typeof value === 'number') {
            // PostgreSQL SERIAL → MongoDB ObjectId (will be generated)
            // Store original ID in a separate field for reference
            transformed['_supabaseId'] = value;
            continue;
        }
        
        // Handle date/timestamp fields
        if (key.endsWith('_at') || key === 'date' || key === 'start_time' || key === 'end_time' || 
            key === 'scheduled_date' || key === 'scheduled_time' || key === 'bedtime' || key === 'wake_time') {
            transformed[camelKey] = value ? new Date(value as string) : null;
            continue;
        }
        
        // Handle JSONB fields (already JSON)
        if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
            transformed[camelKey] = value;
            continue;
        }
        
        // Handle arrays
        if (Array.isArray(value)) {
            transformed[camelKey] = value;
            continue;
        }
        
        // Handle numeric types
        if (typeof value === 'number') {
            // PostgreSQL NUMERIC → JavaScript number
            transformed[camelKey] = value;
            continue;
        }
        
        // Handle boolean
        if (typeof value === 'boolean') {
            transformed[camelKey] = value;
            continue;
        }
        
        // Handle string
        if (typeof value === 'string') {
            transformed[camelKey] = value;
            continue;
        }
        
        // Default: pass through
        transformed[camelKey] = value;
    }
    
    // Table-specific transformations
    switch (tableName) {
        case 'workouts':
            // Map workout-specific fields
            if (record.id) {
                // For workouts, we need to generate a MongoDB ObjectId
                // The original Supabase ID is stored in _supabaseId
            }
            break;
            
        case 'exercises':
            // Exercise ID is already a string in PostgreSQL
            if (record.id && typeof record.id === 'string') {
                transformed['exerciseId'] = record.id;
            }
            break;
            
        case 'workout_templates':
            if (record.id && typeof record.id === 'string') {
                transformed['templateId'] = record.id;
            }
            break;
            
        case 'planned_workouts':
            if (record.id && typeof record.id === 'string') {
                transformed['plannedWorkoutId'] = record.id;
            }
            break;
            
        case 'notifications':
            if (record.id && typeof record.id === 'string') {
                transformed['notificationId'] = record.id;
            }
            break;
            
        case 'muscle_statuses':
            // Muscle statuses use composite key (userId + muscle)
            // MongoDB will use _id as ObjectId, but we need to handle the unique constraint
            break;
            
        case 'user_profiles':
            // User profiles use userId as primary key
            if (record.user_id && typeof record.user_id === 'string') {
                transformed['userId'] = record.user_id;
            }
            break;
            
        case 'settings':
            // Settings use composite key (userId + key)
            break;
            
        case 'sleep_logs':
        case 'recovery_logs':
            // Use composite key (userId + date)
            break;
    }
    
    return transformed;
}

/**
 * Build MongoDB filter for finding existing record
 */
export function buildMongoFilter(
    record: Record<string, unknown>,
    tableName: SyncableTable
): Record<string, unknown> {
    const filter: Record<string, unknown> = {};
    
    switch (tableName) {
        case 'workouts':
            // Use _supabaseId if available, otherwise use MongoDB _id
            if (record._supabaseId) {
                filter['_supabaseId'] = record._supabaseId;
            } else if (record.id) {
                filter['_id'] = record.id;
            }
            break;
            
        case 'exercises':
            filter['exerciseId'] = record.exerciseId || record.id;
            break;
            
        case 'workout_templates':
            filter['templateId'] = record.templateId || record.id;
            break;
            
        case 'planned_workouts':
            filter['plannedWorkoutId'] = record.plannedWorkoutId || record.id;
            break;
            
        case 'notifications':
            filter['notificationId'] = record.notificationId || record.id;
            break;
            
        case 'muscle_statuses':
            filter['userId'] = record.userId;
            filter['muscle'] = record.muscle;
            break;
            
        case 'user_profiles':
            filter['userId'] = record.userId;
            break;
            
        case 'settings':
            filter['userId'] = record.userId;
            filter['key'] = record.key;
            break;
            
        case 'sleep_logs':
        case 'recovery_logs':
            filter['userId'] = record.userId;
            filter['date'] = record.date;
            break;
            
        case 'error_logs':
            if (record.id) {
                filter['_id'] = record.id;
            }
            break;
            
        default:
            if (record.id) {
                filter['_id'] = record.id;
            }
    }
    
    return filter;
}
