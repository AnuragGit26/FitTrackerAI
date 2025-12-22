import { dataService } from './dataService';
import { Workout } from '@/types/workout';
import { dbHelpers } from './database';

type WorkoutEventCallback = (workout: Workout) => void;

class WorkoutEventTracker {
  private listeners: Set<WorkoutEventCallback> = new Set();
  private lastProcessedWorkoutId: number | null = null;
  private lastProcessedWorkoutTimestamp: number | null = null;
  private isInitialized = false;

  /**
   * Initialize the tracker by loading the last processed workout
   */
  async initialize(userId: string): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Get the most recent workout to determine last processed ID
      const workouts = await dbHelpers.getAllWorkouts(userId);
      if (workouts.length > 0) {
        const mostRecent = workouts[0]; // Already sorted by date descending
        this.lastProcessedWorkoutId = mostRecent.id || null;
        this.lastProcessedWorkoutTimestamp = new Date(mostRecent.date).getTime();
      }

      // Listen to workout events from dataService
      dataService.on('workout', () => {
        this.handleWorkoutEvent(userId);
      });

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize workout event tracker:', error);
    }
  }

  /**
   * Handle workout event from dataService
   */
  private async handleWorkoutEvent(userId: string): Promise<void> {
    try {
      // Get the most recent workout
      const workouts = await dbHelpers.getAllWorkouts(userId);
      if (workouts.length === 0) return;

      const mostRecent = workouts[0];
      const workoutId = mostRecent.id;
      const workoutTimestamp = new Date(mostRecent.date).getTime();

      // Check if this is a new workout
      if (
        workoutId &&
        (this.lastProcessedWorkoutId === null ||
          workoutId > this.lastProcessedWorkoutId ||
          (workoutTimestamp && this.lastProcessedWorkoutTimestamp && 
           workoutTimestamp > this.lastProcessedWorkoutTimestamp))
      ) {
        // New workout detected
        this.lastProcessedWorkoutId = workoutId;
        this.lastProcessedWorkoutTimestamp = workoutTimestamp;
        
        // Notify all listeners
        this.listeners.forEach(callback => {
          try {
            callback(mostRecent);
          } catch (error) {
            console.error('Error in workout event callback:', error);
          }
        });
      }
    } catch (error) {
      console.error('Failed to handle workout event:', error);
    }
  }

  /**
   * Subscribe to workout events
   */
  onWorkoutAdded(callback: WorkoutEventCallback): () => void {
    this.listeners.add(callback);
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Get the last processed workout ID
   */
  getLastProcessedWorkoutId(): number | null {
    return this.lastProcessedWorkoutId;
  }

  /**
   * Manually check for new workouts (useful for initial load)
   */
  async checkForNewWorkouts(userId: string): Promise<Workout[]> {
    try {
      const workouts = await dbHelpers.getAllWorkouts(userId);
      
      if (this.lastProcessedWorkoutId === null) {
        // First time, mark all as processed
        if (workouts.length > 0 && workouts[0].id) {
          this.lastProcessedWorkoutId = workouts[0].id;
          this.lastProcessedWorkoutTimestamp = new Date(workouts[0].date).getTime();
        }
        return [];
      }

      // Find workouts newer than last processed
      const newWorkouts = workouts.filter(workout => {
        if (!workout.id) return false;
        return workout.id > this.lastProcessedWorkoutId!;
      });

      // Update last processed
      if (newWorkouts.length > 0) {
        const mostRecent = newWorkouts[0];
        if (mostRecent.id) {
          this.lastProcessedWorkoutId = mostRecent.id;
          this.lastProcessedWorkoutTimestamp = new Date(mostRecent.date).getTime();
        }
      }

      return newWorkouts;
    } catch (error) {
      console.error('Failed to check for new workouts:', error);
      return [];
    }
  }

  /**
   * Reset the tracker (useful for testing or user logout)
   */
  reset(): void {
    this.lastProcessedWorkoutId = null;
    this.lastProcessedWorkoutTimestamp = null;
    this.listeners.clear();
    this.isInitialized = false;
  }
}

export const workoutEventTracker = new WorkoutEventTracker();

