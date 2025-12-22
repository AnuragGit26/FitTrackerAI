import { dataService } from './dataService';
import { useWorkoutStore } from '@/store/workoutStore';
import { useUserStore } from '@/store/userStore';
import { useSettingsStore } from '@/store/settingsStore';

class DataSyncService {
  private initialized = false;
  private unsubscribeCallbacks: (() => void)[] = [];

  initialize() {
    if (this.initialized) return;

    const unsubscribeWorkout = dataService.on('workout', async () => {
      const userStore = useUserStore.getState();
      const workoutStore = useWorkoutStore.getState();
      if (userStore.profile) {
        await workoutStore.loadWorkouts(userStore.profile.id);
      }
    });

    const unsubscribeUser = dataService.on('user', async () => {
      const userStore = useUserStore.getState();
      await userStore.initializeUser();
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

