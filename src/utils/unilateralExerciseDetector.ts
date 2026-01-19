import { Exercise } from '@/types/exercise';
import { MuscleGroup } from '@/types/muscle';

/**
 * Detects if an exercise is unilateral based on its name
 */
export function isUnilateralExercise(exerciseName: string): boolean {
    const normalizedName = exerciseName.toLowerCase();

    // Patterns that indicate unilateral exercises
    const unilateralPatterns = [
        'one-arm', 'one arm', '1-arm', '1 arm',
        'single-arm', 'single arm',
        'one-leg', 'one leg', '1-leg', '1 leg',
        'single-leg', 'single leg',
        'unilateral',
        'dumbbell row', // Usually unilateral
        'concentration curl',
        'pistol squat',
        'bulgarian split squat',
        'lunge', // Lunges are typically unilateral in execution (one leg at a time or alternating)
        'step-up',
        'split squat'
    ];

    // Specific check for "left" or "right" in name if it's not part of "left/right"
    // But usually exercises aren't named "Left Bicep Curl" in the library, 
    // users might add custom ones though.

    return unilateralPatterns.some(pattern => normalizedName.includes(pattern));
}

/**
 * Helper to determine if we should default to tracking sides separately
 */
export function shouldTrackSidesSeparately(exerciseName: string): boolean {
    return isUnilateralExercise(exerciseName);
}

/**
 * Get unilateral muscle groups (mapping bilateral to left/right)
 * This is a placeholder if we decide to have distinct MuscleGroup enums for L/R
 * For now we use the same enum but track volumes separately.
 */
export function getUnilateralMuscleGroups(muscles: MuscleGroup[]): { left: MuscleGroup[], right: MuscleGroup[] } {
    return {
        left: muscles,
        right: muscles
    };
}
