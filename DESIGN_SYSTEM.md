# FitTrackAI Design System

This document describes the design system and style guidelines for FitTrackAI.

## Overview

The FitTrackAI design system provides consistent, reusable design tokens and utilities for building UI components. All design constants are centralized in `/src/styles/designSystem.ts` and helper functions are available in `/src/utils/styleHelpers.ts`.

## Core Principles

1. **Consistency**: Use design tokens instead of hardcoded values
2. **Dark Mode First**: All colors support both light and dark modes
3. **Composability**: Build complex styles from simple, reusable parts
4. **Performance**: Tailwind merge prevents class conflicts
5. **Accessibility**: Built-in focus states and semantic colors

## Quick Start

```tsx
import { cn } from '@/utils/cn';
import { cardStyles } from '@/utils/styleHelpers';
import { spacing, typography, colors } from '@/styles/designSystem';

// Simple card with design system
<div className={cardStyles('default')}>
  <h3 className={typography.cardTitle}>My Card</h3>
  <p className={colors.textSecondary}>Card content</p>
</div>

// Custom composition
<div className={cn(
  cardStyles('feature'),
  spacing.comfortable,
  'hover:shadow-lg'
)}>
  ...
</div>
```

## Design Tokens

### Spacing

Use these instead of arbitrary padding/gap values:

```tsx
import { spacing } from '@/styles/designSystem';

// Padding
spacing.compact      // p-3  (dense UI, mobile cards)
spacing.base         // p-4  (default cards, modals)
spacing.comfortable  // p-5  (feature cards)
spacing.spacious     // p-6  (page sections)
spacing.generous     // p-8  (hero sections)

// Gaps
spacing.tight        // gap-2  (icon + text)
spacing.normal       // gap-3  (card elements)
spacing.relaxed      // gap-4  (section spacing)
spacing.loose        // gap-6  (page sections)
```

### Border Radius

```tsx
import { borderRadius } from '@/styles/designSystem';

borderRadius.card       // rounded-xl    (default cards)
borderRadius.cardLarge  // rounded-2xl   (feature cards)
borderRadius.button     // rounded-lg    (buttons, inputs)
borderRadius.pill       // rounded-full  (pills, badges)
borderRadius.input      // rounded-lg    (form inputs)
borderRadius.modal      // rounded-2xl   (modals, dialogs)
```

### Shadows

```tsx
import { shadows } from '@/styles/designSystem';

shadows.card          // shadow-sm    (default cards)
shadows.cardHover     // shadow-md    (hover states)
shadows.modal         // shadow-lg    (modals, dropdowns)
shadows.feature       // shadow-xl    (hero cards)
shadows.glow          // Primary color glow effect
shadows.glowHover     // Enhanced hover glow
```

### Typography

```tsx
import { typography } from '@/styles/designSystem';

// Headings
typography.h1          // text-3xl font-bold
typography.h2          // text-2xl font-bold
typography.h3          // text-xl font-bold
typography.h4          // text-lg font-semibold

// Body
typography.body        // text-base
typography.bodySmall   // text-sm
typography.bodyLarge   // text-lg

// Labels
typography.label       // text-sm text-gray-500 dark:text-gray-400
typography.labelBold   // text-sm font-medium text-gray-700 dark:text-gray-300

// Cards
typography.cardTitle   // text-lg font-bold text-gray-900 dark:text-white
typography.cardSubtitle // text-sm font-medium text-gray-600 dark:text-gray-400

// Stats
typography.statLarge   // text-4xl font-bold
typography.statMedium  // text-2xl font-bold
typography.statSmall   // text-xl font-semibold
```

### Colors

All colors automatically support dark mode:

```tsx
import { colors } from '@/styles/designSystem';

// Surfaces
colors.surfaceLight      // bg-white dark:bg-surface-dark
colors.surfaceLightAlt   // bg-gray-50 dark:bg-surface-dark-light
colors.backgroundBase    // bg-background-light dark:bg-background-dark

// Borders
colors.border            // border-gray-200 dark:border-border-dark
colors.borderSubtle      // border-gray-100 dark:border-gray-800
colors.borderStrong      // border-gray-300 dark:border-gray-700

// Text
colors.textPrimary       // text-gray-900 dark:text-white
colors.textSecondary     // text-gray-600 dark:text-gray-400
colors.textMuted         // text-gray-500 dark:text-gray-500
colors.textDisabled      // text-gray-400 dark:text-gray-600

// Status colors - multicolor palette (no greens)
colors.success           // text-blue-600 dark:text-blue-400
colors.error             // text-red-600 dark:text-red-400
colors.warning           // text-yellow-600 dark:text-yellow-400
colors.info              // text-purple-600 dark:text-purple-400

// Status backgrounds - multicolor palette
colors.successBg         // bg-blue-50 dark:bg-blue-900/20
colors.errorBg           // bg-red-50 dark:bg-red-900/20
colors.warningBg         // bg-yellow-50 dark:bg-yellow-900/20
colors.infoBg            // bg-blue-50 dark:bg-blue-900/20

// Primary (FitTrackAI Saffron/Orange)
colors.primary           // text-primary (#FF9933)
colors.primaryBg         // bg-primary
colors.primaryHover      // hover:bg-primary-dark
```

## Helper Functions

### cn() - Class Name Composition

Merge Tailwind classes with proper precedence:

```tsx
import { cn } from '@/utils/cn';

// Conditional classes
<div className={cn(
  'base-class',
  isActive && 'active-class',
  error ? 'error-class' : 'success-class'
)} />

// Conflict resolution (last value wins)
cn('px-2 py-1', 'px-4') // => 'py-1 px-4'
```

### cardStyles() - Card Variants

