import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { prefersReducedMotion } from '@/utils/animations';

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  className?: string;
}

export function Toggle({ checked, onChange, disabled = false, className }: ToggleProps) {
  const shouldReduceMotion = prefersReducedMotion();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-250 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        checked ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'cursor-pointer',
        className
      )}
    >
      <motion.span
        layout={!shouldReduceMotion}
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow-md',
          checked ? 'translate-x-5' : 'translate-x-1'
        )}
        transition={
          !shouldReduceMotion
            ? {
                type: 'spring',
                stiffness: 700,
                damping: 30,
              }
            : { duration: 0 }
        }
        whileTap={!shouldReduceMotion && !disabled ? { scale: 0.95 } : undefined}
      />
    </button>
  );
}
