import { useState, useEffect, useRef } from 'react';

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Set new timer
    timerRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Custom hook to debounce a callback function
 * @param callback The callback function to debounce
 * @param delay The delay in milliseconds
 * @returns The debounced callback function
 *
 * @example
 * const handleSearch = useDebouncedCallback((query: string) => {
 *   fetchResults(query);
 * }, 300);
 *
 * <input onChange={(e) => handleSearch(e.target.value)} />
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number = 300
): T {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef<T>(callback);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Return debounced function
  const debouncedCallback = ((...args: unknown[]) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }) as T;

  return debouncedCallback;
}

/**
 * Custom hook to throttle a callback function
 * Unlike debounce, throttle ensures the function is called at most once per time period
 * @param callback The callback function to throttle
 * @param delay The minimum time between calls in milliseconds
 * @returns The throttled callback function
 *
 * @example
 * const handleScroll = useThrottledCallback(() => {
 *   console.log('Scrolling...');
 * }, 100);
 *
 * <div onScroll={handleScroll}>...</div>
 */
export function useThrottledCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number = 300
): T {
  const lastRunRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef<T>(callback);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Return throttled function
  const throttledCallback = ((...args: unknown[]) => {
    const now = Date.now();

    // If enough time has passed since last run, execute immediately
    if (now - lastRunRef.current >= delay) {
      callbackRef.current(...args);
      lastRunRef.current = now;
    } else {
      // Otherwise, schedule for later
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      const remaining = delay - (now - lastRunRef.current);
      timerRef.current = setTimeout(() => {
        callbackRef.current(...args);
        lastRunRef.current = Date.now();
      }, remaining);
    }
  }) as T;

  return throttledCallback;
}