```tsx
import { cardStyles } from '@/utils/styleHelpers';

// Variants
cardStyles('default')     // Standard card
cardStyles('feature')     // Featured/hero card with extra shadow
cardStyles('compact')     // Tight padding for dense layouts
cardStyles('interactive') // Hover effects, cursor pointer

// With custom classes
cardStyles('default', 'min-h-[200px] w-full')
```

### Other Helpers

```tsx
import {
  buttonStyles,
  inputStyles,
  sectionStyles,
  getStatusColor,
  getStatusBg,
  focusRing,
  hoverEffect,
  flexLayouts,
  gridLayouts,
} from '@/utils/styleHelpers';

// Button styles (prefer using Button component)
<button className={buttonStyles('primary')}>Click me</button>

// Input styles
<input className={inputStyles('default')} />
<input className={inputStyles('error')} />

// Section styles
<section className={sectionStyles('hero')}>...</section>

// Status colors
<div className={getStatusColor('success')}>Success!</div>
<div className={getStatusBg('error')}>Error message</div>

// Focus rings for accessibility
<button className={cn('...', focusRing())}>Accessible</button>

// Hover effects
<div className={cn(cardStyles(), hoverEffect('lift'))}>...</div>

// Common layouts
<div className={flexLayouts.center}>Centered content</div>
<div className={gridLayouts.responsive3}>Responsive grid</div>
```

## Migration Guide

### Before (Hardcoded)

```tsx
<div className="p-4 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
    Title
  </h3>
  <p className="text-sm text-gray-600 dark:text-gray-400">
    Description
  </p>
</div>
```

### After (Design System)

```tsx
import { cn } from '@/utils/cn';
import { cardStyles } from '@/utils/styleHelpers';
import { typography, colors } from '@/styles/designSystem';

<div className={cardStyles('default')}>
  <h3 className={cn(typography.cardTitle, 'mb-2')}>
    Title
  </h3>
  <p className={cn(typography.bodySmall, colors.textSecondary)}>
    Description
  </p>
</div>
```

## Dark Mode Colors Reference

### Custom Tailwind Colors (tailwind.config.js)

These are FitTrackAI's custom colors defined in the Tailwind config using the Obsidian/Saffron palette:

```js
{
  primary: '#FF9933',              // Vibrant Saffron/Orange (brand color)
  'primary-dark': '#E67E22',      // Darker saffron for hover states
  'primary-content': '#0F0F0F',   // High contrast dark text for saffron elements
  'background-light': '#fdf8f5',  // Page background (light mode)
  'background-dark': '#050505',   // Deep obsidian-black (dark mode)
  'surface-light': '#ffffff',     // Card surface (light mode)
  'surface-dark': '#18181b',      // Charcoal-grey (Zinc 900) for cards (dark mode)
  'surface-dark-light': '#27272a', // Lighter charcoal (Zinc 800) for highlights (dark mode)
  'border-dark': '#27272a',      // Border color (dark mode)
  'recovery-rested': '#3b82f6',   // Blue
  'recovery-fatigued': '#FF6B6B', // Coral Red
  'recovery-recovering': '#FF9933', // Saffron
}
```

### Usage Rules

1. **Page backgrounds**: Use `background-light`/`background-dark`
2. **Card surfaces**: Use `surface-light`/`surface-dark`
3. **Hover states**: Use `surface-dark-light` for dark mode hovers
4. **Borders**: Use `border-dark` for dark mode borders
5. **Never use**: `dark:bg-gray-700/800/900` - these are inconsistent

## Best Practices

### ✅ DO

```tsx
// Use design system tokens
<div className={cardStyles('feature')}>

// Compose with cn()
<div className={cn(typography.h3, colors.textPrimary)}>

// Conditional styling
<div className={cn(
  cardStyles('default'),
  isActive && shadows.glow
)}>
```

### ❌ DON'T

```tsx
// Don't hardcode padding
<div className="p-4">  // Use spacing.base instead

// Don't hardcode colors
<div className="bg-white dark:bg-gray-800">  // Use colors.surfaceLight

// Don't mix inconsistent values
<div className="rounded-xl">  // Some cards
<div className="rounded-2xl">  // Other cards - pick one!

// Don't use arbitrary dark mode colors
<div className="dark:bg-gray-900">  // Use dark:bg-background-dark
<div className="dark:bg-gray-800">  // Use dark:bg-surface-dark
```

## Component Examples

### Feature Card

```tsx
<div className={cn(
  cardStyles('feature'),
  flexLayouts.column,
  spacing.comfortable
)}>
  <h2 className={typography.h2}>Feature Title</h2>
  <p className={colors.textSecondary}>Feature description</p>
</div>
```

### Stat Card

```tsx
<div className={cardStyles('default')}>
  <p className={typography.label}>TOTAL WORKOUTS</p>
  <p className={cn(typography.statLarge, colors.textPrimary)}>
    {count}
  </p>
</div>
```

### Interactive Card

```tsx
<div className={cn(
  cardStyles('interactive'),
  hoverEffect('lift')
)}
onClick={handleClick}>
  <div className={flexLayouts.spaceBetween}>
    <span className={typography.cardTitle}>Card Title</span>
    <ChevronRight />
  </div>
</div>
```

## Testing

Run the app in development mode and verify:

1. **Light/Dark mode toggle**: All colors transition smoothly
2. **Consistent spacing**: Cards have uniform padding
3. **Typography**: Headings use consistent sizes
4. **Shadows**: Cards have consistent elevation
5. **Hover states**: Interactive elements respond consistently

## Questions?

For questions or suggestions about the design system, please create an issue or contact the maintainers.

---

**Last Updated**: January 2026
**Version**: 1.0.0
