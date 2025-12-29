-- Error logs table for syncing application errors to Supabase
-- This table stores errors from sync operations, workout operations, and other critical errors

CREATE TABLE IF NOT EXISTS error_logs (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    error_type TEXT NOT NULL CHECK (
        error_type IN (
            'sync_error',
            'workout_error',
            'database_error',
            'network_error',
            'validation_error',
            'application_error',
            'unknown_error'
        )
    ),
    error_message TEXT NOT NULL,
    error_stack TEXT,
    context JSONB,
    table_name TEXT,
    record_id TEXT,
    operation TEXT CHECK (operation IN ('create', 'update', 'delete', 'read', 'sync', 'other')),
    severity TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_resolved ON error_logs(user_id, resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_created ON error_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_table_name ON error_logs(table_name) WHERE table_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_error_logs_deleted_at ON error_logs(deleted_at) WHERE deleted_at IS NOT NULL;

-- Trigger for version increment and timestamps
CREATE TRIGGER error_logs_version_trigger BEFORE
INSERT
    OR
UPDATE ON error_logs FOR EACH ROW EXECUTE FUNCTION increment_version();

-- Enable RLS
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "error_logs_select_policy" ON error_logs FOR
SELECT USING (
        user_id = get_user_id()
        OR get_user_id() IS NULL
    );

CREATE POLICY "error_logs_insert_policy" ON error_logs FOR
INSERT WITH CHECK (
        user_id = get_user_id()
        OR get_user_id() IS NULL
    );

CREATE POLICY "error_logs_update_policy" ON error_logs FOR
UPDATE USING (
        user_id = get_user_id()
        OR get_user_id() IS NULL
    );

CREATE POLICY "error_logs_delete_policy" ON error_logs FOR DELETE USING (
    user_id = get_user_id()
    OR get_user_id() IS NULL
);

-- Documentation
COMMENT ON TABLE error_logs IS 'Stores application errors for debugging and monitoring';
COMMENT ON COLUMN error_logs.error_type IS 'Category of error (sync_error, workout_error, etc.)';
COMMENT ON COLUMN error_logs.context IS 'Additional context data as JSON';
COMMENT ON COLUMN error_logs.severity IS 'Error severity level';
COMMENT ON COLUMN error_logs.resolved IS 'Whether the error has been resolved';
COMMENT ON COLUMN error_logs.version IS 'Version number for optimistic locking';

