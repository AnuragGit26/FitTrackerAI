import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

interface UseCountUpOptions {
  duration?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  ease?: string;
  onComplete?: () => void;
}

export function useCountUp(
  end: number,
  start: number = 0,
  options: UseCountUpOptions = {}
) {
  const {
    duration = 1.5,
    decimals = 0,
    suffix = '',
    prefix = '',
    ease = 'power2.out',
    onComplete
  } = options;

  const [value, setValue] = useState(start);
  const animationRef = useRef<gsap.core.Tween | null>(null);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    // Skip animation if user prefers reduced motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(end);
      return;
    }

    // Don't animate if already at target
    if (end === start) {
      setValue(end);
      return;
    }

    // Kill any existing animation
    if (animationRef.current) {
      animationRef.current.kill();
    }

    isAnimatingRef.current = true;
    setValue(start);

    const obj = { value: start };
    animationRef.current = gsap.to(obj, {
      value: end,
      duration,
      ease,
      onUpdate: () => {
        setValue(obj.value);
      },
      onComplete: () => {
        isAnimatingRef.current = false;
        setValue(end);
        onComplete?.();
      }
    });

    return () => {
      if (animationRef.current) {
        animationRef.current.kill();
      }
    };
  }, [end, start, duration, ease, onComplete]);

  const formattedValue = `${prefix}${value.toFixed(decimals)}${suffix}`;

  return {
    value,
    formattedValue,
    isAnimating: isAnimatingRef.current
  };
}

