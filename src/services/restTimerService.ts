/**
 * Rest Timer Service
 * Handles background timer management, notifications, and state persistence
 */

export interface RestTimerState {
  remaining: number;
  startTime: Date | null;
  paused: boolean;
  originalDuration: number;
}

export interface RestTimerPreset {
  id: string;
  name: string;
  description: string;
  duration: number; // seconds
  icon: string;
  color: string;
}

import { logger } from '@/utils/logger';

class RestTimerService {
  private notificationPermission: NotificationPermission = 'default';
  private audioContext: AudioContext | null = null;

  constructor() {
    this.initializeNotificationPermission();
    this.initializeAudioContext();
  }

  private async initializeNotificationPermission() {
    if ('Notification' in window) {
      this.notificationPermission = Notification.permission;
      if (this.notificationPermission === 'default') {
        try {
          this.notificationPermission = await Notification.requestPermission();
        } catch (error) {
          logger.warn('Failed to request notification permission:', error);
        }
      }
    }
  }

  private initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext)();
    } catch (error) {
      logger.warn('AudioContext not supported:', error);
    }
  }

  /**
   * Play completion sound
   */
  playCompletionSound(): void {
    if (!this.audioContext) {
      return;
    }

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        this.audioContext.currentTime + 0.5
      );

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.5);
    } catch (error) {
      logger.warn('Failed to play sound:', error);
    }
  }

  /**
   * Trigger vibration
   */
  vibrate(pattern: number | number[] = [200, 100, 200]): void {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (error) {
        logger.warn('Vibration not supported:', error);
      }
    }
  }

  /**
   * Show notification
   */
  showNotification(title: string, body: string): void {
    if (this.notificationPermission === 'granted') {
      try {
        new Notification(`Fit Track AI - ${title}`, {
          body,
          icon: '/assets/img/FitTrackAI_Iconv2.jpg',
          badge: '/assets/img/FitTrackAI_Iconv2.jpg',
          tag: 'rest-timer',
        } as NotificationOptions);
      } catch (error) {
        logger.warn('Failed to show notification:', error);
      }
    }
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'default') {
      this.notificationPermission = await Notification.requestPermission();
    } else {
      this.notificationPermission = Notification.permission;
    }

    return this.notificationPermission;
  }

  /**
   * Get default presets
   */
  getDefaultPresets(): RestTimerPreset[] {
    return [
      {
        id: 'heavy-lifts',
        name: 'Heavy Lifts',
        description: 'Compound movements',
        duration: 180, // 3:00
        icon: 'fitness_center',
        color: 'orange',
      },
      {
        id: 'hypertrophy',
        name: 'Hypertrophy',
        description: 'Isolation exercises',
        duration: 90, // 1:30
        icon: 'accessibility_new',
        color: 'blue',
      },
      {
        id: 'cardio-hiit',
        name: 'Cardio / HIIT',
        description: 'Interval training',
        duration: 30, // 0:30
        icon: 'directions_run',
        color: 'purple',
      },
    ];
  }
}

export const restTimerService = new RestTimerService();

