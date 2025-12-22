import { useState, useRef } from 'react';

interface UseSetDurationReturn {
  setDuration: number; // Duration of current set in seconds
  startSet: () => void; // Start tracking a set
  completeSet: () => number; // Complete set and return duration
  reset: () => void; // Reset the tracker
}

export function useSetDuration(): UseSetDurationReturn {
  const [setDuration, setSetDuration] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const startTimeRef = useRef<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startSet = () => {
    if (!isTracking) {
      startTimeRef.current = new Date();
      setIsTracking(true);
      setSetDuration(0);

      // Update duration every second
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor(
            (new Date().getTime() - startTimeRef.current.getTime()) / 1000
          );
          setSetDuration(elapsed);
        }
      }, 1000);
    }
  };

  const completeSet = (): number => {
    let finalDuration = setDuration;

    if (startTimeRef.current) {
      // Calculate final duration
      finalDuration = Math.floor(
        (new Date().getTime() - startTimeRef.current.getTime()) / 1000
      );
      setSetDuration(finalDuration);
    }

    // Stop tracking
    setIsTracking(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    startTimeRef.current = null;

    return finalDuration;
  };

  const reset = () => {
    setIsTracking(false);
    setSetDuration(0);
    startTimeRef.current = null;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  return {
    setDuration,
    startSet,
    completeSet,
    reset,
  };
}

