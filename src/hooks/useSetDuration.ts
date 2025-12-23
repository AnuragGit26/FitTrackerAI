import { useState, useRef, useEffect } from 'react';

interface UseSetDurationReturn {
  setDuration: number; // Duration of current set in seconds
  startSet: () => void; // Start tracking a set
  completeSet: () => number; // Complete set and return duration
  reset: () => void; // Reset the tracker
}

const STORAGE_KEYS = {
  startTime: 'fittrackai_set_duration_startTime',
  isTracking: 'fittrackai_set_duration_isTracking',
};

function loadFromStorage(): {
  startTime: Date | null;
  isTracking: boolean;
} {
  try {
    const startTimeStr = localStorage.getItem(STORAGE_KEYS.startTime);
    const isTrackingStr = localStorage.getItem(STORAGE_KEYS.isTracking);

    return {
      startTime: startTimeStr ? new Date(startTimeStr) : null,
      isTracking: isTrackingStr === 'true',
    };
  } catch (error) {
    console.error('Failed to load set duration state from localStorage:', error);
    return {
      startTime: null,
      isTracking: false,
    };
  }
}

function saveToStorage(startTime: Date | null, isTracking: boolean): void {
  try {
    if (startTime) {
      localStorage.setItem(STORAGE_KEYS.startTime, startTime.toISOString());
    } else {
      localStorage.removeItem(STORAGE_KEYS.startTime);
    }
    localStorage.setItem(STORAGE_KEYS.isTracking, isTracking.toString());
  } catch (error) {
    console.error('Failed to save set duration state to localStorage:', error);
  }
}

function clearStorage(): void {
  try {
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('Failed to clear set duration state from localStorage:', error);
  }
}

export function useSetDuration(): UseSetDurationReturn {
  const [setDuration, setSetDuration] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const startTimeRef = useRef<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isVisibleRef = useRef(true);

  // Load persisted state on mount
  useEffect(() => {
    const persisted = loadFromStorage();

    if (persisted.startTime && persisted.isTracking) {
      startTimeRef.current = persisted.startTime;
      setIsTracking(true);

      // Calculate initial elapsed time accounting for background time
      const now = new Date();
      const elapsed = Math.floor(
        (now.getTime() - persisted.startTime.getTime()) / 1000
      );
      setSetDuration(Math.max(0, elapsed));
    }
  }, []);

  // Page Visibility API - handle background/foreground
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;

      if (!document.hidden && startTimeRef.current && isTracking) {
        // Tab became visible - recalculate elapsed time immediately
        const now = new Date();
        const elapsed = Math.floor(
          (now.getTime() - startTimeRef.current.getTime()) / 1000
        );
        setSetDuration(Math.max(0, elapsed));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isTracking]);

  // Timer interval - update when tracking
  useEffect(() => {
    if (isTracking && startTimeRef.current) {
      const updateDuration = () => {
        const now = new Date();
        const elapsed = Math.floor(
          (now.getTime() - startTimeRef.current!.getTime()) / 1000
        );
        setSetDuration(Math.max(0, elapsed));
      };

      // Initial update
      updateDuration();

      // Update every second when visible, every 5 seconds when hidden
      const interval = isVisibleRef.current ? 1000 : 5000;
      intervalRef.current = setInterval(updateDuration, interval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isTracking]);

  const startSet = () => {
    if (!isTracking) {
      const now = new Date();
      startTimeRef.current = now;
      setIsTracking(true);
      setSetDuration(0);
      saveToStorage(now, true);

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
    clearStorage();

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
    clearStorage();
  };

  return {
    setDuration,
    startSet,
    completeSet,
    reset,
  };
}

