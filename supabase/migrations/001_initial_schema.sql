-- FitTrackAI Supabase Database Schema
-- Complete schema migration for bidirectional sync with IndexedDB
-- Includes versioning, optimistic locking, sync queue, and proper RLS policies
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- ============================================================================
-- Helper Functions
-- ============================================================================
-- Function to update updated_at timestamp and increment version
CREATE OR REPLACE FUNCTION increment_version() RETURNS TRIGGER AS $$ BEGIN IF TG_OP = 'UPDATE' THEN NEW.version = OLD.version + 1;
NEW.updated_at = NOW();
ELSIF TG_OP = 'INSERT' THEN NEW.version = COALESCE(NEW.version, 1);
NEW.updated_at = COALESCE(NEW.updated_at, NOW());
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Helper function to get user_id from JWT or allow service role
CREATE OR REPLACE FUNCTION get_user_id() RETURNS TEXT AS $$ BEGIN -- Check if using service role (bypass RLS)
    IF current_setting('request.jwt.claims', true)::json->>'role' = 'service_role' THEN RETURN NULL;
-- Service role can access all
END IF;
-- Try to get user_id from JWT claims (Clerk format)
RETURN COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    current_setting('request.jwt.claims', true)::json->>'user_id',
    current_setting('app.user_id', true)
);
END;
$$ LANGUAGE plpgsql STABLE;
-- ============================================================================
-- Core Tables
-- ============================================================================
-- Workouts table
CREATE TABLE IF NOT EXISTS workouts (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    date DATE NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_duration INTEGER NOT NULL DEFAULT 0,
    total_volume NUMERIC(10, 2) NOT NULL DEFAULT 0,
    calories INTEGER,
    notes TEXT,
    muscles_targeted TEXT [] NOT NULL DEFAULT '{}',
    workout_type TEXT NOT NULL,
    mood TEXT CHECK (
        mood IN ('great', 'good', 'okay', 'tired', 'exhausted')
    ),
    version INTEGER NOT NULL DEFAULT 1,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Exercises table (library exercises shared, custom exercises user-specific)
CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    primary_muscles TEXT [] NOT NULL DEFAULT '{}',
    secondary_muscles TEXT [] NOT NULL DEFAULT '{}',
    equipment TEXT [] NOT NULL DEFAULT '{}',
    difficulty TEXT NOT NULL CHECK (
        difficulty IN ('beginner', 'intermediate', 'advanced')
    ),
    instructions TEXT [] NOT NULL DEFAULT '{}',
    video_url TEXT,
    is_custom BOOLEAN NOT NULL DEFAULT false,
    tracking_type TEXT NOT NULL,
    anatomy_image_url TEXT,
    strengthlog_url TEXT,
    strengthlog_slug TEXT,
    advanced_details JSONB,
    muscle_category TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT exercises_custom_requires_user_id CHECK (
        is_custom = false
        OR user_id IS NOT NULL
    )
);
-- Workout templates table
CREATE TABLE IF NOT EXISTS workout_templates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (
        category IN (
            'strength',
            'hypertrophy',
            'cardio',
            'home',
            'flexibility'
        )
    ),
    description TEXT,
    image_url TEXT,
    difficulty TEXT CHECK (
        difficulty IN ('beginner', 'intermediate', 'advanced')
    ),
    days_per_week INTEGER,
    exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
    estimated_duration INTEGER NOT NULL,
    muscles_targeted TEXT [] NOT NULL DEFAULT '{}',
    is_featured BOOLEAN DEFAULT false,
    is_trending BOOLEAN DEFAULT false,
    match_percentage NUMERIC(5, 2),
    version INTEGER NOT NULL DEFAULT 1,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Planned workouts table
CREATE TABLE IF NOT EXISTS planned_workouts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    scheduled_date DATE NOT NULL,
    scheduled_time TIMESTAMPTZ,
    template_id TEXT,
    workout_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (
        category IN (
            'strength',
            'hypertrophy',
            'cardio',
            'home',
            'flexibility'
        )
    ),
    estimated_duration INTEGER NOT NULL,
    exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
    muscles_targeted TEXT [] NOT NULL DEFAULT '{}',
    notes TEXT,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_workout_id INTEGER,
    version INTEGER NOT NULL DEFAULT 1,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Muscle statuses table
