import { dbHelpers } from './database';
import { Workout } from '@/types/workout';
import { Exercise, WorkoutExercise } from '@/types/exercise';
import { MuscleStatus } from '@/types/muscle';

type EventType = 'workout' | 'user' | 'settings' | 'muscle' | 'exercise';
type EventCallback = () => void;

class DataService {
  private listeners: Map<EventType, Set<EventCallback>> = new Map();

  // Event system for data synchronization
  on(event: EventType, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: EventType): void {
    this.listeners.get(event)?.forEach(callback => callback());
  }

  // Validation helpers
  private validateWorkout(workout: Omit<Workout, 'id'>): void {
    if (!workout.userId) {
      throw new Error('Workout must have a userId');
    }
    if (!workout.date) {
      throw new Error('Workout must have a date');
    }
    if (!workout.startTime) {
      throw new Error('Workout must have a startTime');
    }
    if (!Array.isArray(workout.exercises)) {
      throw new Error('Workout exercises must be an array');
    }
  }

  private validateExercise(exercise: Exercise): void {
    if (!exercise.id) {
      throw new Error('Exercise must have an id');
    }
    if (!exercise.name || exercise.name.trim() === '') {
      throw new Error('Exercise must have a name');
    }
    if (!exercise.category) {
      throw new Error('Exercise must have a category');
    }
  }

  // Workout operations with retry logic
  async createWorkout(workout: Omit<Workout, 'id'>): Promise<number> {
    this.validateWorkout(workout);
    
    let retries = 3;
    while (retries > 0) {
      try {
        const id = await dbHelpers.saveWorkout(workout);
        this.emit('workout');
        return id;
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw new Error(`Failed to create workout: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    throw new Error('Failed to create workout after retries');
  }

  async getWorkout(id: number): Promise<Workout | undefined> {
    try {
      return await dbHelpers.getWorkout(id);
    } catch (error) {
      throw new Error(`Failed to get workout: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAllWorkouts(userId: string): Promise<Workout[]> {
    try {
      return await dbHelpers.getAllWorkouts(userId);
    } catch (error) {
      throw new Error(`Failed to get workouts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getWorkoutsByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Workout[]> {
    try {
      return await dbHelpers.getWorkoutsByDateRange(userId, startDate, endDate);
    } catch (error) {
      throw new Error(`Failed to get workouts by date range: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateWorkout(id: number, updates: Partial<Workout>): Promise<void> {
    let retries = 3;
    while (retries > 0) {
      try {
        await dbHelpers.updateWorkout(id, updates);
        this.emit('workout');
        return;
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw new Error(`Failed to update workout: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  async deleteWorkout(id: number): Promise<void> {
    let retries = 3;
    while (retries > 0) {
      try {
        await dbHelpers.deleteWorkout(id);
        this.emit('workout');
        return;
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw new Error(`Failed to delete workout: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  // Exercise operations
  async createExercise(exercise: Exercise): Promise<string> {
    this.validateExercise(exercise);
    
    try {
      return await dbHelpers.saveExercise(exercise);
    } catch (error) {
      throw new Error(`Failed to create exercise: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getExercise(id: string): Promise<Exercise | undefined> {
    try {
      return await dbHelpers.getExercise(id);
    } catch (error) {
      throw new Error(`Failed to get exercise: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAllExercises(): Promise<Exercise[]> {
    try {
      return await dbHelpers.getAllExercises();
    } catch (error) {
      throw new Error(`Failed to get exercises: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchExercises(query: string): Promise<Exercise[]> {
    try {
      return await dbHelpers.searchExercises(query);
    } catch (error) {
      throw new Error(`Failed to search exercises: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async filterExercisesByEquipment(equipmentCategories: string[]): Promise<Exercise[]> {
    try {
      return await dbHelpers.filterExercisesByEquipment(equipmentCategories);
    } catch (error) {
      throw new Error(`Failed to filter exercises: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteExercise(id: string): Promise<void> {
    try {
      await dbHelpers.deleteExercise(id);
      this.emit('exercise');
    } catch (error) {
      throw new Error(`Failed to delete exercise: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // User profile operations
  async getUserProfile(): Promise<any> {
    try {
      return await dbHelpers.getSetting('userProfile');
    } catch (error) {
      throw new Error(`Failed to get user profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateUserProfile(profile: any): Promise<void> {
    let retries = 3;
    while (retries > 0) {
      try {
        await dbHelpers.setSetting('userProfile', profile);
        this.emit('user');
        return;
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw new Error(`Failed to update user profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  // Settings operations
  async getSetting(key: string): Promise<any> {
    try {
      return await dbHelpers.getSetting(key);
    } catch (error) {
      throw new Error(`Failed to get setting: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateSetting(key: string, value: any): Promise<void> {
    let retries = 3;
    while (retries > 0) {
      try {
        await dbHelpers.setSetting(key, value);
        this.emit('settings');
        return;
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw new Error(`Failed to update setting: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  // Muscle status operations
  async createMuscleStatus(status: Omit<MuscleStatus, 'id'>): Promise<number> {
    try {
      const id = await dbHelpers.saveMuscleStatus(status);
      this.emit('muscle');
      return id;
    } catch (error) {
      throw new Error(`Failed to create muscle status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getMuscleStatus(muscle: string): Promise<MuscleStatus | undefined> {
    try {
      return await dbHelpers.getMuscleStatus(muscle);
    } catch (error) {
      throw new Error(`Failed to get muscle status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAllMuscleStatuses(): Promise<MuscleStatus[]> {
    try {
      return await dbHelpers.getAllMuscleStatuses();
    } catch (error) {
      throw new Error(`Failed to get muscle statuses: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateMuscleStatus(id: number, updates: Partial<MuscleStatus>): Promise<void> {
    let retries = 3;
    while (retries > 0) {
      try {
        await dbHelpers.updateMuscleStatus(id, updates);
        this.emit('muscle');
        return;
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw new Error(`Failed to update muscle status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  async upsertMuscleStatus(status: MuscleStatus): Promise<number> {
    let retries = 3;
    while (retries > 0) {
      try {
        const id = await dbHelpers.upsertMuscleStatus(status);
        this.emit('muscle');
        return id;
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw new Error(`Failed to upsert muscle status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    throw new Error('Failed to upsert muscle status after retries');
  }

  // Transaction support for multi-step operations
  async transaction<T>(operations: (() => Promise<void>)[], rollback?: () => Promise<void>): Promise<T> {
    const completed: (() => Promise<void>)[] = [];
    
    try {
      for (const operation of operations) {
        await operation();
        completed.push(operation);
      }
      return {} as T;
    } catch (error) {
      if (rollback) {
        try {
          await rollback();
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError);
        }
      }
      throw error;
    }
  }
}

export const dataService = new DataService();

