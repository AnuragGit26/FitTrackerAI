import { ExerciseAdvancedDetails } from '@/types/exercise';
import { db, dbHelpers } from './database';

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
const STRENGTHLOG_BASE_URL = 'https://www.strengthlog.com';

/**
 * Check if cache is still valid (less than 1 month old)
 */
function isCacheValid(cachedAt: number): boolean {
  const now = Date.now();
  const age = now - cachedAt;
  return age < ONE_MONTH_MS;
}

/**
 * Extract anatomy image URL from exercise page
 * Pattern: muscles-worked-by-{exercise-slug}-male.png
 * This is a fallback - prefer using static URL from exercise data
 */
function getAnatomyImageUrl(exerciseSlug: string): string {
  return `https://i0.wp.com/www.strengthlog.com/wp-content/uploads/2023/04/muscles-worked-by-${exerciseSlug}-male.png?w=1126&ssl=1`;
}

/**
 * Get anatomy image URL from exercise if available, otherwise use pattern-based fallback
 */
async function getAnatomyImageUrlFromExercise(exerciseSlug: string): Promise<string> {
  try {
    // Try to get exercise from library to use static anatomyImageUrl
    const { exerciseLibrary } = await import('./exerciseLibrary');
    const allExercises = await exerciseLibrary.getAllExercises();
    const exercise = allExercises.find(ex => ex.strengthlogSlug === exerciseSlug);
    
    if (exercise?.anatomyImageUrl) {
      return exercise.anatomyImageUrl;
    }
  } catch (error) {
    // Fallback to pattern-based URL
  }
  
  return getAnatomyImageUrl(exerciseSlug);
}

/**
 * Parse HTML content to extract exercise details
 */
function parseExerciseDetails(html: string, exerciseSlug: string): ExerciseAdvancedDetails {
  // Create a temporary DOM parser (works in browser)
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const details: ExerciseAdvancedDetails = {
    cachedAt: Date.now(),
    instructions: [],
    tips: [],
    commonMistakes: [],
    variations: [],
  };

  // Extract description (usually in first paragraph or intro section)
  const descriptionElement = doc.querySelector('article p, .entry-content p, .post-content p');
  if (descriptionElement) {
    details.description = descriptionElement.textContent?.trim() || undefined;
  }

  // Extract instructions (usually in ordered or unordered lists)
  const instructionLists = doc.querySelectorAll('ol, ul');
  instructionLists.forEach((list) => {
    const items = Array.from(list.querySelectorAll('li'));
    items.forEach((item) => {
      const text = item.textContent?.trim();
      if (text && text.length > 10) {
        // Check if it looks like an instruction (not too short)
        if (!details.instructions) {
          details.instructions = [];
        }
        details.instructions.push(text);
      }
    });
  });

  // Try to find sections with headings like "Tips", "Common Mistakes", "Variations"
  const headings = doc.querySelectorAll('h2, h3, h4');
  headings.forEach((heading) => {
    const headingText = heading.textContent?.toLowerCase() || '';
    let currentSection: string[] | undefined;

    if (headingText.includes('tip')) {
      currentSection = details.tips || [];
      details.tips = currentSection;
    } else if (headingText.includes('mistake') || headingText.includes('error')) {
      currentSection = details.commonMistakes || [];
      details.commonMistakes = currentSection;
    } else if (headingText.includes('variation') || headingText.includes('alternative')) {
      currentSection = details.variations || [];
      details.variations = currentSection;
    }

    // Extract content after the heading
    if (currentSection) {
      let nextElement = heading.nextElementSibling;
      while (nextElement && nextElement.tagName !== 'H2' && nextElement.tagName !== 'H3' && nextElement.tagName !== 'H4') {
        if (nextElement.tagName === 'UL' || nextElement.tagName === 'OL') {
          const items = Array.from(nextElement.querySelectorAll('li'));
          items.forEach((item) => {
            const text = item.textContent?.trim();
            if (text) {
              currentSection!.push(text);
            }
          });
        } else if (nextElement.tagName === 'P') {
          const text = nextElement.textContent?.trim();
          if (text && text.length > 20) {
            currentSection!.push(text);
          }
        }
        nextElement = nextElement.nextElementSibling;
      }
    }
  });

  return details;
}

