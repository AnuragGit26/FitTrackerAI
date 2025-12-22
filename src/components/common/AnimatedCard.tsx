import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { fadeIn, scaleIn, cardHover, prefersReducedMotion } from '@/utils/animations';

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'fade' | 'scale' | 'slideUp';
  hover?: boolean;
  delay?: number;
  onClick?: () => void;
}

export function AnimatedCard({ 
  children, 
  className = '',
  variant = 'fade',
  hover = false,
  delay = 0,
  onClick
}: AnimatedCardProps) {
  const shouldReduceMotion = prefersReducedMotion();
  
  const variants = {
    fade: fadeIn,
    scale: scaleIn,
    slideUp: {
      hidden: { opacity: 0, y: 20 },
      visible: { 
        opacity: 1, 
        y: 0,
        transition: { duration: 0.4, ease: 'easeOut', delay }
      }
    }
  };

  const animationVariants = shouldReduceMotion ? {} : variants[variant];

  const finalVariants = hover && !shouldReduceMotion 
    ? { ...animationVariants, ...cardHover } 
    : animationVariants;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={finalVariants}
      whileHover={hover && !shouldReduceMotion ? 'hover' : undefined}
      whileTap={onClick && !shouldReduceMotion ? { scale: 0.98 } : undefined}
      className={cn(className)}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

