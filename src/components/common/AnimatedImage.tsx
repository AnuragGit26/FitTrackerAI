import { useState } from 'react';
import { motion } from 'framer-motion';
import { prefersReducedMotion } from '@/utils/animations';
import { Skeleton } from './Skeleton';

interface AnimatedImageProps {
  src: string;
  alt: string;
  className?: string;
  skeletonClassName?: string;
  width?: number | string;
  height?: number | string;
  onLoad?: () => void;
  onError?: () => void;
}

export function AnimatedImage({
  src,
  alt,
  className = '',
  skeletonClassName = '',
  width,
  height,
  onLoad,
  onError,
}: AnimatedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const shouldReduceMotion = prefersReducedMotion();

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-200 dark:bg-gray-700 ${className}`}
        style={{ width, height }}
      >
        <span className="text-gray-400 dark:text-gray-500 text-sm">
          Failed to load image
        </span>
      </div>
    );
  }

  return (
    <div className="relative" style={{ width, height }}>
      {!isLoaded && (
        <Skeleton
          className={`absolute inset-0 ${skeletonClassName}`}
          style={{ width, height }}
        />
      )}
      <motion.img
        src={src}
        alt={alt}
        className={className}
        style={{ width, height }}
        onLoad={handleLoad}
        onError={handleError}
        initial={!shouldReduceMotion ? { opacity: 0, scale: 1.1 } : {}}
        animate={!shouldReduceMotion && isLoaded ? { opacity: 1, scale: 1 } : { opacity: isLoaded ? 1 : 0 }}
        transition={{
          duration: 0.4,
          ease: 'easeOut'
        }}
      />
    </div>
  );
}