/**
 * Fetch exercise details from StrengthLog page
 */
async function fetchExerciseDetailsFromWeb(exerciseSlug: string): Promise<ExerciseAdvancedDetails> {
  const url = `${STRENGTHLOG_BASE_URL}/${exerciseSlug}/`;
  
  try {
    // Use fetch to get the HTML
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/html',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch exercise details: ${response.statusText}`);
    }

    const html = await response.text();
    const details = parseExerciseDetails(html, exerciseSlug);

    // Add anatomy image URL (prefer static URL from exercise data if available)
    details.anatomyImageUrl = await getAnatomyImageUrlFromExercise(exerciseSlug);

    return details;
  } catch (error) {
    console.error(`Error fetching exercise details for ${exerciseSlug}:`, error);
    
    // Return minimal details on error (try to get static URL if available)
    const anatomyUrl = await getAnatomyImageUrlFromExercise(exerciseSlug);
    return {
      cachedAt: Date.now(),
      anatomyImageUrl: anatomyUrl,
    };
  }
}

class ExerciseDetailsService {
  /**
   * Get exercise details, using cache if valid, otherwise fetching fresh data
   */
  async getExerciseDetails(exerciseSlug: string): Promise<ExerciseAdvancedDetails | null> {
    if (!exerciseSlug) {
      return null;
    }

    try {
      // Check cache first
      const cached = await dbHelpers.getExerciseDetailsWithTimestamp(exerciseSlug);

      if (cached && isCacheValid(cached.cachedAt)) {
        // Cache is valid, return cached data
        return cached.details;
      }

      // Cache is invalid or doesn't exist, fetch fresh data
      const details = await fetchExerciseDetailsFromWeb(exerciseSlug);

      // Save to cache
      await dbHelpers.saveExerciseDetails(exerciseSlug, details);

      return details;
    } catch (error) {
      console.error(`Error getting exercise details for ${exerciseSlug}:`, error);
      
      // Try to return cached data even if expired, as fallback
      const cached = await dbHelpers.getExerciseDetails(exerciseSlug);
      if (cached) {
        return cached;
      }

      return null;
    }
  }

  /**
   * Force fetch and cache exercise details (bypasses cache check)
   */
  async fetchAndCacheExerciseDetails(exerciseSlug: string): Promise<ExerciseAdvancedDetails> {
    if (!exerciseSlug) {
      throw new Error('Exercise slug is required');
    }

    const details = await fetchExerciseDetailsFromWeb(exerciseSlug);
    await dbHelpers.saveExerciseDetails(exerciseSlug, details);
    return details;
  }

  /**
   * Check if cache is valid for an exercise
   */
  async isCacheValid(exerciseSlug: string): Promise<boolean> {
    const cached = await dbHelpers.getExerciseDetailsWithTimestamp(exerciseSlug);
    if (!cached) {
      return false;
    }
    return isCacheValid(cached.cachedAt);
  }

  /**
   * Get anatomy image URL for an exercise
   * Prefers static URL from exercise data if available
   */
  async getAnatomyImageUrl(exerciseSlug: string): Promise<string> {
    return await getAnatomyImageUrlFromExercise(exerciseSlug);
  }

  /**
   * Clear cache for a specific exercise or all exercises
   */
  async clearCache(exerciseSlug?: string): Promise<void> {
    await dbHelpers.clearExerciseDetailsCache(exerciseSlug);
  }

  /**
   * Get cache age in days
   */
  async getCacheAge(exerciseSlug: string): Promise<number | null> {
    const cached = await dbHelpers.getExerciseDetailsWithTimestamp(exerciseSlug);
    if (!cached) {
      return null;
    }

    const ageMs = Date.now() - cached.cachedAt;
    return Math.floor(ageMs / (24 * 60 * 60 * 1000)); // Convert to days
  }
}

export const exerciseDetailsService = new ExerciseDetailsService();

