/**
 * FitTrackAI Design System
 * Centralized design tokens for consistent UI/UX
 */

export const spacing = {
  // Padding scale - use consistently across components
  compact: 'p-3',      // Dense UI elements (mobile cards, tight layouts)
  base: 'p-4',         // Default cards and modals
  comfortable: 'p-5',  // Feature cards, important sections
  spacious: 'p-6',     // Page sections, hero areas
  generous: 'p-8',     // Major sections, landing areas

  // Gap scale - for flex/grid spacing
  tight: 'gap-2',      // Icon + text, compact lists
  normal: 'gap-3',     // Card internal elements
  relaxed: 'gap-4',    // Section spacing
  loose: 'gap-6',      // Page sections, major divisions
} as const;

export const borderRadius = {
  // Standardized border radii
  card: 'rounded-xl',       // 0.75rem - default cards
  cardLarge: 'rounded-2xl', // 1rem - feature/hero cards
  button: 'rounded-lg',     // 0.5rem - buttons, inputs
  pill: 'rounded-full',     // Pills, badges, avatars
  input: 'rounded-lg',      // Form inputs
  modal: 'rounded-2xl',     // Modals, dialogs
} as const;

export const shadows = {
  // Shadow hierarchy
  none: 'shadow-none',
  card: 'shadow-sm',                                    // Default cards
  cardHover: 'shadow-md',                               // Card hover state
  modal: 'shadow-lg',                                   // Modals, dropdowns
  feature: 'shadow-xl',                                 // Hero cards, featured content
  glow: 'shadow-[0_0_20px_rgba(255,153,51,0.4)]',    // Primary color glow (Saffron)
  glowHover: 'shadow-[0_0_30px_rgba(255,153,51,0.5)]', // Hover glow
  glowSaffron: 'shadow-[0_0_20px_rgba(255,153,51,0.4)]', // Saffron glow
  glowSaffronLg: 'shadow-[0_0_30px_rgba(255,153,51,0.6)]', // Large saffron glow
} as const;

export const typography = {
  // Page headings
  h1: 'text-3xl font-bold',
  h2: 'text-2xl font-bold',
  h3: 'text-xl font-bold',
  h4: 'text-lg font-semibold',

  // Body text
  body: 'text-base',
  bodySmall: 'text-sm',
  bodyLarge: 'text-lg',

  // Labels and secondary text (matching home screen)
  label: 'text-sm text-slate-500 dark:text-gray-300',
  labelBold: 'text-sm font-medium text-slate-700 dark:text-gray-300',

  // Card titles (matching home screen)
  cardTitle: 'text-lg font-bold text-slate-900 dark:text-white',
  cardSubtitle: 'text-sm font-medium text-slate-500 dark:text-gray-400',

  // Stats and numbers
  statLarge: 'text-4xl font-bold',
  statMedium: 'text-2xl font-bold',
  statSmall: 'text-xl font-semibold',
} as const;

export const colors = {
  // Surface/Background colors (matching home screen exactly)
  surfaceLight: 'bg-white dark:bg-surface-dark-light',
  surfaceLightAlt: 'bg-white dark:bg-surface-dark-light',
  backgroundBase: 'bg-background-light dark:bg-background-dark',

  // Border colors (matching home screen exactly)
  border: 'border-gray-100 dark:border-transparent',
  borderSubtle: 'border-gray-100 dark:border-transparent',
  borderStrong: 'border-gray-100 dark:border-primary/30',

  // Text colors (matching home screen exactly)
  textPrimary: 'text-slate-900 dark:text-white',
  textSecondary: 'text-slate-500 dark:text-gray-300',
  textMuted: 'text-slate-500 dark:text-gray-400',
  textDisabled: 'text-slate-400 dark:text-gray-400',

  // Status colors - multicolor palette (no greens)
  success: 'text-blue-600 dark:text-blue-400',
  error: 'text-red-600 dark:text-red-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  info: 'text-purple-600 dark:text-purple-400',

  // Background status colors - multicolor palette
  successBg: 'bg-blue-50 dark:bg-blue-900/20',
  errorBg: 'bg-red-50 dark:bg-red-900/20',
  warningBg: 'bg-yellow-50 dark:bg-yellow-900/20',
  infoBg: 'bg-purple-50 dark:bg-purple-900/20',

  // Primary color (FitTrackAI Saffron/Orange)
  primary: 'text-primary',
  primaryBg: 'bg-primary',
  primaryHover: 'hover:bg-primary-dark',
} as const;

