import { dataService } from './dataService';
import { useWorkoutStore } from '@/store/workoutStore';
import { useUserStore } from '@/store/userStore';
import { useSettingsStore } from '@/store/settingsStore';

class DataSyncService {
  private initialized = false;
  private unsubscribeCallbacks: (() => void)[] = [];
  private isInitializingUser = false;

  initialize() {
    if (this.initialized) {return;}

    const unsubscribeWorkout = dataService.on('workout', async () => {
      const userStore = useUserStore.getState();
      const workoutStore = useWorkoutStore.getState();
      if (userStore.profile) {
        await workoutStore.loadWorkouts(userStore.profile.id);
      }
    });

    const unsubscribeUser = dataService.on('user', async () => {
      // Prevent infinite loop: don't call initializeUser if we're already initializing
      if (this.isInitializingUser) {
        return;
      }
      const userStore = useUserStore.getState();
      this.isInitializingUser = true;
      try {
        await userStore.initializeUser();
      } finally {
        this.isInitializingUser = false;
      }
    });

    const unsubscribeSettings = dataService.on('settings', async () => {
      const settingsStore = useSettingsStore.getState();
      await settingsStore.loadSettings();
    });

    this.unsubscribeCallbacks = [
      unsubscribeWorkout,
      unsubscribeUser,
      unsubscribeSettings,
    ];

    this.initialized = true;
  }

  destroy() {
    this.unsubscribeCallbacks.forEach(unsubscribe => unsubscribe());
    this.unsubscribeCallbacks = [];
    this.initialized = false;
  }

  async syncAll(userId: string) {
    const workoutStore = useWorkoutStore.getState();
    const userStore = useUserStore.getState();
    const settingsStore = useSettingsStore.getState();

    await Promise.all([
      workoutStore.loadWorkouts(userId),
      userStore.initializeUser(),
      settingsStore.loadSettings(),
    ]);
  }
}

export const dataSync = new DataSyncService();

