import { create } from 'zustand';
import { dataService } from '@/services/dataService';

interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  autoStartRestTimer: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  notificationsEnabled: boolean;
  recoveryMultiplier: number; // 0.5x to 2x
  baseRestInterval: number; // Base rest interval in hours (12-72)
  showOnboarding: boolean;
  // Notification preferences
  workoutReminderEnabled: boolean;
  workoutReminderMinutes: number; // 15, 30, 60, or custom
  muscleRecoveryAlertsEnabled: boolean;
  notificationPermission: NotificationPermission;
}

interface SettingsState {
  settings: AppSettings;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  setTheme: (theme: 'light' | 'dark' | 'system') => Promise<void>;
  toggleAutoStartRestTimer: () => Promise<void>;
  toggleSound: () => Promise<void>;
  toggleVibration: () => Promise<void>;
  toggleNotifications: () => Promise<void>;
  setRecoveryMultiplier: (multiplier: number) => Promise<void>;
  setBaseRestInterval: (hours: number) => Promise<void>;
  // Notification settings
  setWorkoutReminderEnabled: (enabled: boolean) => Promise<void>;
  setWorkoutReminderMinutes: (minutes: number) => Promise<void>;
  setMuscleRecoveryAlertsEnabled: (enabled: boolean) => Promise<void>;
  setNotificationPermission: (permission: NotificationPermission) => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  autoStartRestTimer: true,
  soundEnabled: true,
  vibrationEnabled: true,
  notificationsEnabled: true,
  recoveryMultiplier: 1.0,
  baseRestInterval: 48, // 48 hours default
  showOnboarding: true,
  workoutReminderEnabled: true,
  workoutReminderMinutes: 30,
  muscleRecoveryAlertsEnabled: true,
  notificationPermission: 'default',
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: false,
  error: null,

  loadSettings: async () => {
    set({ isLoading: true, error: null });

    try {
      const savedSettings = await dataService.getSetting('appSettings');
      // Merge with defaults to handle new notification fields
      const settings = { ...DEFAULT_SETTINGS, ...(savedSettings || {}) };
      
      // Check notification permission from browser
      if ('Notification' in window) {
        settings.notificationPermission = Notification.permission;
      }
      
      set({ settings, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load settings',
        isLoading: false,
      });
    }
  },

  updateSettings: async (updates: Partial<AppSettings>) => {
    const { settings } = get();
    const updatedSettings = { ...settings, ...updates };
    
    set({ isLoading: true, error: null });

    try {
      await dataService.updateSetting('appSettings', updatedSettings);
      set({ settings: updatedSettings, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update settings',
        isLoading: false,
      });
    }
  },

  setTheme: async (theme: 'light' | 'dark' | 'system') => {
    await get().updateSettings({ theme });
    // Apply theme to document
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  toggleAutoStartRestTimer: async () => {
    const { settings } = get();
    await get().updateSettings({ autoStartRestTimer: !settings.autoStartRestTimer });
  },

  toggleSound: async () => {
    const { settings } = get();
    await get().updateSettings({ soundEnabled: !settings.soundEnabled });
  },

  toggleVibration: async () => {
    const { settings } = get();
    await get().updateSettings({ vibrationEnabled: !settings.vibrationEnabled });
  },

  toggleNotifications: async () => {
    const { settings } = get();
    await get().updateSettings({ notificationsEnabled: !settings.notificationsEnabled });
  },

  setRecoveryMultiplier: async (multiplier: number) => {
    const clamped = Math.max(0.5, Math.min(2.0, multiplier));
    await get().updateSettings({ recoveryMultiplier: clamped });
  },

  setBaseRestInterval: async (hours: number) => {
    const clamped = Math.max(12, Math.min(72, hours));
    await get().updateSettings({ baseRestInterval: clamped });
  },

  setWorkoutReminderEnabled: async (enabled: boolean) => {
    await get().updateSettings({ workoutReminderEnabled: enabled });
  },

  setWorkoutReminderMinutes: async (minutes: number) => {
    const clamped = Math.max(15, Math.min(120, minutes));
    await get().updateSettings({ workoutReminderMinutes: clamped });
  },

  setMuscleRecoveryAlertsEnabled: async (enabled: boolean) => {
    await get().updateSettings({ muscleRecoveryAlertsEnabled: enabled });
  },

  setNotificationPermission: async (permission: NotificationPermission) => {
    await get().updateSettings({ notificationPermission: permission });
  },
}));

