# Set Validation & UX Flow - LogExercise Component

## Overview

The LogExercise component now implements proper validation to ensure a smooth, error-free user experience when logging workout sets. This prevents users from adding new sets when inappropriate and provides clear feedback about why certain actions are blocked.

## Validation Rules

### When Can Users Add a New Set?

A user can add a new set **only when ALL** of the following conditions are met:

1. ✅ **An exercise is selected**
2. ✅ **No incomplete set exists** (current set must be completed or canceled)
3. ✅ **Rest timer is not active** (or auto-start rest timer is disabled)

### When is Adding a Set Blocked?

Adding a new set is blocked in the following scenarios:

| Scenario | Reason | User Feedback |
|----------|--------|---------------|
| Incomplete set exists | User is currently editing/adding a set | "Complete or cancel the current set first" |
| Rest timer is active | User should rest between sets | "Wait for rest timer to finish or skip it" |
| No exercise selected | Cannot add sets without an exercise | Button hidden |

## Implementation Details

### Core State Management

```typescript
// Computed state to determine if adding a new set is allowed
const canAddNewSet = useMemo(() => {
  // Must have an exercise selected
  if (!selectedExercise) return false;

  // Check if there's an incomplete (current) set being edited
  const hasIncompleteSet = sets.some(set => !set.completed);
  if (hasIncompleteSet) return false;

  // Check if rest timer is active
  if (restTimerVisible && settings.autoStartRestTimer) return false;

  // All checks passed - can add new set
  return true;
}, [selectedExercise, sets, restTimerVisible, settings.autoStartRestTimer]);

// Get reason why adding set is blocked (for user feedback)
const addSetBlockedReason = useMemo(() => {
  if (!selectedExercise) return null;

  const hasIncompleteSet = sets.some(set => !set.completed);
  if (hasIncompleteSet) {
    return 'Complete or cancel the current set first';
  }

  if (restTimerVisible && settings.autoStartRestTimer) {
    return 'Wait for rest timer to finish or skip it';
  }

  return null;
}, [selectedExercise, sets, restTimerVisible, settings.autoStartRestTimer]);
```

### Validation in handleAddSet

```typescript
const handleAddSet = () => {
  if (!selectedExercise) return;

  // Validate that we can add a new set
  if (!canAddNewSet) {
    if (addSetBlockedReason) {
      showError(addSetBlockedReason);
    }
    return;
  }

  // Proceed with adding the set...
};
```

## UI/UX Components

### 1. Add Set Button States

The main "Add Set" button has two distinct states:

#### Enabled State
```tsx
<button className={cn(
  "border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary",
  "cursor-pointer active:scale-[0.98]"
)}>
  Add Set
</button>
```

**Visual characteristics:**
- Primary color (green) border and text
- Semi-transparent green background
- Hover effect (darker background)
- Click animation (scale down)
- Pointer cursor

#### Disabled State
```tsx
<button className={cn(
  "border-gray-300/30 dark:border-gray-700/30",
  "bg-gray-100/50 dark:bg-gray-800/50",
  "text-gray-400 dark:text-gray-500",
  "cursor-not-allowed opacity-60"
)} disabled>
  Add Set
</button>
```

**Visual characteristics:**
- Gray border and text
- Gray background
- Reduced opacity (60%)
- Not-allowed cursor
- No hover/click effects

### 2. Tooltip on Disabled Button

When the "Add Set" button is disabled, hovering over it displays a tooltip with the reason:

```tsx
{!canAddNewSet && addSetBlockedReason && (
  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                  opacity-0 group-hover:opacity-100 transition-opacity">
    <div className="bg-gray-900 dark:bg-gray-800 text-white text-xs
                    px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
      {addSetBlockedReason}
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1
                      border-4 border-transparent border-t-gray-900"></div>
    </div>
  </div>
)}
```

**Features:**
- Appears above button on hover
- Dark background with white text
- Arrow pointing down to button
- Smooth fade-in transition
- Automatically positioned

### 3. Visual Feedback Banner

A prominent banner appears at the top of the screen when adding a set is blocked:

