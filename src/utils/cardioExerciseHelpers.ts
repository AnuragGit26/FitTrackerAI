import { Exercise } from '@/types/exercise';

/**
 * Distance-based cardio exercise name patterns
 */
const DISTANCE_BASED_PATTERNS = [
    'running',
    'cycling',
    'walking',
    'rowing',
    'elliptical',
    'treadmill',
    'swimming',
    'run',
    'bike',
    'cycle',
    'row',
    'walk',
];

/**
 * Non-distance cardio exercise name patterns (reps/duration based)
 */
const REPS_BASED_PATTERNS = [
    'burpees',
    'jump rope',
    'battle ropes',
    'kettlebell swings',
    'sled',
    'assault bike',
    'air bike',
    'tire flips',
    'jumping jacks',
    'mountain climbers',
    'high knees',
    'burpee',
    'rope',
    'swings',
];

/**
 * Determines if a cardio exercise is distance-based or reps/duration-based
 * 
 * @param exercise The exercise to check
 * @returns true if distance-based, false if reps/duration-based
 */
export function isDistanceBasedCardio(exercise: Exercise): boolean {
    const exerciseNameLower = exercise.name.toLowerCase();

    // First check name patterns for known exercises (handles cached data with old trackingType)
    // Check for reps-based patterns first (more specific)
    const isRepsBased = REPS_BASED_PATTERNS.some(pattern =>
        exerciseNameLower.includes(pattern)
    );

    if (isRepsBased) {
        return false;
    }

    // Check for distance-based patterns
    const isDistanceBased = DISTANCE_BASED_PATTERNS.some(pattern =>
        exerciseNameLower.includes(pattern)
    );

    if (isDistanceBased) {
        return true;
    }

    // Then check trackingType as secondary check
    if (exercise.trackingType === 'cardio') {
        return true;
    }

    if (exercise.trackingType === 'reps_only' || exercise.trackingType === 'duration') {
        return false;
    }

    // Default: if category is cardio but no pattern matches, assume distance-based
    // (most cardio exercises are distance-based)
    return true;
}

/**
 * Gets the appropriate tracking type for a cardio exercise
 * 
 * @param exercise The exercise to check
 * @returns 'distance' for distance-based, 'reps' for reps-based, 'duration' for duration-based
 */
export function getCardioTrackingType(exercise: Exercise): 'distance' | 'reps' | 'duration' {
    if (exercise.trackingType === 'cardio') {
        return 'distance';
    }

    if (exercise.trackingType === 'duration') {
        return 'duration';
    }

    if (exercise.trackingType === 'reps_only') {
        return 'reps';
    }

    // Fallback to name pattern matching
    const isDistanceBased = isDistanceBasedCardio(exercise);

    if (isDistanceBased) {
        return 'distance';
    }

    // For non-distance cardio, prefer reps over duration
    // (most bodyweight cardio is tracked by reps)
    return 'reps';
}

