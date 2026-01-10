/**
 * Haptic Feedback Service
 * Manages device vibration patterns with cross-platform support
 */

interface HapticPattern {
  light: number[];
  medium: number[];
  heavy: number[];
}

interface NotificationPattern {
  success: number[];
  warning: number[];
  error: number[];
}

class HapticService {
  private isEnabled = true;
  private isSupported = false;

  constructor() {
    // Check for vibration API support
    this.isSupported = 'vibrate' in navigator;
  }

  /**
   * Trigger a haptic impact feedback
   * @param style - The intensity of the haptic feedback
   */
  impact(style: 'light' | 'medium' | 'heavy' = 'medium'): void {
    if (!this.isEnabled || !this.isSupported) return;

    const patterns: HapticPattern = {
      light: [10],
      medium: [20],
      heavy: [30]
    };

    try {
      navigator.vibrate(patterns[style]);
    } catch (error) {
      // Error intentionally ignored for user experience
    }
  }

  /**
   * Trigger a notification haptic pattern
   * @param type - The type of notification
   */
  notification(type: 'success' | 'warning' | 'error' = 'success'): void {
    if (!this.isEnabled || !this.isSupported) return;

    const patterns: NotificationPattern = {
      success: [10, 50, 10], // Short-pause-short
      warning: [10, 100, 10], // Short-pause-short (longer pause)
      error: [10, 50, 10, 50, 10] // Triple tap
    };

    try {
      navigator.vibrate(patterns[type]);
    } catch (error) {
      // Error intentionally ignored for user experience
    }
  }

  /**
   * Trigger a selection change haptic (very light)
   */
  selection(): void {
    if (!this.isEnabled || !this.isSupported) return;

    try {
      navigator.vibrate([5]); // Very subtle
    } catch (error) {
      // Error intentionally ignored for user experience
    }
  }

  /**
   * Trigger a custom vibration pattern
   * @param pattern - Array of vibration durations in milliseconds
   */
  custom(pattern: number[]): void {
    if (!this.isEnabled || !this.isSupported) return;

    try {
      navigator.vibrate(pattern);
    } catch (error) {
      // Error intentionally ignored for user experience
    }
  }

  /**
   * Enable or disable haptic feedback
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Check if haptic feedback is enabled
   */
  getEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Check if haptic feedback is supported
   */
  getSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Cancel any ongoing vibration
   */
  cancel(): void {
    if (!this.isSupported) return;

    try {
      navigator.vibrate(0);
    } catch (error) {
      // Error intentionally ignored for user experience
    }
  }

  /**
   * Celebration pattern - sequence of impacts for set completion
   */
  celebration(): void {
    if (!this.isEnabled || !this.isSupported) return;

    // Pattern: medium impact, 3 light taps, success notification
    const pattern = [
      20,  // Medium impact at start
      200, // Pause
      10,  // Light tap
      50,  // Pause
      10,  // Light tap
      50,  // Pause
      10,  // Light tap
      150, // Pause
      10,  // Success notification start
      50,
      10   // Success notification end
    ];

    try {
      navigator.vibrate(pattern);
    } catch (error) {
      // Error intentionally ignored for user experience
    }
  }
}

// Singleton instance
export const hapticService = new HapticService();
