/**
 * Input sanitization utilities to prevent XSS attacks
 */

/**
 * Sanitizes a string by removing potentially dangerous HTML/script tags
 * For React apps, we mainly need to sanitize before storing in DB
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return String(input || '').trim();
  }

  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Remove script tags and event handlers
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  
  // Remove potentially dangerous characters
  sanitized = sanitized.replace(/[<>]/g, '');
  
  // Normalize whitespace
  sanitized = sanitized.trim().replace(/\s+/g, ' ');
  
  return sanitized;
}

/**
 * Sanitizes an object by recursively sanitizing all string values
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = { ...obj };
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeString(sanitized[key]) as T[Extract<keyof T, string>];
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      if (Array.isArray(sanitized[key])) {
        sanitized[key] = sanitized[key].map((item: unknown) =>
          typeof item === 'string' ? sanitizeString(item) : item
        ) as T[Extract<keyof T, string>];
      } else {
        sanitized[key] = sanitizeObject(sanitized[key] as Record<string, unknown>) as T[Extract<keyof T, string>];
      }
    }
  }
  
  return sanitized;
}

/**
 * Validates and sanitizes exercise name
 */
export function sanitizeExerciseName(name: string): string {
  const sanitized = sanitizeString(name);
  
  // Additional validation for exercise names
  if (sanitized.length < 2) {
    throw new Error('Exercise name must be at least 2 characters');
  }
  
  if (sanitized.length > 100) {
    throw new Error('Exercise name must be less than 100 characters');
  }
  
  return sanitized;
}

/**
 * Validates and sanitizes workout notes
 */
export function sanitizeNotes(notes: string): string {
  const sanitized = sanitizeString(notes);
  
  if (sanitized.length > 1000) {
    throw new Error('Notes must be less than 1000 characters');
  }
  
  return sanitized;
}