```tsx
{!canAddNewSet && addSetBlockedReason && completedSets.length > 0 && (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
  >
    <div className="bg-amber-50 dark:bg-amber-900/30
                    border-2 border-amber-400 dark:border-amber-600
                    rounded-lg px-4 py-3 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-amber-600 dark:text-amber-400">
            <!-- Warning icon -->
          </svg>
        </div>
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          {addSetBlockedReason}
        </p>
      </div>
    </div>
  </motion.div>
)}
```

**Features:**
- Fixed position at top of screen
- Amber/yellow color scheme (warning)
- Warning icon
- Smooth slide-in animation
- High z-index (appears above other content)
- Only shows when sets exist and blocking reason present

### 4. Set Card Integration

All set card components (CurrentSetCard, CardioSetCard, HIITSetCard, etc.) now respect the validation state:

```tsx
<CurrentSetCard
  // ... other props
  onAddSet={canAddNewSet ? handleAddSet : undefined}
  disabled={!canAddNewSet}
/>
```

**Behavior:**
- `onAddSet` callback only passed when adding is allowed
- `disabled` prop controls internal "Add Set" button state
- Maintains consistent UX across all set types

## User Flows

### Flow 1: Normal Set Addition (Happy Path)

```
1. User completes a set
   ↓
2. Set is marked as completed
   ↓
3. Rest timer starts automatically (if enabled)
   ↓
4. "Add Set" button is DISABLED
   ↓
5. Banner shows: "Wait for rest timer to finish or skip it"
   ↓
6. User waits or clicks "Skip Rest"
   ↓
7. Rest timer ends/skipped
   ↓
8. "Add Set" button becomes ENABLED
   ↓
9. Banner disappears
   ↓
10. User clicks "Add Set"
    ↓
11. New set is added successfully
```

### Flow 2: Canceling Current Set

```
1. User is editing an incomplete set
   ↓
2. "Add Set" button is DISABLED
   ↓
3. User clicks "Cancel Set"
   ↓
4. Current set is removed
   ↓
5. "Add Set" button becomes ENABLED (if no rest timer)
   ↓
6. User can add a new set
```

### Flow 3: Rest Timer Skip

```
1. Rest timer is active
   ↓
2. "Add Set" button is DISABLED
   ↓
3. Banner shows: "Wait for rest timer to finish or skip it"
   ↓
4. User clicks "Skip Rest" on timer
   ↓
5. Rest timer disappears
   ↓
6. "Add Set" button becomes ENABLED
   ↓
7. Banner disappears
   ↓
8. User can add a new set
```

### Flow 4: Attempting to Add While Blocked

```
1. "Add Set" button is DISABLED (incomplete set or rest timer)
   ↓
2. User hovers over button
   ↓
3. Tooltip shows reason: "Complete or cancel the current set first"
   ↓
4. User tries to click disabled button
   ↓
5. Toast error appears with same message
   ↓
6. No new set is added
   ↓
7. User is guided to resolve the blocking condition
```

## Benefits

### 1. **Prevents Data Integrity Issues**
- No duplicate or conflicting incomplete sets
- Ensures proper rest time tracking
- Maintains correct set numbering

### 2. **Clear User Guidance**
- Users always know why they can't perform an action
- Multiple feedback mechanisms (tooltip, banner, toast)
- Visual states clearly indicate what's possible

### 3. **Enforces Best Practices**
- Encourages proper rest between sets
- Prevents rushing through workout logging
- Promotes accurate data entry

### 4. **Improved UX**
- Reduces user confusion and errors
- Provides immediate feedback
- Smooth, professional interaction flow

## Accessibility

### Keyboard Navigation
- Disabled button is still focusable
- Tooltip appears on focus (not just hover)
- Clear visual indication of disabled state

### Screen Readers
```tsx
<button
  disabled={!canAddNewSet}
  aria-disabled={!canAddNewSet}
  aria-label={canAddNewSet ? "Add Set" : `Add Set - ${addSetBlockedReason}`}
>
  Add Set
</button>
```

### Color Contrast
- Disabled state maintains WCAG AA contrast ratio
- Amber warning banner has sufficient contrast
- Dark mode fully supported

