import { WorkoutSet } from '@/types/exercise';

/**
 * Format date for display (e.g., "Oct 12, 2023")
 */
export function formatWorkoutDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format weight × reps string
 */
export function formatWeightReps(weight?: number, reps?: number): string {
  if (weight === undefined && reps === undefined) {
    return '-';
  }
  if (weight === undefined) {return `${reps} reps`;}
  if (reps === undefined) {return `${weight}kg`;}
  return `${weight}kg × ${reps}`;
}

/**
 * Calculate weight change badge value
 */
export function calculateWeightChangeBadge(
  currentWeight: number,
  previousWeight?: number,
  threshold: number = 0.5
): {
  value: number;
  display: string;
  color: 'primary' | 'gray';
} | null {
  if (previousWeight === undefined) {
    return null;
  }

  const change = currentWeight - previousWeight;
  if (Math.abs(change) < threshold) {return null;}

  return {
    value: change,
    display: `${change > 0 ? '+' : ''}${change.toFixed(1)}`,
    color: change > 0 ? 'primary' : 'gray',
  };
}

/**
 * Match sets by number, handling mismatched counts
 */
export function matchSetByNumber(
  sets: WorkoutSet[],
  setNumber: number
): WorkoutSet | null {
  // First try exact match
  const exactMatch = sets.find((s) => s.setNumber === setNumber);
  if (exactMatch) {
    return exactMatch;
  }

  // If no exact match, find closest
  if (sets.length === 0) {
    return null;
  }

  // Sort by set number and find closest
  const sorted = [...sets].sort((a, b) => a.setNumber - b.setNumber);
  
  // If requested set is before first, return first
  if (setNumber < sorted[0].setNumber) {
    return sorted[0];
  }
  
  // If requested set is after last, return last
  if (setNumber > sorted[sorted.length - 1].setNumber) {
    return sorted[sorted.length - 1];
  }

  // Find closest
  let closest = sorted[0];
  let minDiff = Math.abs(sorted[0].setNumber - setNumber);

  for (const set of sorted) {
    const diff = Math.abs(set.setNumber - setNumber);
    if (diff < minDiff) {
      minDiff = diff;
      closest = set;
    }
  }

  return closest;
}

/**
 * Format sets for grid display
 */
export function formatSetsForGrid(sets: WorkoutSet[]): Array<{
  setNumber: number;
  weight?: number;
  reps?: number;
  rpe?: number;
  completed: boolean;
}> {
  return sets
    .filter((s) => s.completed)
    .map((s) => ({
      setNumber: s.setNumber,
      weight: s.weight,
      reps: s.reps,
      rpe: s.rpe,
      completed: s.completed,
    }))
    .sort((a, b) => a.setNumber - b.setNumber);
}

/**
 * Get contextual message for previous workout
 */
export function getContextualMessage(
  previousSet: { weight?: number; reps?: number } | null,
  _currentSetNumber: number
): string | null {
  if (!previousSet) {
    return null;
  }

  const set = previousSet;
  if (set.weight && set.reps) {
    return `You did ${set.weight}kg × ${set.reps} last time`;
  }
  if (set.weight) {
    return `You did ${set.weight}kg last time`;
  }
  if (set.reps) {
    return `You did ${set.reps} reps last time`;
  }

  return null;
}

