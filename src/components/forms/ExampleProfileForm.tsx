/**
 * Example Profile Form Component
 *
 * This is a reference implementation showing how to use Zod validation
 * with React Hook Form for type-safe form handling.
 *
 * Key features:
 * - Type-safe form data with Zod schema inference
 * - Automatic validation on blur and submit
 * - Error messages from Zod schemas
 * - Proper TypeScript integration
 *
 * @example
 * import { ExampleProfileForm } from '@/components/forms/ExampleProfileForm';
 *
 * <ExampleProfileForm onSubmit={handleSubmit} />
 */

import { useZodForm } from '@/hooks/useZodForm';
import { profileSettingsFormSchema, ProfileSettingsFormData } from '@/utils/validationSchemas';
import { Button } from '@/components/common/Button';
import { cn } from '@/utils/cn';

interface ExampleProfileFormProps {
  defaultValues?: Partial<ProfileSettingsFormData>;
  onSubmit: (data: ProfileSettingsFormData) => void | Promise<void>;
  isLoading?: boolean;
}

export function ExampleProfileForm({
  defaultValues,
  onSubmit,
  isLoading = false,
}: ExampleProfileFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useZodForm({
    schema: profileSettingsFormSchema,
    defaultValues: {
      name: '',
      ...defaultValues,
    },
    mode: 'onBlur', // Validate on blur
  });

  const handleFormSubmit = async (data: ProfileSettingsFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Name field */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Name *
        </label>
        <input
          {...register('name')}
          type="text"
          id="name"
          className={cn(
            'w-full px-3 py-2 border rounded-lg',
            'bg-white dark:bg-surface-dark',
            'text-gray-900 dark:text-white',
            'border-gray-300 dark:border-border-dark',
            'focus:ring-2 focus:ring-primary focus:border-primary',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            errors.name && 'border-red-500 focus:ring-red-500'
          )}
          placeholder="Enter your name"
          disabled={isSubmitting || isLoading}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      {/* Age field */}
      <div>
        <label
          htmlFor="age"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Age
        </label>
        <input
          {...register('age', { valueAsNumber: true })}
          type="number"
          id="age"
          className={cn(
            'w-full px-3 py-2 border rounded-lg',
            'bg-white dark:bg-surface-dark',
            'text-gray-900 dark:text-white',
            'border-gray-300 dark:border-border-dark',
            'focus:ring-2 focus:ring-primary focus:border-primary',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            errors.age && 'border-red-500 focus:ring-red-500'
          )}
          placeholder="Enter your age"
          disabled={isSubmitting || isLoading}
        />
        {errors.age && (
          <p className="mt-1 text-sm text-red-500">{errors.age.message}</p>
        )}
      </div>

      {/* Gender field */}
      <div>
        <label
          htmlFor="gender"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Gender
        </label>
        <select
          {...register('gender')}
          id="gender"
          className={cn(
            'w-full px-3 py-2 border rounded-lg',
            'bg-white dark:bg-surface-dark',
            'text-gray-900 dark:text-white',
            'border-gray-300 dark:border-border-dark',
            'focus:ring-2 focus:ring-primary focus:border-primary',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            errors.gender && 'border-red-500 focus:ring-red-500'
          )}
          disabled={isSubmitting || isLoading}
        >
          <option value="">Select gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
        {errors.gender && (
          <p className="mt-1 text-sm text-red-500">{errors.gender.message}</p>
        )}
      </div>

      {/* Height field */}
      <div>
        <label
          htmlFor="height"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Height (cm)
        </label>
        <input
          {...register('height', { valueAsNumber: true })}
          type="number"
          id="height"
          step="0.1"
          className={cn(
            'w-full px-3 py-2 border rounded-lg',
            'bg-white dark:bg-surface-dark',
            'text-gray-900 dark:text-white',
            'border-gray-300 dark:border-border-dark',
            'focus:ring-2 focus:ring-primary focus:border-primary',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            errors.height && 'border-red-500 focus:ring-red-500'
          )}
          placeholder="Enter your height"
          disabled={isSubmitting || isLoading}
        />
        {errors.height && (
          <p className="mt-1 text-sm text-red-500">{errors.height.message}</p>
        )}
      </div>

      {/* Weight field */}
      <div>
        <label
          htmlFor="weight"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Weight ({watch('preferredUnit') || 'kg'})
        </label>
        <input
          {...register('weight', { valueAsNumber: true })}
          type="number"
          id="weight"
          step="0.1"
          className={cn(
            'w-full px-3 py-2 border rounded-lg',
            'bg-white dark:bg-surface-dark',
            'text-gray-900 dark:text-white',
            'border-gray-300 dark:border-border-dark',
            'focus:ring-2 focus:ring-primary focus:border-primary',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            errors.weight && 'border-red-500 focus:ring-red-500'
          )}
          placeholder="Enter your weight"
          disabled={isSubmitting || isLoading}
        />
        {errors.weight && (
          <p className="mt-1 text-sm text-red-500">{errors.weight.message}</p>
        )}
      </div>

      {/* Experience level field */}
      <div>
        <label
          htmlFor="experienceLevel"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Experience Level
        </label>
        <select
          {...register('experienceLevel')}
          id="experienceLevel"
          className={cn(
            'w-full px-3 py-2 border rounded-lg',
            'bg-white dark:bg-surface-dark',
            'text-gray-900 dark:text-white',
            'border-gray-300 dark:border-border-dark',
            'focus:ring-2 focus:ring-primary focus:border-primary',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            errors.experienceLevel && 'border-red-500 focus:ring-red-500'
          )}
          disabled={isSubmitting || isLoading}
        >
          <option value="">Select experience level</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        {errors.experienceLevel && (
          <p className="mt-1 text-sm text-red-500">{errors.experienceLevel.message}</p>
        )}
      </div>

      {/* Submit button */}
      <div className="pt-4">
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting || isLoading}
          disabled={isSubmitting || isLoading}
          className="w-full"
        >
          {isSubmitting || isLoading ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </form>
  );
}
