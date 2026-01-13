import { logger } from '@/utils/logger';

interface VersionInfo {
    version: string;
    timestamp: number;
    buildDate: string;
    gitCommit?: string;
}

const VERSION_STORAGE_KEY = 'app-version';
const VERSION_FILE_PATH = '/version.json';

class CacheVersionService {
    private isClearingCache = false;

    async checkAndClearCacheIfNeeded(): Promise<boolean> {
        if (this.isClearingCache) {
            return false;
        }

        try {
            const currentVersion = await this.fetchCurrentVersion();
            if (!currentVersion) {
                // Only warn in production - version.json is expected to be missing in dev mode
                if (import.meta.env.PROD) {
                    logger.warn('[CacheVersionService] Could not fetch version.json, skipping cache check');
                }
                return false;
            }

            const storedVersion = localStorage.getItem(VERSION_STORAGE_KEY);

            if (!storedVersion) {
                // First time visit - store version and continue
                localStorage.setItem(VERSION_STORAGE_KEY, currentVersion.version);
                return false;
            }

            if (storedVersion === currentVersion.version) {
                // Version matches, no need to clear cache
                return false;
            }

            // Version changed - clear all caches
            await this.clearAllCaches();

            // Store new version
            localStorage.setItem(VERSION_STORAGE_KEY, currentVersion.version);

            // Reload page to ensure fresh assets are loaded
            window.location.reload();

            return true;
        } catch (error) {
            logger.error('[CacheVersionService] Error checking version:', error);
            return false;
        }
    }

    private async fetchCurrentVersion(): Promise<VersionInfo | null> {
        try {
            const response = await fetch(`${VERSION_FILE_PATH}?t=${Date.now()}`);
            if (!response.ok) {
                return null;
            }
            
            // Check if response is actually JSON (not HTML 404 page)
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                return null;
            }
            
            const text = await response.text();
            
            // Additional check: if response starts with HTML tags, it's not JSON
            if (text.trim().startsWith('<!')) {
                return null;
            }
            
            return JSON.parse(text) as VersionInfo;
        } catch (error) {
            // Silently handle errors - version.json may not exist in dev mode
            return null;
        }
    }

    private async clearAllCaches(): Promise<void> {
        this.isClearingCache = true;

        try {
            // Clear all Cache API caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                const clearPromises = cacheNames.map(cacheName => {
                    return caches.delete(cacheName);
                });
                await Promise.all(clearPromises);
            }

            // Unregister all service workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                const unregisterPromises = registrations.map(registration => {
                    return registration.unregister();
                });
                await Promise.all(unregisterPromises);
            }

            // Clear specific known cache names (in case some weren't listed)
            const knownCacheNames = [
                'workbox-precache-v2-http://localhost:3000/',
                'workbox-precache-https://',
                'static-assets',
                'ai-responses',
                'google-fonts-cache',
                'gstatic-fonts-cache',
            ];

            if ('caches' in window) {
                for (const cacheName of knownCacheNames) {
                    try {
                        await caches.delete(cacheName);
                    } catch (error) {
                        // Cache might not exist, ignore error
                    }
                }
            }
        } catch (error) {
            logger.error('[CacheVersionService] Error clearing caches:', error);
        } finally {
            this.isClearingCache = false;
        }
    }

    async clearAllCachesFromServiceWorker(): Promise<void> {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            return new Promise((resolve) => {
                const messageChannel = new MessageChannel();

                messageChannel.port1.onmessage = (event) => {
                    if (event.data && event.data.type === 'CACHE_CLEARED') {
                        resolve();
                    }
                };

                navigator.serviceWorker.controller?.postMessage(
                    { type: 'CLEAR_ALL_CACHES' },
                    [messageChannel.port2]
                );

        // Timeout after 5 seconds
        setTimeout(() => {
          logger.warn('[CacheVersionService] Service worker cache clear timeout');
          resolve();
        }, 5000);
            });
        }
    }
}

export const cacheVersionService = new CacheVersionService();

