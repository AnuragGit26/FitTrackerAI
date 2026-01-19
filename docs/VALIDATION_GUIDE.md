# Validation Guide - Zod Integration

This guide explains how to use Zod for type-safe UI input validation in FitTrackAI.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Available Schemas](#available-schemas)
4. [Using Validation Hooks](#using-validation-hooks)
5. [Form Validation with React Hook Form](#form-validation-with-react-hook-form)
6. [Inline Field Validation](#inline-field-validation)
7. [Custom Validation](#custom-validation)
8. [Migration Guide](#migration-guide)
9. [Best Practices](#best-practices)

## Overview

FitTrackAI uses **Zod** for schema validation, providing:

- **Type Safety**: Automatic TypeScript type inference from schemas
- **Consistency**: Centralized validation logic across the app
- **Better UX**: Clear, descriptive error messages
- **Reusability**: Schemas can be composed and reused
- **Runtime Safety**: Validation at runtime prevents invalid data

## Quick Start

### 1. Import the schema you need

```typescript
import { nameSchema, repsSchema, profileSettingsFormSchema } from '@/utils/validationSchemas';
```

### 2. Use with React Hook Form

```typescript
import { useZodForm } from '@/hooks/useZodForm';
import { profileSettingsFormSchema } from '@/utils/validationSchemas';

function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useZodForm({
    schema: profileSettingsFormSchema,
    defaultValues: { name: '' },
  });

  const onSubmit = (data) => {
    // data is fully typed and validated!
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}
      <button type="submit">Submit</button>
    </form>
  );
}
```

### 3. Inline field validation

```typescript
import { useFieldValidation } from '@/hooks/useFieldValidation';
import { emailSchema } from '@/utils/validationSchemas';

function EmailInput() {
  const { validate, error, isValid } = useFieldValidation(emailSchema);

  const handleChange = (e) => {
    validate(e.target.value);
  };

  return (
    <div>
      <input onChange={handleChange} />
      {error && <span className="error">{error}</span>}
    </div>
  );
}
```

## Available Schemas

### Common Validation Schemas

#### Numbers

```typescript
import {
  weightKgSchema,        // 0-1000 kg
  weightLbsSchema,       // 0-2200 lbs
  repsSchema,            // 1-500 reps
  distanceKmSchema,      // 0-1000 km
  distanceMilesSchema,   // 0-621 miles
  durationSecondsSchema, // 0-86400 seconds (24 hours)
  caloriesSchema,        // 0-10000 (optional)
  stepsSchema,           // 0-100000 (optional)
  rpeSchema,             // 1-10 (optional)
  heartRateSchema,       // 30-220 BPM (optional)
  restTimeSchema,        // 0-3600 seconds (optional)
} from '@/utils/validationSchemas';

// Usage
const result = repsSchema.safeParse(15);
if (result.success) {
  console.log('Valid reps:', result.data);
} else {
  console.error('Error:', result.error.errors[0].message);
}
```

#### Text Fields

```typescript
import {
  nameSchema,            // 1-100 characters (required)
  notesSchema,           // 0-1000 characters (optional)
  emailSchema,           // Valid email format
  passwordSchema,        // 8-128 characters
} from '@/utils/validationSchemas';

// Usage
const result = nameSchema.safeParse('My Workout');
if (result.success) {
  console.log('Valid name:', result.data);
}
```

#### Profile Schemas

```typescript
import {
  ageSchema,               // 13-120
  heightCmSchema,          // 50-300 cm
  heightInchesSchema,      // 20-120 inches
  bodyWeightKgSchema,      // 20-500 kg
  bodyWeightLbsSchema,     // 44-1100 lbs
  genderSchema,            // 'male' | 'female' | 'other'
  goalSchema,              // 'lose_weight' | 'gain_muscle' | etc.
  experienceLevelSchema,   // 'beginner' | 'intermediate' | 'advanced'
} from '@/utils/validationSchemas';
```

### Workout Set Schemas

```typescript
import {
  weightRepsSetSchema,   // For weight & reps tracking
  repsOnlySetSchema,     // For bodyweight exercises
  cardioSetSchema,       // For cardio activities
  durationSetSchema,     // For timed exercises
  workoutSetSchema,      // Generic (union of all)
} from '@/utils/validationSchemas';

// Dynamic validation based on tracking type
import { createCompletedSetSchema } from '@/utils/validationSchemas';

const schema = createCompletedSetSchema('weight_reps', 'kg');
const result = schema.safeParse({
  setNumber: 1,
  completed: true,
  weight: 80,
  reps: 10,
  unit: 'kg',
});
```

### Exercise & Workout Schemas

```typescript
import {
  exerciseSchema,          // Full exercise definition
  workoutExerciseSchema,   // Exercise within a workout
  workoutSchema,           // Complete workout
  workoutTemplateSchema,   // Workout template
} from '@/utils/validationSchemas';
```

### Form Schemas (Composed)

Pre-built schemas for common forms:

```typescript
import {
  loginFormSchema,            // { email, password }
  signUpFormSchema,           // { name, email, password, confirmPassword }
  profileSettingsFormSchema,  // { name, age, gender, height, weight, ... }
  exerciseFormSchema,         // Exercise creation/editing
  templateFormSchema,         // Template creation/editing
} from '@/utils/validationSchemas';
```

### Type Exports

Get TypeScript types automatically from schemas:

```typescript
import type {
  LoginFormData,
  SignUpFormData,
  ProfileSettingsFormData,
  ExerciseFormData,
  TemplateFormData,
  WorkoutSetData,
  WorkoutExerciseData,
  WorkoutData,
} from '@/utils/validationSchemas';

// Type is inferred from the schema
type ProfileData = ProfileSettingsFormData;
// Equivalent to:
// {
//   name: string;
//   age?: number;
//   gender?: 'male' | 'female' | 'other';
//   ...
// }
```

## Using Validation Hooks

### useZodForm - Type-safe forms with React Hook Form

Best for: Complex forms with multiple fields

```typescript
import { useZodForm } from '@/hooks/useZodForm';
import { profileSettingsFormSchema } from '@/utils/validationSchemas';

function ProfileForm() {
  const form = useZodForm({
    schema: profileSettingsFormSchema,
    defaultValues: {
      name: '',
      age: undefined,
      gender: undefined,
    },
    mode: 'onBlur', // or 'onChange', 'onSubmit'
  });

  const onSubmit = form.handleSubmit(async (data) => {
    // data is typed as ProfileSettingsFormData
    await updateProfile(data);
  });

  return (
    <form onSubmit={onSubmit}>
      <input {...form.register('name')} />
      {form.formState.errors.name && (
        <span>{form.formState.errors.name.message}</span>
      )}
      {/* ... more fields */}
      <button type="submit">Save</button>
    </form>
  );
}
```

### useFieldValidation - Single field validation

Best for: Individual input validation without full form

```typescript
import { useFieldValidation } from '@/hooks/useFieldValidation';
import { weightKgSchema } from '@/utils/validationSchemas';

function WeightInput() {
  const { validate, error, isValid, clearError } = useFieldValidation(weightKgSchema);

  const handleChange = (e) => {
    const value = parseFloat(e.target.value);
    validate(value);
  };

  return (
    <div>
      <input
        type="number"
        onChange={handleChange}
        className={isValid ? '' : 'border-red-500'}
      />
      {error && <span className="text-red-500">{error}</span>}
    </div>
  );
}
```

### useMultiFieldValidation - Multiple independent fields

Best for: Validating several fields independently without React Hook Form

```typescript
import { useMultiFieldValidation } from '@/hooks/useFieldValidation';
import { nameSchema, emailSchema, ageSchema } from '@/utils/validationSchemas';

function CustomForm() {
  const { validators, errors, isValid } = useMultiFieldValidation({
    name: nameSchema,
    email: emailSchema,
    age: ageSchema,
  });

  return (
    <div>
      <input
        onChange={(e) => validators.name(e.target.value)}
        placeholder="Name"
      />
      {errors.name && <span>{errors.name}</span>}

      <input
        onChange={(e) => validators.email(e.target.value)}
        placeholder="Email"
      />
      {errors.email && <span>{errors.email}</span>}

      <button disabled={!isValid}>Submit</button>
    </div>
  );
}
```

### useAsyncFieldValidation - Async validation (e.g., checking if email exists)

```typescript
import { useAsyncFieldValidation } from '@/hooks/useFieldValidation';
import { emailSchema } from '@/utils/validationSchemas';

function EmailInput() {
  const { validate, error, isValid, isValidating } = useAsyncFieldValidation(
    emailSchema,
    async (email) => {
      // Check if email already exists
      const exists = await checkEmailExists(email);
      return exists ? 'Email already in use' : null;
    },
    500 // debounce 500ms
  );

  return (
    <div>
      <input onChange={(e) => validate(e.target.value)} />
      {isValidating && <span>Checking...</span>}
      {error && <span>{error}</span>}
    </div>
  );
}
```

## Form Validation with React Hook Form

### Complete Example: Profile Settings Form

See `src/components/forms/ExampleProfileForm.tsx` for a full reference implementation.

```typescript
import { useZodForm } from '@/hooks/useZodForm';
import { profileSettingsFormSchema, ProfileSettingsFormData } from '@/utils/validationSchemas';

export function ProfileSettingsForm({ onSubmit }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useZodForm({
    schema: profileSettingsFormSchema,
    defaultValues: {
      name: '',
      age: undefined,
    },
    mode: 'onBlur',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>Name *</label>
        <input {...register('name')} />
        {errors.name && <span>{errors.name.message}</span>}
      </div>

      <div>
        <label>Age</label>
        <input
          type="number"
          {...register('age', { valueAsNumber: true })}
        />
        {errors.age && <span>{errors.age.message}</span>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        Save
      </button>
    </form>
  );
}
```

### Key Points

1. **Use `valueAsNumber`** for number inputs: `{...register('age', { valueAsNumber: true })}`
2. **Validation mode**: Choose from `'onBlur'`, `'onChange'`, `'onSubmit'`, `'onTouched'`, or `'all'`
3. **Error messages**: Automatically provided by Zod schemas
4. **Type safety**: `data` parameter in `onSubmit` is fully typed

## Inline Field Validation

### Example: Validating reps as user types

```typescript
import { useFieldValidation } from '@/hooks/useFieldValidation';
import { repsSchema } from '@/utils/validationSchemas';

function RepsInput({ value, onChange }) {
  const { validate, error } = useFieldValidation(repsSchema);

  const handleChange = (e) => {
    const newValue = parseInt(e.target.value);
    onChange(newValue);
    validate(newValue);
  };

  return (
    <div>
      <input type="number" value={value} onChange={handleChange} />
      {error && (
        <div className="text-red-500 text-sm mt-1">{error}</div>
      )}
    </div>
  );
}
```

## Custom Validation

### Creating a custom schema

```typescript
import { z } from 'zod';

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username cannot exceed 20 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
  .transform((val) => val.toLowerCase()); // Normalize to lowercase

// Use it
const result = usernameSchema.safeParse('MyUsername123');
if (result.success) {
  console.log(result.data); // 'myusername123'
}
```

### Composing schemas

```typescript
import { z } from 'zod';
import { nameSchema, emailSchema } from '@/utils/validationSchemas';

const userProfileSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  bio: z.string().max(500).optional(),
});

// Extend an existing schema
const extendedProfileSchema = userProfileSchema.extend({
  website: z.string().url().optional(),
  twitter: z.string().startsWith('@').optional(),
});
```

### Refining schemas with custom logic

```typescript
import { z } from 'zod';

const passwordConfirmSchema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'], // Error will be on confirmPassword field
  });
```

### Dynamic schemas

```typescript
import { createWeightSchema, createDistanceSchema } from '@/utils/validationSchemas';

function getSetSchema(unit: 'kg' | 'lbs') {
  return z.object({
    weight: createWeightSchema(unit),
    reps: repsSchema,
  });
}

// Use with current unit preference
const schema = getSetSchema(userPreferredUnit);
```

## Migration Guide

### From old validators.ts to Zod

**Old way:**

```typescript
import { validateWeight, validateReps } from '@/utils/validators';

const weightValidation = validateWeight(weight, 'kg');
if (!weightValidation.valid) {
  console.error(weightValidation.error);
}
```

**New way:**

```typescript
import { weightKgSchema } from '@/utils/validationSchemas';

const result = weightKgSchema.safeParse(weight);
if (!result.success) {
  console.error(result.error.errors[0].message);
}
```

**Even better - using helper:**

```typescript
import { validateField } from '@/utils/validationSchemas';

const { success, error } = validateField(weightKgSchema, weight);
if (!success) {
  console.error(error);
}
```

### Migrating a component

**Before:**

```typescript
function MyForm() {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!validateWorkoutName(name)) {
      setError('Name is required and must be under 100 characters');
      return;
    }
    // Submit...
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      {error && <span>{error}</span>}
      <button type="submit">Submit</button>
    </form>
  );
}
```

**After:**

```typescript
import { useZodForm } from '@/hooks/useZodForm';
import { nameSchema } from '@/utils/validationSchemas';
import { z } from 'zod';

const formSchema = z.object({ name: nameSchema });

function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useZodForm({
    schema: formSchema,
    defaultValues: { name: '' },
  });

  const onSubmit = (data) => {
    // data.name is validated and typed!
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}
      <button type="submit">Submit</button>
    </form>
  );
}
```

## Best Practices

### 1. Always use type-safe forms

```typescript
// ✅ Good - Type-safe
const form = useZodForm({
  schema: mySchema,
  defaultValues: { name: '' },
});

// ❌ Bad - Manual validation, no type safety
const [errors, setErrors] = useState({});
const validate = () => { /* manual checks */ };
```

### 2. Reuse schemas

```typescript
// ✅ Good - DRY principle
import { profileSettingsFormSchema } from '@/utils/validationSchemas';
const form = useZodForm({ schema: profileSettingsFormSchema });

// ❌ Bad - Duplicating validation logic
const schema = z.object({
  name: z.string().min(1).max(100), // Already defined in validationSchemas!
});
```

### 3. Validate on blur for better UX

```typescript
// ✅ Good - Validate after user leaves field
const form = useZodForm({
  schema: mySchema,
  mode: 'onBlur', // Only show errors after blur
});

// ⚠️ Okay but annoying - Validate on every keystroke
mode: 'onChange'
```

### 4. Provide clear error messages

```typescript
// ✅ Good - Descriptive error
z.number().min(1, 'Reps must be at least 1').max(500, 'Reps cannot exceed 500')

// ❌ Bad - Generic error
z.number().positive() // Error: "Number must be positive"
```

### 5. Use helper functions

```typescript
// ✅ Good - Simple API
import { validateField } from '@/utils/validationSchemas';
const { success, error } = validateField(repsSchema, value);

// ❌ Bad - Verbose
const result = repsSchema.safeParse(value);
if (!result.success) {
  const error = result.error.errors[0]?.message || 'Validation failed';
}
```

### 6. Leverage TypeScript inference

```typescript
// ✅ Good - Types inferred from schema
import type { ProfileSettingsFormData } from '@/utils/validationSchemas';

function updateProfile(data: ProfileSettingsFormData) {
  // data is fully typed!
}

// ❌ Bad - Manually defining types that match schema
interface ProfileData {
  name: string;
  age?: number;
  // ... (duplicates schema)
}
```

### 7. Handle async validation properly

```typescript
// ✅ Good - Debounced async validation
const { validate, isValidating } = useAsyncFieldValidation(
  emailSchema,
  checkEmailExists,
  500 // Wait 500ms before validating
);

// ❌ Bad - Immediate async validation (too many API calls)
const handleChange = async (value) => {
  await checkEmailExists(value); // Called on every keystroke!
};
```

## Troubleshooting

### "Number must be a number" error with form inputs

**Problem:** HTML inputs return strings, not numbers

**Solution:** Use `valueAsNumber` option

```typescript
// ✅ Correct
<input type="number" {...register('age', { valueAsNumber: true })} />

// ❌ Wrong - will get string value
<input type="number" {...register('age')} />
```

### Schema not validating optional fields correctly

**Problem:** Field is required when it should be optional

**Solution:** Add `.optional()` to schema

```typescript
// ✅ Optional field
const schema = z.object({
  notes: z.string().max(1000).optional(),
});

// ❌ Required field
const schema = z.object({
  notes: z.string().max(1000), // This is required!
});
```

### Type mismatch errors

**Problem:** TypeScript complains about type incompatibility

**Solution:** Ensure you're using the inferred type from schema

```typescript
import type { ProfileSettingsFormData } from '@/utils/validationSchemas';

// ✅ Correct - Uses inferred type
function handleSubmit(data: ProfileSettingsFormData) {}

// ❌ Wrong - Manual type that doesn't match
function handleSubmit(data: { name: string }) {}
```

## Resources

- [Zod Documentation](https://zod.dev/)
- [React Hook Form + Zod](https://react-hook-form.com/get-started#SchemaValidation)
- [FitTrackAI Validation Schemas](../src/utils/validationSchemas.ts)
- [Example Profile Form](../src/components/forms/ExampleProfileForm.tsx)
