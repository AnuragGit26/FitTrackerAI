import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { prefersReducedMotion } from '@/utils/animations';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animate?: boolean;
}

export function Skeleton({ 
  className = '', 
  variant = 'rectangular',
  width,
  height,
  animate = true
}: SkeletonProps) {
  const shouldReduceMotion = prefersReducedMotion();
  
  const baseStyles = 'bg-white dark:bg-surface-dark-light rounded';
  
  const variantStyles = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded',
  };

  const style: React.CSSProperties = {};
  if (width) {style.width = typeof width === 'number' ? `${width}px` : width;}
  if (height) {style.height = typeof height === 'number' ? `${height}px` : height;}

  return (
    <motion.div
      className={cn(baseStyles, variantStyles[variant], className)}
      style={style}
      animate={animate && !shouldReduceMotion ? {
        opacity: [0.5, 1, 0.5],
      } : {}}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
    />
  );
}

