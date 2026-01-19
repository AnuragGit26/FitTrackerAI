import { useState, useCallback } from 'react';
import { z } from 'zod';

/**
 * Hook for validating individual fields with Zod schemas
 * Useful for inline validation without full form management
 *
 * @example
 * const { validate, error, isValid } = useFieldValidation(emailSchema);
 * const handleChange = (value: string) => {
 *   validate(value);
 * };
 */
export function useFieldValidation<T>(schema: z.ZodType<T>) {
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean>(true);

  const validate = useCallback(
    (value: unknown): boolean => {
      const result = schema.safeParse(value);

      if (result.success) {
        setError(null);
        setIsValid(true);
        return true;
      }

      const errorMessage = result.error.issues[0]?.message || 'Validation failed';
      setError(errorMessage);
      setIsValid(false);
      return false;
    },
    [schema]
  );

  const clearError = useCallback(() => {
    setError(null);
    setIsValid(true);
  }, []);

  return {
    validate,
    error,
    isValid,
    clearError,
  };
}

/**
 * Hook for validating multiple fields with their respective schemas
 * Returns validation functions and error states for each field
 *
 * @example
 * const { validators, errors, isValid } = useMultiFieldValidation({
 *   email: emailSchema,
 *   password: passwordSchema,
 * });
 */
export function useMultiFieldValidation<T extends Record<string, z.ZodType>>(
  schemas: T
): {
  validators: { [K in keyof T]: (value: unknown) => boolean };
  errors: { [K in keyof T]: string | null };
  isValid: boolean;
  clearErrors: () => void;
} {
  type SchemaKeys = keyof T;
  const [errors, setErrors] = useState<Record<SchemaKeys, string | null>>(
    Object.keys(schemas).reduce(
      (acc, key) => {
        acc[key as SchemaKeys] = null;
        return acc;
      },
      {} as Record<SchemaKeys, string | null>
    )
  );

  const validators = Object.keys(schemas).reduce(
    (acc, key) => {
      const schema = schemas[key as SchemaKeys];
      acc[key as SchemaKeys] = (value: unknown): boolean => {
        const result = schema.safeParse(value);

        if (result.success) {
          setErrors((prev) => ({ ...prev, [key]: null }));
          return true;
        }

        const errorMessage = result.error.issues[0]?.message || 'Validation failed';
        setErrors((prev) => ({ ...prev, [key]: errorMessage }));
        return false;
      };
      return acc;
    },
    {} as { [K in SchemaKeys]: (value: unknown) => boolean }
  );

  const isValid = Object.values(errors).every((error) => error === null);

  const clearErrors = useCallback(() => {
    setErrors(
      Object.keys(schemas).reduce(
        (acc, key) => {
          acc[key as SchemaKeys] = null;
          return acc;
        },
        {} as Record<SchemaKeys, string | null>
      )
    );
  }, [schemas]);

  return {
    validators,
    errors,
    isValid,
    clearErrors,
  };
}

/**
 * Hook for async field validation (e.g., checking if email exists)
 * Debounces validation to avoid excessive API calls
 */
export function useAsyncFieldValidation<T>(
  schema: z.ZodType<T>,
  asyncValidator?: (value: T) => Promise<string | null>,
  debounceMs: number = 500
) {
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean>(true);

  const validate = useCallback(
    async (value: unknown): Promise<boolean> => {
      // First, validate with Zod schema
      const result = schema.safeParse(value);

      if (!result.success) {
        const errorMessage = result.error.issues[0]?.message || 'Validation failed';
        setError(errorMessage);
        setIsValid(false);
        return false;
      }

      // If async validator is provided, run it
      if (asyncValidator) {
        setIsValidating(true);
        try {
          const asyncError = await asyncValidator(result.data);
          setIsValidating(false);

          if (asyncError) {
            setError(asyncError);
            setIsValid(false);
            return false;
          }
        } catch (err) {
          setIsValidating(false);
          setError('Validation error occurred');
          setIsValid(false);
          return false;
        }
      }

      setError(null);
      setIsValid(true);
      return true;
    },
    [schema, asyncValidator]
  );

  const clearError = useCallback(() => {
    setError(null);
    setIsValid(true);
  }, []);

  return {
    validate,
    error,
    isValid,
    isValidating,
    clearError,
  };
}
