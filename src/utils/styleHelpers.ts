/**
 * Style Helper Utilities
 * Utilities for composing and managing Tailwind CSS classes
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { presets, spacing, borderRadius, shadows, colors, transitions } from '@/styles/designSystem';

/**
 * Merge Tailwind CSS classes with proper precedence
 * Combines clsx for conditional classes and tailwind-merge for conflict resolution
 *
 * @example
 * cn('px-2 py-1', condition && 'bg-primary', 'px-4') // => 'py-1 bg-primary px-4'
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Card style builder with variants
 *
 * @example
 * <div className={cardStyles('feature')}>...</div>
 * <div className={cardStyles('default', 'border-2')}>...</div>
 */
export function cardStyles(
  variant: 'default' | 'feature' | 'compact' | 'interactive' = 'default',
  additionalClasses?: string
) {
  return cn(presets.card[variant], additionalClasses);
}

/**
 * Button style builder
 * Note: Use this for custom buttons. The existing Button component should be preferred.
 *
 * @example
 * <button className={buttonStyles('primary', 'px-6 py-3')}>Click me</button>
 */
export function buttonStyles(
  variant: 'primary' | 'secondary' | 'outline' = 'primary',
  additionalClasses?: string
) {
  return cn(presets.button[variant], additionalClasses);
}

/**
 * Input field style builder
 *
 * @example
 * <input className={inputStyles(hasError ? 'error' : 'default')} />
 */
export function inputStyles(
  variant: 'default' | 'error' = 'default',
  additionalClasses?: string
) {
  return cn(presets.input[variant], additionalClasses);
}

/**
 * Section container style builder
 *
 * @example
 * <section className={sectionStyles('hero')}>...</section>
 */
export function sectionStyles(
  variant: 'default' | 'compact' | 'hero' = 'default',
  additionalClasses?: string
) {
  return cn(presets.section[variant], additionalClasses);
}

/**
 * Get status color classes based on type
 *
 * @example
 * <div className={getStatusColor('success')}>Success message</div>
 */
export function getStatusColor(status: 'success' | 'error' | 'warning' | 'info') {
  const colorMap = {
    success: colors.success,
    error: colors.error,
    warning: colors.warning,
    info: colors.info,
  };
  return colorMap[status];
}

/**
 * Get status background classes
 *
 * @example
 * <div className={getStatusBg('success')}>Success message</div>
 */
export function getStatusBg(status: 'success' | 'error' | 'warning' | 'info') {
  const bgMap = {
    success: colors.successBg,
    error: colors.errorBg,
    warning: colors.warningBg,
    info: colors.infoBg,
  };
  return bgMap[status];
}

/**
 * Build focus ring classes for accessibility
 *
 * @example
 * <button className={cn('...', focusRing())}>Accessible button</button>
 */
export function focusRing(color: 'primary' | 'gray' = 'primary') {
  if (color === 'primary') {
    return 'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background-dark';
  }
  return 'focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-background-dark';
}

/**
 * Build hover state classes
 *
 * @example
 * <div className={cn(cardStyles(), hoverEffect('lift'))}>...</div>
 */
export function hoverEffect(effect: 'lift' | 'glow' | 'scale' | 'none' = 'none') {
  const effects = {
    lift: cn(transitions.shadow, shadows.cardHover, 'hover:shadow-cardHover'),
    glow: cn(transitions.shadow, 'hover:shadow-[0_0_30px_rgba(255,153,51,0.25)]'),
    scale: cn(transitions.transform, 'hover:scale-105'),
    none: '',
  };
  return effects[effect];
}

/**
 * Utility for conditionally joining class names with proper spacing
 * Alias for cn() but more semantic for simple joins
 *
 * @example
 * <div className={joinClasses(baseClass, conditionalClass)}>...</div>
 */
export const joinClasses = cn;

/**
 * Build responsive padding classes
 *
 * @example
 * <div className={responsivePadding('base', 'comfortable')}>
 *   // p-4 on mobile, p-5 on desktop
 * </div>
 */
export function responsivePadding(
  mobile: keyof typeof spacing,
  desktop: keyof typeof spacing
) {
  // Extract the padding value (e.g., 'p-4' -> '4')
  const mobileValue = spacing[mobile].split('-')[1];
  const desktopValue = spacing[desktop].split('-')[1];
  return `p-${mobileValue} lg:p-${desktopValue}`;
}

/**
 * Build responsive gap classes
 *
 * @example
 * <div className={responsiveGap('normal', 'relaxed')}>...</div>
 */
export function responsiveGap(
  mobile: keyof typeof spacing,
  desktop: keyof typeof spacing
) {
  const mobileValue = spacing[mobile].split('-')[1];
  const desktopValue = spacing[desktop].split('-')[1];
  return `gap-${mobileValue} lg:gap-${desktopValue}`;
}

/**
 * Truncate text with ellipsis
 *
 * @example
 * <p className={truncate(2)}>Long text that will be truncated...</p>
 */
export function truncate(lines: number = 1) {
  if (lines === 1) {
    return 'truncate';
  }
  return cn('line-clamp-' + lines);
}

/**
 * Common flex layouts
 */
export const flexLayouts = {
  center: 'flex items-center justify-center',
  spaceBetween: 'flex items-center justify-between',
  start: 'flex items-start justify-start',
  end: 'flex items-end justify-end',
  column: 'flex flex-col',
  columnCenter: 'flex flex-col items-center justify-center',
  row: 'flex flex-row',
  rowCenter: 'flex flex-row items-center',
} as const;

/**
 * Common grid layouts
 */
export const gridLayouts = {
  cols2: 'grid grid-cols-2',
  cols3: 'grid grid-cols-3',
  cols4: 'grid grid-cols-4',
  responsive2: 'grid grid-cols-1 md:grid-cols-2',
  responsive3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  responsive4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
} as const;
