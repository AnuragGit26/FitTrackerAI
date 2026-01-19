import { MuscleGroup } from '@/types/muscle';
import { db } from './database';
import { logger } from '@/utils/logger';

export interface MuscleImageCache {
    id?: number;
    muscle: MuscleGroup;
    imageUrl: string;
    imageBlob: Blob;
    cachedAt: number;
    contentType: string;
}

// Generate consistent SVG data URI for muscle groups
// This creates a gradient background with muscle name - always works, no external dependencies
function generateMuscleSVG(muscle: MuscleGroup): string {
    const muscleName = muscle
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    // Create a consistent gradient based on muscle group
    const gradientId = `grad-${muscle}`;
    const colors = getMuscleColors(muscle);

    const svg = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.start};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${colors.end};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#${gradientId})" />
  <text x="256" y="256" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#0df269" text-anchor="middle" dominant-baseline="middle" opacity="0.8">${muscleName}</text>
</svg>`;

    // URL encode the SVG instead of base64 for better compatibility
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// Get consistent colors for each muscle group
function getMuscleColors(muscle: MuscleGroup): { start: string; end: string } {
    const colorMap: Record<MuscleGroup, { start: string; end: string }> = {
        // Upper Body - Chest (Red tones)
        [MuscleGroup.CHEST]: { start: '#2d1b2e', end: '#1a0f1a' },
        [MuscleGroup.UPPER_CHEST]: { start: '#2d1b2e', end: '#1a0f1a' },
        [MuscleGroup.LOWER_CHEST]: { start: '#2d1b2e', end: '#1a0f1a' },
        
        // Upper Body - Back (Blue tones)
        [MuscleGroup.BACK]: { start: '#1b2d3e', end: '#0f1a2e' },
        [MuscleGroup.LATS]: { start: '#1b2d3e', end: '#0f1a2e' },
        [MuscleGroup.TRAPS]: { start: '#1b2d3e', end: '#0f1a2e' },
        [MuscleGroup.RHOMBOIDS]: { start: '#1b2d3e', end: '#0f1a2e' },
        [MuscleGroup.LOWER_BACK]: { start: '#1b2d3e', end: '#0f1a2e' },
        
        // Upper Body - Shoulders (Purple tones)
        [MuscleGroup.SHOULDERS]: { start: '#2e1b3e', end: '#1a0f2e' },
        [MuscleGroup.FRONT_DELTS]: { start: '#2e1b3e', end: '#1a0f2e' },
        [MuscleGroup.SIDE_DELTS]: { start: '#2e1b3e', end: '#1a0f2e' },
        [MuscleGroup.REAR_DELTS]: { start: '#2e1b3e', end: '#1a0f2e' },
        
        // Upper Body - Arms (Orange tones)
        [MuscleGroup.BICEPS]: { start: '#3e2d1b', end: '#2e1a0f' },
        [MuscleGroup.TRICEPS]: { start: '#3e2d1b', end: '#2e1a0f' },
        [MuscleGroup.FOREARMS]: { start: '#3e2d1b', end: '#2e1a0f' },
        
        // Core (Green tones)
        [MuscleGroup.ABS]: { start: '#1b3e2d', end: '#0f2e1a' },
        [MuscleGroup.OBLIQUES]: { start: '#1b3e2d', end: '#0f2e1a' },
        
        // Lower Body (Yellow tones)
        [MuscleGroup.QUADS]: { start: '#3e3e1b', end: '#2e2e0f' },
        [MuscleGroup.HAMSTRINGS]: { start: '#3e3e1b', end: '#2e2e0f' },
        [MuscleGroup.GLUTES]: { start: '#3e3e1b', end: '#2e2e0f' },
        [MuscleGroup.CALVES]: { start: '#3e3e1b', end: '#2e2e0f' },
        [MuscleGroup.HIP_FLEXORS]: { start: '#3e3e1b', end: '#2e2e0f' },
    };
    
    return colorMap[muscle] || { start: '#1a1a2e', end: '#0f0f1a' };
}

// Map muscle groups to image URLs/data URIs
// Using SVG data URIs for consistent, offline-friendly images
const MUSCLE_IMAGE_MAP: Record<MuscleGroup, string> = {
    // All muscles use generated SVG data URIs
    [MuscleGroup.CHEST]: generateMuscleSVG(MuscleGroup.CHEST),
    [MuscleGroup.UPPER_CHEST]: generateMuscleSVG(MuscleGroup.UPPER_CHEST),
    [MuscleGroup.LOWER_CHEST]: generateMuscleSVG(MuscleGroup.LOWER_CHEST),
    [MuscleGroup.BACK]: generateMuscleSVG(MuscleGroup.BACK),
    [MuscleGroup.LATS]: generateMuscleSVG(MuscleGroup.LATS),
    [MuscleGroup.TRAPS]: generateMuscleSVG(MuscleGroup.TRAPS),
    [MuscleGroup.RHOMBOIDS]: generateMuscleSVG(MuscleGroup.RHOMBOIDS),
    [MuscleGroup.LOWER_BACK]: generateMuscleSVG(MuscleGroup.LOWER_BACK),
    [MuscleGroup.SHOULDERS]: generateMuscleSVG(MuscleGroup.SHOULDERS),
    [MuscleGroup.FRONT_DELTS]: generateMuscleSVG(MuscleGroup.FRONT_DELTS),
    [MuscleGroup.SIDE_DELTS]: generateMuscleSVG(MuscleGroup.SIDE_DELTS),
    [MuscleGroup.REAR_DELTS]: generateMuscleSVG(MuscleGroup.REAR_DELTS),
    [MuscleGroup.BICEPS]: generateMuscleSVG(MuscleGroup.BICEPS),
    [MuscleGroup.TRICEPS]: generateMuscleSVG(MuscleGroup.TRICEPS),
    [MuscleGroup.FOREARMS]: generateMuscleSVG(MuscleGroup.FOREARMS),
    [MuscleGroup.ABS]: generateMuscleSVG(MuscleGroup.ABS),
    [MuscleGroup.OBLIQUES]: generateMuscleSVG(MuscleGroup.OBLIQUES),
    [MuscleGroup.QUADS]: generateMuscleSVG(MuscleGroup.QUADS),
    [MuscleGroup.HAMSTRINGS]: generateMuscleSVG(MuscleGroup.HAMSTRINGS),
    [MuscleGroup.GLUTES]: generateMuscleSVG(MuscleGroup.GLUTES),
    [MuscleGroup.CALVES]: generateMuscleSVG(MuscleGroup.CALVES),
    [MuscleGroup.HIP_FLEXORS]: generateMuscleSVG(MuscleGroup.HIP_FLEXORS),
};

class MuscleImageCacheService {
    private cacheExpiry = 30 * 24 * 60 * 60 * 1000; // 30 days

    /**
     * Get the image URL for a muscle group
     */
    getImageUrl(muscle: MuscleGroup): string {
        return MUSCLE_IMAGE_MAP[muscle] || MUSCLE_IMAGE_MAP[MuscleGroup.CHEST];
    }

    /**
     * Get cached image blob URL or fetch and cache if not available
     */
    async getCachedImageUrl(muscle: MuscleGroup): Promise<string> {
        const imageUrl = this.getImageUrl(muscle);

        // Data URIs work directly, no need to cache them
        if (imageUrl.startsWith('data:')) {
            return imageUrl;
        }

        try {
            // Check if cached in IndexedDB (only for external URLs)
            const cached = await db.muscleImageCache
                .where('muscle')
                .equals(muscle)
                .first();

            if (cached) {
                const age = Date.now() - cached.cachedAt;
                if (age < this.cacheExpiry) {
                    // Return blob URL from cache
                    return URL.createObjectURL(cached.imageBlob);
                } else {
                    // Cache expired, remove it
                    await db.muscleImageCache.delete(cached.id!);
                }
            }

            // Fetch and cache the image (only for external URLs)
            return await this.fetchAndCacheImage(muscle);
        } catch (error) {
            logger.warn(`[MuscleImageCache] Failed to get cached image for ${muscle}:`, error);
            // Fallback to direct URL
            return imageUrl;
        }
    }

    /**
     * Fetch image from URL/data URI and cache it in IndexedDB
     */
    private async fetchAndCacheImage(muscle: MuscleGroup): Promise<string> {
        const imageUrl = this.getImageUrl(muscle);

        try {
            // If it's a data URI, convert to blob and cache
            if (imageUrl.startsWith('data:')) {
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                const contentType = blob.type || 'image/svg+xml';

                // Store in IndexedDB
                const existing = await db.muscleImageCache
                    .where('muscle')
                    .equals(muscle)
                    .first();

                const cacheEntry: MuscleImageCache = {
                    muscle,
                    imageUrl,
                    imageBlob: blob,
                    cachedAt: Date.now(),
                    contentType,
                };

                if (existing) {
                    await db.muscleImageCache.update(existing.id!, cacheEntry);
                } else {
                    await db.muscleImageCache.add(cacheEntry);
                }

                return URL.createObjectURL(blob);
            }

            // For external URLs, fetch normally
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type') || 'image/jpeg';
            const imageBlob = await response.blob();

            // Store in IndexedDB
            const existing = await db.muscleImageCache
                .where('muscle')
                .equals(muscle)
                .first();

            const cacheEntry: MuscleImageCache = {
                muscle,
                imageUrl,
                imageBlob,
                cachedAt: Date.now(),
                contentType,
            };

            if (existing) {
                await db.muscleImageCache.update(existing.id!, cacheEntry);
            } else {
                await db.muscleImageCache.add(cacheEntry);
            }

            // Return blob URL
            return URL.createObjectURL(imageBlob);
        } catch (error) {
            logger.error(`[MuscleImageCache] Failed to fetch image for ${muscle}:`, error);
            // Fallback to direct URL/data URI
            return imageUrl;
        }
    }

    /**
     * Preload all muscle images in the background
     */
    async preloadAllImages(): Promise<void> {
        const muscles = Object.values(MuscleGroup);

        // Preload each muscle image individually
        // Data URIs don't need preloading, but we can preload external URLs if any
        const preloadPromises = muscles.map(async (muscle) => {
            const imageUrl = this.getImageUrl(muscle);
            
            // Skip preloading for data URIs (they're already local)
            if (imageUrl.startsWith('data:')) {
                return;
            }
            
            try {
                await this.fetchAndCacheImage(muscle);
            } catch (error) {
                logger.warn(`[MuscleImageCache] Failed to preload image for ${muscle}:`, error);
            }
        });

        await Promise.allSettled(preloadPromises);
    }

    /**
     * Clear expired cache entries
     */
    async clearExpiredCache(): Promise<void> {
        const now = Date.now();
        const expired = await db.muscleImageCache
            .filter(cache => now - cache.cachedAt > this.cacheExpiry)
            .toArray();

        for (const entry of expired) {
            if (entry.id) {
                await db.muscleImageCache.delete(entry.id);
            }
        }
    }

    /**
     * Clear all cached images
     */
    async clearAllCache(): Promise<void> {
        await db.muscleImageCache.clear();
    }
}

export const muscleImageCache = new MuscleImageCacheService();

