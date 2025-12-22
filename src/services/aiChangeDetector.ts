import { Workout } from '@/types/workout';
import { MuscleStatus } from '@/types/muscle';
import { PersonalRecord } from '@/types/analytics';
import { workoutEventTracker } from './workoutEventTracker';

interface DataFingerprint {
  workoutCount: number;
  totalVolume: number;
  lastWorkoutDate: string | null;
  consistencyScore: number;
  prCount: number;
  muscleStatusHash: string;
  workoutIds: string[];
}

/**
 * AI Change Detector
 * 
 * Simplified to focus on fingerprint generation for cache key matching.
 * Refresh logic (24hr rule, new workout detection) is now handled by aiRefreshService.
 * This class is primarily used to generate consistent fingerprints for cache lookups.
 */
class AIChangeDetector {

  private createFingerprint(
    workouts: Workout[],
    muscleStatuses: MuscleStatus[],
    consistencyScore: number,
    personalRecords: PersonalRecord[]
  ): DataFingerprint {
    const totalVolume = workouts.reduce((sum, w) => sum + w.totalVolume, 0);
    const lastWorkout = workouts.length > 0 
      ? workouts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
      : null;
    
    const muscleStatusHash = muscleStatuses
      .map(s => `${s.muscle}:${s.recoveryPercentage}:${s.recoveryStatus}`)
      .sort()
      .join('|');

    const workoutIds = workouts.map(w => w.id?.toString() || '').filter(Boolean);

    return {
      workoutCount: workouts.length,
      totalVolume,
      lastWorkoutDate: lastWorkout ? new Date(lastWorkout.date).toISOString() : null,
      consistencyScore: Math.round(consistencyScore),
      prCount: personalRecords.length,
      muscleStatusHash,
      workoutIds,
    };
  }

  private hashFingerprint(fingerprint: DataFingerprint): string {
    return JSON.stringify(fingerprint);
  }

  /**
   * Check if there are new workouts using workoutEventTracker
   * This is a helper method for components that need to know about new workouts
   */
  hasNewWorkouts(): boolean {
    // The workoutEventTracker handles tracking new workouts
    // This method can be used to check if there are new workouts since last check
    return workoutEventTracker.getLastProcessedWorkoutId() !== null;
  }

  getFingerprint(
    workouts: Workout[],
    muscleStatuses: MuscleStatus[],
    consistencyScore: number,
    personalRecords: PersonalRecord[]
  ): string {
    const fingerprint = this.createFingerprint(workouts, muscleStatuses, consistencyScore, personalRecords);
    return this.hashFingerprint(fingerprint);
  }

  /**
   * Reset the detector (useful for testing)
   */
  reset() {
    // No state to reset - fingerprint generation is stateless
  }
}

export const aiChangeDetector = new AIChangeDetector();

