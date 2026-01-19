/**
 * RPE (Rate of Perceived Exertion) helper functions
 * RPE scale: 1-10 (1 = very easy, 10 = maximum effort)
 */

export function validateRPE(rpe: number): boolean {
  return rpe >= 1 && rpe <= 10;
}

export function rpeToPercentage(rpe: number): number {
  // Convert RPE to percentage of max effort
  // RPE 10 = 100%, RPE 1 = 10%
  return ((rpe - 1) / 9) * 90 + 10;
}

export function getIntensityLabel(rpe: number): {
  label: string;
  color: string;
} {
  if (rpe >= 9) {
    return { label: 'Near Failure', color: 'red' };
  }
  if (rpe >= 7) {
    return { label: 'Optimal Zone', color: 'primary' };
  }
  if (rpe >= 5) {
    return { label: 'Moderate', color: 'yellow' };
  }
  return { label: 'Light', color: 'gray' };
}

export function getRpeColor(rpe: number): string {
  if (rpe >= 9) {
    return '#ef4444';
  } // red
  if (rpe >= 7) {
    return '#3b82f6';
  } // blue
  if (rpe >= 5) {
    return '#fbbf24';
  } // yellow
  return '#6b7280'; // gray
}

export function calculateRpeTrend(
  currentRpe: number,
  previousRpe: number
): {
  change: number;
  direction: 'up' | 'down' | 'stable';
} {
  const change = currentRpe - previousRpe;
  if (Math.abs(change) < 0.1) {
    return { change: 0, direction: 'stable' };
  }
  return {
    change: Math.abs(change),
    direction: change > 0 ? 'up' : 'down',
  };
}

export function suggestLoadFromRpe(
  weight: number,
  _reps: number,
  targetRpe: number,
  currentRpe?: number
): number {
  // If we have current RPE, adjust based on RPE difference
  if (currentRpe !== undefined) {
    const rpeDiff = targetRpe - currentRpe;
    // Each RPE point ≈ 2.5% load change
    const adjustment = 1 + rpeDiff * 0.025;
    return weight * adjustment;
  }

  // Otherwise, estimate based on target RPE
  // Higher RPE = can handle more weight
  const rpeMultiplier = 0.7 + (targetRpe / 10) * 0.3;
  return weight * rpeMultiplier;
}

export function formatRpe(rpe: number): string {
  return rpe.toFixed(1);
}

