import { ButtonHTMLAttributes, ReactNode, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { checkmarkAnimation, prefersReducedMotion } from '@/utils/animations';
import { Check } from 'lucide-react';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  isLoading?: boolean;
  showSuccess?: boolean;
  onSuccessComplete?: () => void;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  isLoading = false,
  showSuccess = false,
  onSuccessComplete,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const [showCheckmark, setShowCheckmark] = useState(false);
  const shouldReduceMotion = prefersReducedMotion();

  const baseStyles = 'font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden';

  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600',
    outline: 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-900/20',
    ghost: 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
    danger: 'bg-error text-white hover:bg-red-600',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  if (showSuccess && !showCheckmark) {
    setShowCheckmark(true);
    setTimeout(() => {
      setShowCheckmark(false);
      onSuccessComplete?.();
    }, 2000);
  }

  return (
    <motion.button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      whileHover={!disabled && !isLoading && !shouldReduceMotion ? { scale: 1.02 } : undefined}
      whileTap={!disabled && !isLoading && !shouldReduceMotion ? { scale: 0.98 } : undefined}
      {...(props as any)}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
          Loading...
        </span>
      ) : showCheckmark ? (
        <motion.span
          className="flex items-center gap-2"
          variants={shouldReduceMotion ? {} : checkmarkAnimation}
          initial="initial"
          animate="animate"
        >
          <Check className="w-4 h-4" />
          Success!
        </motion.span>
      ) : (
        children
      )}
    </motion.button>
  );
}

