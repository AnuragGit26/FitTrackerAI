/**
 * Icon Refresh Service
 * Forces PWA icon updates for existing users when icons change
 *
 * This service:
 * - Tracks icon version changes
 * - Clears old icon caches
 * - Forces service worker to update icon references
 * - Prompts users to re-add to home screen if needed
 */

import { logger } from '@/utils/logger';

const ICON_VERSION_KEY = 'fitTrackAI_iconVersion';
const CURRENT_ICON_VERSION = '2.0.0'; // Updated to Icon2.png
const ICON_UPDATE_PROMPTED_KEY = 'fitTrackAI_iconUpdatePrompted';

interface IconRefreshStatus {
  needsRefresh: boolean;
  currentVersion: string;
  previousVersion: string | null;
  isFirstInstall: boolean;
}

class IconRefreshService {
  /**
   * Check if icons need to be refreshed
   */
  checkIconVersion(): IconRefreshStatus {
    const storedVersion = localStorage.getItem(ICON_VERSION_KEY);

    return {
      needsRefresh: storedVersion !== null && storedVersion !== CURRENT_ICON_VERSION,
      currentVersion: CURRENT_ICON_VERSION,
      previousVersion: storedVersion,
      isFirstInstall: storedVersion === null,
    };
  }

  /**
   * Update stored icon version
   */
  updateIconVersion(): void {
    localStorage.setItem(ICON_VERSION_KEY, CURRENT_ICON_VERSION);
    logger.info(`[IconRefresh] Updated icon version to ${CURRENT_ICON_VERSION}`);
  }

  /**
   * Clear old icon caches from service worker
   */
  async clearOldIconCaches(): Promise<void> {
    if (!('caches' in window)) {
      logger.warn('[IconRefresh] Cache API not available');
      return;
    }

    try {
      const cacheNames = await caches.keys();
      const iconCachePatterns = [
        'static-assets', // Where icons are typically cached
        'workbox-precache', // Workbox precache
      ];

      for (const cacheName of cacheNames) {
        const shouldClear = iconCachePatterns.some(pattern =>
          cacheName.includes(pattern)
        );

        if (shouldClear) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();

          // Delete old icon files
          for (const request of requests) {
            if (request.url.includes('Fittrack2.png')) {
              await cache.delete(request);
              logger.info(`[IconRefresh] Deleted old icon: ${request.url}`);
            }
          }
        }
      }

      logger.info('[IconRefresh] Old icon caches cleared');
    } catch (error) {
      logger.error('[IconRefresh] Failed to clear old icon caches', error);
    }
  }

  /**
   * Force service worker to update
   */
  async forceServiceWorkerUpdate(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      logger.warn('[IconRefresh] Service Worker not available');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();

      if (registration) {
        logger.info('[IconRefresh] Forcing service worker update...');
        await registration.update();

        // If there's a waiting service worker, activate it immediately
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          logger.info('[IconRefresh] Activated waiting service worker');
        }
      }
    } catch (error) {
      logger.error('[IconRefresh] Failed to force service worker update', error);
    }
  }

  /**
   * Clear manifest cache to force icon reload
   */
  async clearManifestCache(): Promise<void> {
    if (!('caches' in window)) return;

    try {
      const cacheNames = await caches.keys();

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();

        // Delete manifest files
        for (const request of requests) {
          if (request.url.includes('manifest.webmanifest') ||
              request.url.includes('manifest.json')) {
            await cache.delete(request);
            logger.info(`[IconRefresh] Deleted manifest cache: ${request.url}`);
          }
        }
      }
    } catch (error) {
      logger.error('[IconRefresh] Failed to clear manifest cache', error);
    }
  }

  /**
   * Check if user has been prompted about icon update
   */
  hasBeenPrompted(): boolean {
    const prompted = localStorage.getItem(ICON_UPDATE_PROMPTED_KEY);
    return prompted === CURRENT_ICON_VERSION;
  }

  /**
   * Mark that user has been prompted about icon update
   */
  markAsPrompted(): void {
    localStorage.setItem(ICON_UPDATE_PROMPTED_KEY, CURRENT_ICON_VERSION);
  }

  /**
   * Main refresh flow - call this on app initialization
   */
  async refreshIconsIfNeeded(): Promise<boolean> {
    const status = this.checkIconVersion();

    // First install - just set version
    if (status.isFirstInstall) {
      this.updateIconVersion();
      logger.info('[IconRefresh] First install - icon version set');
      return false;
    }

    // No refresh needed
    if (!status.needsRefresh) {
      return false;
    }

    logger.info('[IconRefresh] Icon update detected', {
      from: status.previousVersion,
      to: status.currentVersion,
    });

    // Perform refresh actions
    await this.clearOldIconCaches();
    await this.clearManifestCache();
    await this.forceServiceWorkerUpdate();

    // Update version
    this.updateIconVersion();

    logger.info('[IconRefresh] Icon refresh complete');
    return true;
  }

  /**
   * Get instructions for users to update their home screen icon
   */
  getUpdateInstructions(): { platform: string; instructions: string[] } {
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const isMacOS = /macintosh|mac os x/.test(userAgent);

    if (isIOS) {
      return {
        platform: 'iOS',
        instructions: [
          'Remove the current app from your Home Screen',
          'Open Safari and visit this site',
          'Tap the Share button (square with arrow)',
          'Select "Add to Home Screen"',
          'Tap "Add" to install with the new icon',
        ],
      };
    }

    if (isAndroid) {
      return {
        platform: 'Android',
        instructions: [
          'Long-press the app icon on your Home Screen',
          'Select "Remove" or "Uninstall"',
          'Open Chrome and visit this site',
          'Tap the menu (three dots)',
          'Select "Add to Home Screen"',
          'The new icon will be installed',
        ],
      };
    }

    if (isMacOS) {
      return {
        platform: 'macOS',
        instructions: [
          'Remove the current app from your Dock',
          'Visit this site in your browser',
          'Install the app again to get the new icon',
        ],
      };
    }

    return {
      platform: 'Desktop',
      instructions: [
        'Uninstall the current PWA',
        'Visit this site again',
        'Reinstall the app to get the updated icon',
      ],
    };
  }

  /**
   * Reset icon version (for testing)
   */
  resetIconVersion(): void {
    localStorage.removeItem(ICON_VERSION_KEY);
    localStorage.removeItem(ICON_UPDATE_PROMPTED_KEY);
    logger.info('[IconRefresh] Icon version reset');
  }
}

export const iconRefreshService = new IconRefreshService();