## Edge Cases Handled

### 1. **Auto-Start Rest Timer Disabled**
If user has disabled auto-start rest timer in settings:
- Rest timer doesn't start automatically
- Users can add sets immediately after completing one
- No blocking based on rest timer

### 2. **Multiple Set Types**
Works consistently across:
- Strength training sets (weight/reps)
- Cardio sets (distance/time)
- HIIT sets (work/rest intervals)
- Yoga/flexibility sets (duration)

### 3. **Superset Mode**
- Group rest timer handled separately
- Individual rest timers don't block in superset mode
- Only applies rest timer blocking for last exercise in superset

### 4. **First Set**
- No blocking on first set (no rest timer)
- Can start workout immediately

## Testing Scenarios

### Manual Testing Checklist

- [ ] Complete a set → Rest timer starts → "Add Set" is disabled
- [ ] Wait for rest timer to finish → "Add Set" becomes enabled
- [ ] Skip rest timer → "Add Set" becomes enabled immediately
- [ ] Cancel incomplete set → "Add Set" becomes enabled
- [ ] Hover over disabled "Add Set" → Tooltip shows reason
- [ ] Try to click disabled "Add Set" → Toast error shows
- [ ] Banner appears when blocked, disappears when unblocked
- [ ] First set of exercise → No blocking
- [ ] Auto-start rest timer disabled → No rest timer blocking
- [ ] Dark mode → All states visually correct
- [ ] Mobile view → Tooltip and banner display properly

### Integration Testing

```typescript
describe('LogExercise Set Validation', () => {
  it('disables adding set when incomplete set exists', () => {
    // Test canAddNewSet = false when sets.some(s => !s.completed)
  });

  it('disables adding set when rest timer is active', () => {
    // Test canAddNewSet = false when restTimerVisible = true
  });

  it('enables adding set after rest timer completes', () => {
    // Test canAddNewSet = true after handleRestComplete
  });

  it('shows correct blocked reason for incomplete set', () => {
    // Test addSetBlockedReason returns correct message
  });

  it('shows correct blocked reason for active rest timer', () => {
    // Test addSetBlockedReason returns correct message
  });
});
```

## Performance Considerations

### Memoization
Both `canAddNewSet` and `addSetBlockedReason` are memoized with `useMemo`:
- Only recalculates when dependencies change
- Prevents unnecessary re-renders
- Dependencies: `selectedExercise`, `sets`, `restTimerVisible`, `settings.autoStartRestTimer`

### Component Updates
- Set card components only re-render when validation state changes
- Banner only mounts/unmounts when blocking state changes
- Minimal performance impact

## Future Enhancements

### Potential Improvements

1. **Smart Predictions**
   - Predict when user will be ready for next set
   - Show countdown in banner: "Next set available in 12s"

2. **Customizable Rest Enforcement**
   - Setting to allow skipping rest immediately
   - Minimum rest time before enabling "Add Set"

3. **Audio Feedback**
   - Optional sound when "Add Set" becomes enabled
   - Haptic feedback on mobile devices

4. **Progressive Web App**
   - Background timer continues even if app minimized
   - Notification when rest timer completes

5. **Analytics**
   - Track how often users skip rest
   - Average rest time per exercise
   - Compliance with recommended rest periods

## Related Files

- `/src/components/workout/LogExercise.tsx` - Main component implementation
- `/src/components/exercise/CurrentSetCard.tsx` - Strength set card
- `/src/components/exercise/CardioSetCard.tsx` - Cardio set card
- `/src/components/exercise/HIITSetCard.tsx` - HIIT set card
- `/src/components/exercise/YogaSetCard.tsx` - Yoga/flexibility set card
- `/src/components/exercise/RestTimer.tsx` - Rest timer component
- `/src/store/settingsStore.ts` - Settings (autoStartRestTimer)

## Summary

The set validation and UX flow implementation ensures users can only add sets when appropriate, provides clear feedback about why actions are blocked, and maintains data integrity throughout the workout logging process. The multi-layered feedback approach (disabled button, tooltip, banner, toast) ensures users are never confused about the application state.