export const transitions = {
  // Standard transitions
  base: 'transition-all duration-200',
  fast: 'transition-all duration-150',
  slow: 'transition-all duration-300',
  colors: 'transition-colors duration-200',
  shadow: 'transition-shadow duration-200',
  transform: 'transition-transform duration-200',
} as const;

export const layout = {
  // Container widths
  containerSm: 'max-w-screen-sm',   // 640px
  containerMd: 'max-w-screen-md',   // 768px
  containerLg: 'max-w-screen-lg',   // 1024px
  containerXl: 'max-w-screen-xl',   // 1280px
  container2xl: 'max-w-screen-2xl', // 1536px

  // Common layouts
  centerContent: 'flex items-center justify-center',
  spaceBetween: 'flex items-center justify-between',
  stack: 'flex flex-col',
  row: 'flex flex-row',
} as const;

/**
 * Preset component styles for common patterns
 */
export const presets = {
  // Card variants
  card: {
    default: `${colors.surfaceLight} ${borderRadius.card} ${shadows.card} ${spacing.base} ${transitions.shadow}`,
    feature: `${colors.surfaceLight} ${borderRadius.cardLarge} ${shadows.feature} ${spacing.comfortable}`,
    compact: `${colors.surfaceLight} ${borderRadius.card} ${shadows.card} ${spacing.compact}`,
    interactive: `${colors.surfaceLight} ${borderRadius.card} ${shadows.card} ${spacing.base} ${transitions.shadow} cursor-pointer hover:${shadows.cardHover}`,
  },

  // Button variants (matching home screen exactly)
  button: {
    primary: `${colors.primaryBg} ${colors.primaryHover} text-background-dark ${borderRadius.button} font-medium ${transitions.colors}`,
    secondary: `bg-white dark:bg-surface-dark-light ${colors.textPrimary} ${borderRadius.button} font-medium hover:bg-gray-100 dark:hover:bg-surface-dark ${transitions.colors}`,
    outline: `border-2 ${colors.border} ${colors.textPrimary} ${borderRadius.button} font-medium hover:bg-gray-50 dark:hover:bg-surface-dark-light ${transitions.colors}`,
  },

  // Input fields
  input: {
    default: `${colors.surfaceLight} ${borderRadius.input} border ${colors.border} ${colors.textPrimary} focus:ring-2 focus:ring-primary focus:border-primary ${transitions.colors}`,
    error: `${colors.surfaceLight} ${borderRadius.input} border-2 border-red-500 ${colors.textPrimary} focus:ring-2 focus:ring-red-500 ${transitions.colors}`,
  },

  // Section containers
  section: {
    default: `${spacing.spacious} ${spacing.relaxed}`,
    compact: `${spacing.base} ${spacing.normal}`,
    hero: `${spacing.generous} ${spacing.loose}`,
  },
} as const;

/**
 * Responsive breakpoint helpers
 */
export const breakpoints = {
  sm: '640px',  // mobile landscape
  md: '768px',  // tablet
  lg: '1024px', // desktop
  xl: '1280px', // large desktop
  '2xl': '1536px', // ultra-wide
} as const;

/**
 * Z-index scale for layering
 */
export const zIndex = {
  base: 'z-0',
  dropdown: 'z-10',
  sticky: 'z-20',
  fixed: 'z-30',
  modalBackdrop: 'z-40',
  modal: 'z-50',
  popover: 'z-60',
  tooltip: 'z-70',
} as const;
