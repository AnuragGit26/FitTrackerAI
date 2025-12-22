import { Workout } from '@/types/workout';
import { MuscleGroup } from '@/types/muscle';

/**
 * Derives a meaningful workout name from workout data based on muscle groups targeted.
 * Falls back to workout type or generic name if muscle groups aren't available.
 */
export function getWorkoutName(workout: Workout | null): string {
  if (!workout) {
    return 'No Previous';
  }

  if (!workout.musclesTargeted || workout.musclesTargeted.length === 0) {
    // Fallback to workout type or generic name
    if (workout.workoutType && workout.workoutType !== 'custom') {
      return workout.workoutType.charAt(0).toUpperCase() + workout.workoutType.slice(1);
    }
    return workout.exercises.length > 0 ? 'Custom Workout' : 'Empty Workout';
  }

  const muscles = workout.musclesTargeted;
  
  // Common workout name patterns based on muscle groups
  const hasChest = muscles.some(m => 
    m === MuscleGroup.CHEST || 
    m === MuscleGroup.UPPER_CHEST || 
    m === MuscleGroup.LOWER_CHEST
  );
  const hasTriceps = muscles.includes(MuscleGroup.TRICEPS);
  const hasBack = muscles.some(m => 
    m === MuscleGroup.BACK || 
    m === MuscleGroup.LATS || 
    m === MuscleGroup.TRAPS || 
    m === MuscleGroup.RHOMBOIDS
  );
  const hasBiceps = muscles.includes(MuscleGroup.BICEPS);
  const hasShoulders = muscles.some(m => 
    m === MuscleGroup.SHOULDERS || 
    m === MuscleGroup.FRONT_DELTS || 
    m === MuscleGroup.SIDE_DELTS || 
    m === MuscleGroup.REAR_DELTS
  );
  const hasLegs = muscles.some(m => 
    m === MuscleGroup.QUADS || 
    m === MuscleGroup.HAMSTRINGS || 
    m === MuscleGroup.GLUTES || 
    m === MuscleGroup.CALVES
  );

  // Upper body combinations
  if (hasChest && hasTriceps) {
    return 'Chest & Tris';
  }
  if (hasBack && hasBiceps) {
    return 'Back & Bis';
  }
  if (hasChest && hasShoulders && hasTriceps) {
    return 'Push Day';
  }
  if (hasBack && hasBiceps && hasShoulders) {
    return 'Pull Day';
  }
  if (hasChest && hasBack && hasShoulders) {
    return 'Upper Body A';
  }
  if (hasChest && hasBack && hasBiceps && hasTriceps) {
    return 'Upper Body B';
  }

  // Lower body
  if (hasLegs && !hasChest && !hasBack && !hasShoulders) {
    if (muscles.includes(MuscleGroup.QUADS) && muscles.includes(MuscleGroup.HAMSTRINGS)) {
      return 'Legs';
    }
    if (muscles.includes(MuscleGroup.QUADS)) {
      return 'Quads Focus';
    }
    if (muscles.includes(MuscleGroup.HAMSTRINGS)) {
      return 'Hamstrings Focus';
    }
    return 'Lower Body';
  }

  // Full body
  if (hasChest && hasBack && hasLegs) {
    return 'Full Body';
  }

  // Single muscle group focus
  if (muscles.length === 1) {
    const muscle = muscles[0];
    switch (muscle) {
      case MuscleGroup.CHEST:
      case MuscleGroup.UPPER_CHEST:
      case MuscleGroup.LOWER_CHEST:
        return 'Chest';
      case MuscleGroup.BACK:
      case MuscleGroup.LATS:
        return 'Back';
      case MuscleGroup.SHOULDERS:
        return 'Shoulders';
      case MuscleGroup.BICEPS:
        return 'Biceps';
      case MuscleGroup.TRICEPS:
        return 'Triceps';
      case MuscleGroup.QUADS:
        return 'Quads';
      case MuscleGroup.HAMSTRINGS:
        return 'Hamstrings';
      case MuscleGroup.GLUTES:
        return 'Glutes';
      default:
        return 'Custom Workout';
    }
  }

  // Multiple upper body muscles (generic)
  if ((hasChest || hasBack || hasShoulders || hasBiceps || hasTriceps) && !hasLegs) {
    // Count unique muscle groups to determine variant
    const upperBodyCount = new Set([
      ...(hasChest ? ['chest'] : []),
      ...(hasBack ? ['back'] : []),
      ...(hasShoulders ? ['shoulders'] : []),
      ...(hasBiceps ? ['biceps'] : []),
      ...(hasTriceps ? ['triceps'] : []),
    ]).size;

    if (upperBodyCount >= 3) {
      return 'Upper Body A';
    }
    return 'Upper Body';
  }

  // Fallback
  return workout.workoutType && workout.workoutType !== 'custom'
    ? workout.workoutType.charAt(0).toUpperCase() + workout.workoutType.slice(1)
    : 'Custom Workout';
}

