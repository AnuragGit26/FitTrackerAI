import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { prefersReducedMotion } from '@/utils/animations';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const shouldReduceMotion = prefersReducedMotion();

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <motion.div
        className={cn(
          'rounded-full border-4 border-primary/20 border-t-primary',
          sizes[size]
        )}
        animate={shouldReduceMotion ? {} : {
          rotate: 360,
          scale: [1, 1.1, 1],
        }}
        transition={{
          rotate: {
            duration: 1,
            repeat: Infinity,
            ease: 'linear'
          },
          scale: {
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }
        }}
      />
    </div>
  );
}