CREATE TABLE IF NOT EXISTS muscle_statuses (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    muscle TEXT NOT NULL,
    last_worked TIMESTAMPTZ,
    recovery_status TEXT NOT NULL CHECK (
        recovery_status IN (
            'fresh',
            'recovering',
            'sore',
            'ready',
            'overworked'
        )
    ),
    recovery_percentage INTEGER NOT NULL DEFAULT 0 CHECK (
        recovery_percentage >= 0
        AND recovery_percentage <= 100
    ),
    workload_score NUMERIC(10, 2) NOT NULL DEFAULT 0,
    recommended_rest_days INTEGER NOT NULL DEFAULT 0,
    total_volume_last_7_days NUMERIC(10, 2) NOT NULL DEFAULT 0,
    training_frequency NUMERIC(5, 2) NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, muscle)
);
-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    experience_level TEXT NOT NULL CHECK (
        experience_level IN ('beginner', 'intermediate', 'advanced')
    ),
    goals TEXT [] NOT NULL DEFAULT '{}',
    equipment TEXT [] NOT NULL DEFAULT '{}',
    workout_frequency INTEGER NOT NULL DEFAULT 3,
    preferred_unit TEXT NOT NULL CHECK (preferred_unit IN ('kg', 'lbs')),
    default_rest_time INTEGER NOT NULL DEFAULT 90,
    age INTEGER,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    weight NUMERIC(6, 2),
    height NUMERIC(6, 2),
    profile_picture TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Settings table (key-value pairs)
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, key)
);
-- Sync metadata table
CREATE TABLE IF NOT EXISTS sync_metadata (
    id SERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    user_id TEXT NOT NULL,
    last_sync_at TIMESTAMPTZ,
    last_push_at TIMESTAMPTZ,
    last_pull_at TIMESTAMPTZ,
    sync_status TEXT NOT NULL DEFAULT 'idle' CHECK (
        sync_status IN (
            'idle',
            'syncing',
            'success',
            'error',
            'conflict'
        )
    ),
    conflict_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    last_error_at TIMESTAMPTZ,
    record_count INTEGER,
    version INTEGER NOT NULL DEFAULT 1,
    last_successful_sync_at TIMESTAMPTZ,
    sync_token TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(table_name, user_id)
);
-- Sync queue table for reliable sync operations
CREATE TABLE IF NOT EXISTS sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'processing', 'completed', 'failed')
    ),
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    sync_token TEXT UNIQUE
);
-- ============================================================================
-- Indexes for Performance
-- ============================================================================
-- Workouts indexes
CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date);
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, date);
CREATE INDEX IF NOT EXISTS idx_workouts_updated_at ON workouts(updated_at);
CREATE INDEX IF NOT EXISTS idx_workouts_user_updated ON workouts(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_workouts_user_date_version ON workouts(user_id, date, version);
CREATE INDEX IF NOT EXISTS idx_workouts_deleted_at ON workouts(deleted_at)
WHERE deleted_at IS NOT NULL;
-- Exercises indexes
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_is_custom ON exercises(is_custom);
CREATE INDEX IF NOT EXISTS idx_exercises_updated_at ON exercises(updated_at);
CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_exercises_user_custom ON exercises(user_id, is_custom);
CREATE INDEX IF NOT EXISTS idx_exercises_user_updated ON exercises(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_exercises_deleted_at ON exercises(deleted_at)
WHERE deleted_at IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_exercises_user_id_unique_custom ON exercises(user_id, id)
WHERE is_custom = true
    AND user_id IS NOT NULL;
-- Workout templates indexes
CREATE INDEX IF NOT EXISTS idx_workout_templates_user_id ON workout_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_templates_category ON workout_templates(category);
CREATE INDEX IF NOT EXISTS idx_workout_templates_user_category ON workout_templates(user_id, category);
CREATE INDEX IF NOT EXISTS idx_workout_templates_updated_at ON workout_templates(updated_at);
CREATE INDEX IF NOT EXISTS idx_workout_templates_user_updated ON workout_templates(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_workout_templates_user_category_version ON workout_templates(user_id, category, version);
CREATE INDEX IF NOT EXISTS idx_workout_templates_deleted_at ON workout_templates(deleted_at)
WHERE deleted_at IS NOT NULL;
-- Planned workouts indexes
CREATE INDEX IF NOT EXISTS idx_planned_workouts_user_id ON planned_workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_planned_workouts_scheduled_date ON planned_workouts(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_planned_workouts_user_date ON planned_workouts(user_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_planned_workouts_updated_at ON planned_workouts(updated_at);
CREATE INDEX IF NOT EXISTS idx_planned_workouts_user_updated ON planned_workouts(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_planned_workouts_user_date_version ON planned_workouts(user_id, scheduled_date, version);
CREATE INDEX IF NOT EXISTS idx_planned_workouts_deleted_at ON planned_workouts(deleted_at)
WHERE deleted_at IS NOT NULL;
-- Muscle statuses indexes
CREATE INDEX IF NOT EXISTS idx_muscle_statuses_user_id ON muscle_statuses(user_id);
CREATE INDEX IF NOT EXISTS idx_muscle_statuses_muscle ON muscle_statuses(muscle);
CREATE INDEX IF NOT EXISTS idx_muscle_statuses_user_muscle ON muscle_statuses(user_id, muscle);
CREATE INDEX IF NOT EXISTS idx_muscle_statuses_updated_at ON muscle_statuses(updated_at);
CREATE INDEX IF NOT EXISTS idx_muscle_statuses_user_updated ON muscle_statuses(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_muscle_statuses_deleted_at ON muscle_statuses(deleted_at)
WHERE deleted_at IS NOT NULL;
-- Settings indexes
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_user_key ON settings(user_id, key);
CREATE INDEX IF NOT EXISTS idx_settings_updated_at ON settings(updated_at);
CREATE INDEX IF NOT EXISTS idx_settings_user_updated ON settings(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_settings_deleted_at ON settings(deleted_at)
WHERE deleted_at IS NOT NULL;
-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_updated ON user_profiles(updated_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_deleted_at ON user_profiles(deleted_at)
WHERE deleted_at IS NOT NULL;
-- Sync metadata indexes
CREATE INDEX IF NOT EXISTS idx_sync_metadata_table_user ON sync_metadata(table_name, user_id);
CREATE INDEX IF NOT EXISTS idx_sync_metadata_user_id ON sync_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_metadata_sync_status ON sync_metadata(sync_status);
CREATE INDEX IF NOT EXISTS idx_sync_metadata_sync_token ON sync_metadata(sync_token);
-- Sync queue indexes
CREATE INDEX IF NOT EXISTS idx_sync_queue_user_id ON sync_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_user_status ON sync_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_created_at ON sync_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_sync_token ON sync_queue(sync_token);
-- ============================================================================
-- Triggers for Version Increment and Timestamps
-- ============================================================================
CREATE TRIGGER workouts_version_trigger BEFORE
INSERT
    OR
UPDATE ON workouts FOR EACH ROW EXECUTE FUNCTION increment_version();
CREATE TRIGGER exercises_version_trigger BEFORE
INSERT
    OR
UPDATE ON exercises FOR EACH ROW EXECUTE FUNCTION increment_version();
CREATE TRIGGER workout_templates_version_trigger BEFORE
INSERT
    OR
UPDATE ON workout_templates FOR EACH ROW EXECUTE FUNCTION increment_version();
CREATE TRIGGER planned_workouts_version_trigger BEFORE
INSERT
    OR
UPDATE ON planned_workouts FOR EACH ROW EXECUTE FUNCTION increment_version();
CREATE TRIGGER muscle_statuses_version_trigger BEFORE
INSERT
    OR
UPDATE ON muscle_statuses FOR EACH ROW EXECUTE FUNCTION increment_version();
CREATE TRIGGER user_profiles_version_trigger BEFORE
INSERT
    OR
UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION increment_version();
CREATE TRIGGER settings_version_trigger BEFORE
INSERT
    OR
UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION increment_version();
CREATE TRIGGER sync_metadata_version_trigger BEFORE
INSERT
    OR
UPDATE ON sync_metadata FOR EACH ROW EXECUTE FUNCTION increment_version();
-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE planned_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE muscle_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;
-- ============================================================================
-- RLS Policies
-- ============================================================================
-- Workouts policies
CREATE POLICY "workouts_select_policy" ON workouts FOR
SELECT USING (
        user_id = get_user_id()
        OR get_user_id() IS NULL
    );
CREATE POLICY "workouts_insert_policy" ON workouts FOR
INSERT WITH CHECK (
        user_id = get_user_id()
        OR get_user_id() IS NULL
    );
CREATE POLICY "workouts_update_policy" ON workouts FOR
UPDATE USING (
        user_id = get_user_id()
        OR get_user_id() IS NULL
    );
CREATE POLICY "workouts_delete_policy" ON workouts FOR DELETE USING (
    user_id = get_user_id()
    OR get_user_id() IS NULL
);
-- Exercises policies (custom exercises are user-specific, library exercises are shared)
CREATE POLICY "exercises_select_policy" ON exercises FOR
SELECT USING (
        (is_custom = false)
        OR (
            is_custom = true
            AND user_id = get_user_id()
        )
        OR get_user_id() IS NULL
    );
CREATE POLICY "exercises_insert_policy" ON exercises FOR
INSERT WITH CHECK (
        (
            is_custom = false
            AND user_id IS NULL
        )
        OR (
            is_custom = true
            AND user_id = get_user_id()
        )
        OR get_user_id() IS NULL
    );
CREATE POLICY "exercises_update_policy" ON exercises FOR
UPDATE USING (
        (
            is_custom = false
            AND user_id IS NULL
        )
        OR (
            is_custom = true
            AND user_id = get_user_id()
        )
        OR get_user_id() IS NULL
    );
CREATE POLICY "exercises_delete_policy" ON exercises FOR DELETE USING (
    (
        is_custom = false
        AND user_id IS NULL
    )
    OR (
        is_custom = true
        AND user_id = get_user_id()
    )
    OR get_user_id() IS NULL
);
-- Workout templates policies
CREATE POLICY "workout_templates_select_policy" ON workout_templates FOR
SELECT USING (
        user_id = get_user_id()
        OR get_user_id() IS NULL
    );
CREATE POLICY "workout_templates_insert_policy" ON workout_templates FOR
INSERT WITH CHECK (
        user_id = get_user_id()
        OR get_user_id() IS NULL
    );
CREATE POLICY "workout_templates_update_policy" ON workout_templates FOR
UPDATE USING (
        user_id = get_user_id()
        OR get_user_id() IS NULL
    );
CREATE POLICY "workout_templates_delete_policy" ON workout_templates FOR DELETE USING (
    user_id = get_user_id()
    OR get_user_id() IS NULL
);
-- Planned workouts policies
CREATE POLICY "planned_workouts_select_policy" ON planned_workouts FOR
SELECT USING (
        user_id = get_user_id()
        OR get_user_id() IS NULL
    );
CREATE POLICY "planned_workouts_insert_policy" ON planned_workouts FOR
INSERT WITH CHECK (
        user_id = get_user_id()
        OR get_user_id() IS NULL
    );
CREATE POLICY "planned_workouts_update_policy" ON planned_workouts FOR
UPDATE USING (
        user_id = get_user_id()
        OR get_user_id() IS NULL
    );
CREATE POLICY "planned_workouts_delete_policy" ON planned_workouts FOR DELETE USING (
    user_id = get_user_id()
    OR get_user_id() IS NULL
);
-- Muscle statuses policies
CREATE POLICY "muscle_statuses_select_policy" ON muscle_statuses FOR
SELECT USING (
        user_id = get_user_id()
        OR get_user_id() IS NULL
    );
CREATE POLICY "muscle_statuses_insert_policy" ON muscle_statuses FOR
INSERT WITH CHECK (
        user_id = get_user_id()
        OR get_user_id() IS NULL
    );
CREATE POLICY "muscle_statuses_update_policy" ON muscle_statuses FOR
UPDATE USING (
        user_id = get_user_id()
        OR get_user_id() IS NULL
    );
CREATE POLICY "muscle_statuses_delete_policy" ON muscle_statuses FOR DELETE USING (
    user_id = get_user_id()
    OR get_user_id() IS NULL
);
-- User profiles policies
CREATE POLICY "user_profiles_select_policy" ON user_profiles FOR
SELECT USING (
        user_id = get_user_id()
        OR get_user_id() IS NULL
    );
CREATE POLICY "user_profiles_insert_policy" ON user_profiles FOR
INSERT WITH CHECK (
        user_id = get_user_id()
        OR get_user_id() IS NULL
    );
CREATE POLICY "user_profiles_update_policy" ON user_profiles FOR
UPDATE USING (
        user_id = get_user_id()
        OR get_user_id() IS NULL
    );
CREATE POLICY "user_profiles_delete_policy" ON user_profiles FOR DELETE USING (
    user_id = get_user_id()
    OR get_user_id() IS NULL
);
-- Settings policies
CREATE POLICY "settings_select_policy" ON settings FOR
SELECT USING (
        user_id = get_user_id()
        OR get_user_id() IS NULL
    );
CREATE POLICY "settings_insert_policy" ON settings FOR
INSERT WITH CHECK (
        user_id = get_user_id()
        OR get_user_id() IS NULL
    );
CREATE POLICY "settings_update_policy" ON settings FOR
UPDATE USING (
        user_id = get_user_id()
        OR get_user_id() IS NULL
    );
CREATE POLICY "settings_delete_policy" ON settings FOR DELETE USING (
    user_id = get_user_id()
    OR get_user_id() IS NULL
);
-- Sync metadata policies
CREATE POLICY "sync_metadata_select_policy" ON sync_metadata FOR
SELECT USING (
        user_id = get_user_id()
        OR get_user_id() IS NULL
    );
CREATE POLICY "sync_metadata_insert_policy" ON sync_metadata FOR
INSERT WITH CHECK (
        user_id = get_user_id()
        OR get_user_id() IS NULL
    );
CREATE POLICY "sync_metadata_update_policy" ON sync_metadata FOR
UPDATE USING (
        user_id = get_user_id()
        OR get_user_id() IS NULL
    );
CREATE POLICY "sync_metadata_delete_policy" ON sync_metadata FOR DELETE USING (
    user_id = get_user_id()
    OR get_user_id() IS NULL
);
-- Sync queue policies
CREATE POLICY "sync_queue_select_policy" ON sync_queue FOR
SELECT USING (
        user_id = get_user_id()
        OR get_user_id() IS NULL
    );
CREATE POLICY "sync_queue_insert_policy" ON sync_queue FOR
INSERT WITH CHECK (
        user_id = get_user_id()
        OR get_user_id() IS NULL
    );
CREATE POLICY "sync_queue_update_policy" ON sync_queue FOR
UPDATE USING (
        user_id = get_user_id()
        OR get_user_id() IS NULL
    );
CREATE POLICY "sync_queue_delete_policy" ON sync_queue FOR DELETE USING (
    user_id = get_user_id()
    OR get_user_id() IS NULL
);
-- ============================================================================
-- Documentation Comments
-- ============================================================================
COMMENT ON COLUMN workouts.version IS 'Version number for optimistic locking';
COMMENT ON COLUMN workouts.deleted_at IS 'Soft delete timestamp';
COMMENT ON COLUMN exercises.version IS 'Version number for optimistic locking';
COMMENT ON COLUMN exercises.deleted_at IS 'Soft delete timestamp';
COMMENT ON COLUMN workout_templates.version IS 'Version number for optimistic locking';
COMMENT ON COLUMN workout_templates.deleted_at IS 'Soft delete timestamp';
COMMENT ON COLUMN planned_workouts.version IS 'Version number for optimistic locking';
COMMENT ON COLUMN planned_workouts.deleted_at IS 'Soft delete timestamp';
COMMENT ON COLUMN muscle_statuses.version IS 'Version number for optimistic locking';
COMMENT ON COLUMN muscle_statuses.deleted_at IS 'Soft delete timestamp';
COMMENT ON COLUMN user_profiles.version IS 'Version number for optimistic locking';
COMMENT ON COLUMN user_profiles.deleted_at IS 'Soft delete timestamp';
COMMENT ON COLUMN settings.version IS 'Version number for optimistic locking';
COMMENT ON COLUMN settings.deleted_at IS 'Soft delete timestamp';
COMMENT ON TABLE sync_queue IS 'Queue for reliable sync operations with retry support';
COMMENT ON COLUMN sync_queue.sync_token IS 'Unique token for idempotent operations';