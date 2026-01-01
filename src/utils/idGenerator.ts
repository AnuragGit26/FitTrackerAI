/**
 * ID Generation Utility
 * Generates unique alphanumeric IDs for exercises and workouts
 */

const ALPHANUMERIC_CHARS = '0123456789abcdefghijklmnopqrstuvwxyz';

/**
 * Generates a random alphanumeric string of specified length
 */
function generateRandomAlphanumeric(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ALPHANUMERIC_CHARS.charAt(
      Math.floor(Math.random() * ALPHANUMERIC_CHARS.length)
    );
  }
  return result;
}

/**
 * Generates an alphanumeric ID with a prefix
 * @param prefix - Prefix for the ID (e.g., "exr", "custom")
 * @param suffixLength - Length of alphanumeric suffix (default: 10)
 * @returns ID in format: {prefix}{suffix} (e.g., "exr1a2b3c4d")
 */
export function generateAlphanumericId(prefix: string, suffixLength: number = 10): string {
  const suffix = generateRandomAlphanumeric(suffixLength);
  return `${prefix}${suffix}`;
}

/**
 * Generates a custom exercise ID
 * @param userId - Optional user ID to include in the ID
 * @returns ID in format: custom-{userId}-{suffix} or custom-{suffix}
 */
export function generateCustomExerciseId(userId?: string): string {
  const suffix = generateRandomAlphanumeric(10);
  if (userId) {
    // Sanitize userId: remove special chars, lowercase, replace spaces with underscores
    const sanitizedUserId = userId
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50); // Limit length
    return `custom-${sanitizedUserId}-${suffix}`;
  }
  return `custom-${suffix}`;
}

/**
 * Sanitizes username for use in workout IDs
 */
function sanitizeUsername(username: string): string {
  return username
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '') // Remove special chars except underscore
    .replace(/\s+/g, '_') // Replace spaces with underscore
    .substring(0, 50); // Limit length
}

/**
 * Formats datetime as YYYYMMDDHHmmss
 */
function formatDateTime(dateTime: Date): string {
  const year = dateTime.getFullYear();
  const month = String(dateTime.getMonth() + 1).padStart(2, '0');
  const day = String(dateTime.getDate()).padStart(2, '0');
  const hours = String(dateTime.getHours()).padStart(2, '0');
  const minutes = String(dateTime.getMinutes()).padStart(2, '0');
  const seconds = String(dateTime.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * Generates a workout ID with username and datetime
 * @param username - Username to include in the ID
 * @param dateTime - Date/time of the workout
 * @param existingIds - Optional set of existing IDs to check for uniqueness
 * @returns ID in format: wkt-{username}-{datetime} or wkt-{username}-{datetime}-{suffix} if collision
 */
export function generateWorkoutId(
  username: string,
  dateTime: Date,
  existingIds?: Set<string>
): string {
  const sanitizedUsername = sanitizeUsername(username);
  const dateTimeStr = formatDateTime(dateTime);
  const baseId = `wkt-${sanitizedUsername}-${dateTimeStr}`;

  // Check for collisions if existingIds provided
  if (existingIds && existingIds.has(baseId)) {
    // Append short suffix to ensure uniqueness
    const suffix = generateRandomAlphanumeric(4);
    return `${baseId}-${suffix}`;
  }

  return baseId;
}

