/**
 * User ID Validation Utilities
 * 
 * Centralized validation utilities to prevent runtime errors from missing or invalid user IDs.
 * All functions include proper type guards and descriptive error messages.
 */

/**
 * Custom error class for user ID validation failures
 */
export class UserIdValidationError extends Error {
  constructor(
    message: string,
    public readonly context?: {
      functionName?: string;
      userId?: unknown;
      additionalInfo?: Record<string, unknown>;
    }
  ) {
    super(message);
    this.name = 'UserIdValidationError';
    
    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UserIdValidationError);
    }
  }
}

/**
 * Type predicate to check if a value is a valid non-empty string
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Validates that userId is a non-empty string
 * Throws UserIdValidationError if validation fails
 * 
 * @param userId - The user ID to validate
 * @param context - Optional context information for error messages
 * @throws {UserIdValidationError} If userId is invalid
 */
export function validateUserId(
  userId: unknown,
  context?: { functionName?: string; additionalInfo?: Record<string, unknown> }
): asserts userId is string {
  if (!isNonEmptyString(userId)) {
    const functionName = context?.functionName || 'validateUserId';
    const errorMessage = userId === null || userId === undefined
      ? `User ID is required but was ${userId === null ? 'null' : 'undefined'}. Please authenticate first.`
      : typeof userId === 'string'
      ? 'User ID cannot be empty. Please provide a valid user ID.'
      : `User ID must be a string, but got ${typeof userId}.`;

    throw new UserIdValidationError(errorMessage, {
      functionName,
      userId,
      additionalInfo: context?.additionalInfo,
    });
  }
}

/**
 * Requires a user ID, throwing a descriptive error if missing or invalid
 * 
 * @param userId - The user ID to validate (can be string, null, or undefined)
 * @param context - Optional context information for error messages
 * @returns The validated user ID as a string
 * @throws {UserIdValidationError} If userId is missing or invalid
 */
export function requireUserId(
  userId: string | null | undefined,
  context?: { functionName?: string; additionalInfo?: Record<string, unknown> }
): string {
  validateUserId(userId, context);
  return userId;
}

/**
 * Type predicate to safely check if a value is a valid user ID
 * Returns true only if userId is a non-empty string
 * 
 * @param userId - The value to check
 * @returns True if userId is a valid non-empty string
 */
export function isValidUserId(userId: unknown): userId is string {
  return isNonEmptyString(userId);
}

/**
 * Sanitizes a user ID for use in URLs
 * Removes or replaces characters that could cause issues in URL paths or query parameters
 * 
 * @param userId - The user ID to sanitize
 * @returns The sanitized user ID
 * @throws {UserIdValidationError} If userId is invalid after sanitization
 */
export function sanitizeUserId(userId: string): string {
  validateUserId(userId, { functionName: 'sanitizeUserId' });
  
  // Remove or replace characters that could be problematic in URLs
  // Allow: alphanumeric, hyphens, underscores, dots, @ (for email-based IDs)
  // Replace other characters with underscores
  const sanitized = userId
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      // Allow: 0-9, A-Z, a-z, -, _, ., @
      if (
        (code >= 48 && code <= 57) || // 0-9
        (code >= 65 && code <= 90) || // A-Z
        (code >= 97 && code <= 122) || // a-z
        char === '-' ||
        char === '_' ||
        char === '.' ||
        char === '@'
      ) {
        return char;
      }
      return '_';
    })
    .join('');
  
  // Validate that sanitized result is still valid
  if (!isNonEmptyString(sanitized)) {
    throw new UserIdValidationError(
      'User ID became invalid after sanitization',
      { functionName: 'sanitizeUserId', userId }
    );
  }
  
  return sanitized;
}

/**
 * Validates user ID format (optional - for Auth0 sub format validation)
 * Auth0 sub format: typically "auth0|..." or "google-oauth2|..." or email
 * 
 * @param userId - The user ID to validate format
 * @returns True if format appears valid (non-strict check)
 */
export function isValidUserIdFormat(userId: string): boolean {
  if (!isNonEmptyString(userId)) {
    return false;
  }
  
  // Basic format validation - Auth0 sub can be:
  // - "auth0|..." (database connection)
  // - "google-oauth2|..." (social connection)
  // - Email address
  // - Other OAuth provider formats
  
  // Allow most string formats, just ensure it's not obviously malformed
  // This is a lenient check - we mainly care that it's not empty
  return userId.length > 0 && userId.length < 256; // Reasonable max length
}

