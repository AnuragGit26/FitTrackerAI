import { motion } from 'framer-motion';
import { LoadingSpinner } from './LoadingSpinner';
import { cn } from '@/utils/cn';
import { fadeIn, prefersReducedMotion } from '@/utils/animations';

interface LoadingStateProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

export function LoadingState({ size = 'md', message, className }: LoadingStateProps) {
  const shouldReduceMotion = prefersReducedMotion();

  return (
    <motion.div 
      className={cn('flex flex-col items-center justify-center py-12 px-4', className)}
      variants={shouldReduceMotion ? {} : fadeIn}
      initial="hidden"
      animate="visible"
    >
      <LoadingSpinner size={size} />
      {message && (
        <motion.p 
          className="mt-4 text-sm text-gray-500 dark:text-gray-400"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {message}
        </motion.p>
      )}
    </motion.div>
  );
}

