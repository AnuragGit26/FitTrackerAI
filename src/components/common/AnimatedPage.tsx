import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { pageTransition, prefersReducedMotion } from '@/utils/animations';

interface AnimatedPageProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedPage({ children, className = '' }: AnimatedPageProps) {
  const shouldReduceMotion = prefersReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : 'initial'}
      animate="animate"
      exit="exit"
      variants={shouldReduceMotion ? {} : pageTransition}
      className={className}
    >
      {children}
    </motion.div>
  );
}

