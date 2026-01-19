import { useForm, UseFormProps, UseFormReturn, FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

/**
 * Custom hook that wraps react-hook-form with Zod validation
 * Provides type-safe form handling with automatic validation
 *
 * @example
 * const form = useZodForm({
 *   schema: loginFormSchema,
 *   defaultValues: { email: '', password: '' }
 * });
 */
export function useZodForm<TSchema extends z.ZodType<FieldValues, z.ZodTypeDef, FieldValues>>(
  options: Omit<UseFormProps<z.infer<TSchema>>, 'resolver'> & {
    schema: TSchema;
  }
): UseFormReturn<z.infer<TSchema>> {
  const { schema, ...formOptions } = options;

  return useForm<z.infer<TSchema>>({
    ...formOptions,
    resolver: zodResolver(schema),
  });
}

/**
 * Alternative hook name for better semantics
 */
export const useValidatedForm = useZodForm;
