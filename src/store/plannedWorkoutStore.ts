import { create } from 'zustand';
import { PlannedWorkout } from '@/types/workout';
import { plannedWorkoutService } from '@/services/plannedWorkoutService';
import { notificationService } from '@/services/notificationService';
import { useSettingsStore } from '@/store/settingsStore';

export type PlannerViewMode = 'week' | 'month' | 'custom';

interface PlannedWorkoutState {
  plannedWorkouts: PlannedWorkout[];
  selectedDate: Date;
  viewMode: PlannerViewMode;
  customDays: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadPlannedWorkouts: (userId: string) => Promise<void>;
  loadPlannedWorkoutsByDateRange: (
    userId: string,
    startDate: Date,
    endDate: Date
  ) => Promise<void>;
  createPlannedWorkout: (
    userId: string,
    plannedWorkout: Omit<PlannedWorkout, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<string>;
  updatePlannedWorkout: (
    id: string,
    updates: Partial<Omit<PlannedWorkout, 'id' | 'createdAt'>>
  ) => Promise<void>;
  deletePlannedWorkout: (id: string) => Promise<void>;
  markAsCompleted: (id: string, completedWorkoutId: number) => Promise<void>;
  setSelectedDate: (date: Date) => void;
  setViewMode: (mode: PlannerViewMode) => void;
  setCustomDays: (days: number) => void;
  clearError: () => void;
}

export const usePlannedWorkoutStore = create<PlannedWorkoutState>((set, get) => ({
  plannedWorkouts: [],
  selectedDate: new Date(),
  viewMode: 'month',
  customDays: 7,
  isLoading: false,
  error: null,

  loadPlannedWorkouts: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const plannedWorkouts = await plannedWorkoutService.getAllPlannedWorkouts(userId);
      set({ plannedWorkouts, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load planned workouts',
        isLoading: false,
      });
    }
  },

  loadPlannedWorkoutsByDateRange: async (
    userId: string,
    startDate: Date,
    endDate: Date
  ) => {
    set({ isLoading: true, error: null });
    try {
      const plannedWorkouts = await plannedWorkoutService.getPlannedWorkoutsByDateRange(
        userId,
        startDate,
        endDate
      );
      set({ plannedWorkouts, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load planned workouts',
        isLoading: false,
      });
    }
  },

  createPlannedWorkout: async (
    userId: string,
    plannedWorkout: Omit<PlannedWorkout, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    set({ isLoading: true, error: null });
    try {
      const id = await plannedWorkoutService.createPlannedWorkout(userId, plannedWorkout);
      const newPlannedWorkout = await plannedWorkoutService.getPlannedWorkout(id);
      if (newPlannedWorkout) {
        set((state) => ({
          plannedWorkouts: [...state.plannedWorkouts, newPlannedWorkout],
          isLoading: false,
        }));
        
        // Schedule notification if enabled
        const settings = useSettingsStore.getState().settings;
        if (settings.workoutReminderEnabled && settings.notificationPermission === 'granted' && newPlannedWorkout.scheduledTime) {
          await notificationService.scheduleWorkoutReminder(
            newPlannedWorkout,
            settings.workoutReminderMinutes || 30
          );
        }
      }
      return id;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create planned workout',
        isLoading: false,
      });
      throw error;
    }
  },

  updatePlannedWorkout: async (
    id: string,
    updates: Partial<Omit<PlannedWorkout, 'id' | 'createdAt'>>
  ) => {
    set({ isLoading: true, error: null });
    try {
      // Cancel existing notification if scheduled time is changing
      const existing = get().plannedWorkouts.find((pw) => pw.id === id);
      if (existing && (updates.scheduledTime || updates.scheduledDate)) {
        await notificationService.cancelWorkoutReminder(id);
      }
      
      await plannedWorkoutService.updatePlannedWorkout(id, updates);
      const updatedPlannedWorkout = await plannedWorkoutService.getPlannedWorkout(id);
      if (updatedPlannedWorkout) {
        set((state) => ({
          plannedWorkouts: state.plannedWorkouts.map((pw) =>
            pw.id === id ? updatedPlannedWorkout : pw
          ),
          isLoading: false,
        }));
        
        // Reschedule notification if enabled
        const settings = useSettingsStore.getState().settings;
        if (settings.workoutReminderEnabled && settings.notificationPermission === 'granted' && updatedPlannedWorkout.scheduledTime) {
          await notificationService.scheduleWorkoutReminder(
            updatedPlannedWorkout,
            settings.workoutReminderMinutes || 30
          );
        }
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update planned workout',
        isLoading: false,
      });
    }
  },

  deletePlannedWorkout: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      // Cancel notification before deleting
      await notificationService.cancelWorkoutReminder(id);
      
      await plannedWorkoutService.deletePlannedWorkout(id);
      set((state) => ({
        plannedWorkouts: state.plannedWorkouts.filter((pw) => pw.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete planned workout',
        isLoading: false,
      });
    }
  },

  markAsCompleted: async (id: string, completedWorkoutId: number) => {
    set({ isLoading: true, error: null });
    try {
      // Cancel notification when workout is completed
      await notificationService.cancelWorkoutReminder(id);
      
      await plannedWorkoutService.markAsCompleted(id, completedWorkoutId);
      const updatedPlannedWorkout = await plannedWorkoutService.getPlannedWorkout(id);
      if (updatedPlannedWorkout) {
        set((state) => ({
          plannedWorkouts: state.plannedWorkouts.map((pw) =>
            pw.id === id ? updatedPlannedWorkout : pw
          ),
          isLoading: false,
        }));
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to mark planned workout as completed',
        isLoading: false,
      });
    }
  },

  setSelectedDate: (date: Date) => {
    set({ selectedDate: date });
  },

  setViewMode: (mode: PlannerViewMode) => {
    set({ viewMode: mode });
  },

  setCustomDays: (days: number) => {
    set({ customDays: days });
  },

  clearError: () => {
    set({ error: null });
  },
}));

