import { useState, useEffect, useRef, useCallback } from 'react';
import { restTimerService } from '@/services/restTimerService';
import { useSettingsStore } from '@/store/settingsStore';

interface UseRestTimerOptions {
  duration: number; // Initial duration in seconds
  autoStart?: boolean;
  onComplete?: () => void;
  onTick?: (remaining: number) => void;
}

export function useRestTimer({
  duration,
  autoStart = false,
  onComplete,
  onTick,
}: UseRestTimerOptions) {
  const { settings } = useSettingsStore();
  const [remaining, setRemaining] = useState(duration);
  const [isPaused, setIsPaused] = useState(!autoStart);
  const [startTime, setStartTime] = useState<Date | null>(
    autoStart ? new Date() : null
  );
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onTickRef = useRef(onTick);
  const originalDurationRef = useRef(duration);

  // Keep refs updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onTickRef.current = onTick;
  }, [onComplete, onTick]);

  // Reset when duration changes
  useEffect(() => {
    originalDurationRef.current = duration;
    setRemaining(duration);
  }, [duration]);

  // Timer countdown
  useEffect(() => {
    if (!isPaused && remaining > 0 && startTime) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          const newRemaining = prev - 1;
          onTickRef.current?.(newRemaining);

          if (newRemaining <= 0) {
            // Timer completed
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }

            // Trigger notifications
            if (settings.soundEnabled) {
              restTimerService.playCompletionSound();
            }
            if (settings.vibrationEnabled) {
              restTimerService.vibrate();
            }
            if (settings.notificationsEnabled) {
              restTimerService.showNotification(
                'Rest Timer Complete',
                'Time to start your next set!'
              );
            }

            // Call completion callback
            setTimeout(() => {
              onCompleteRef.current?.();
            }, 0);

            return 0;
          }

          return newRemaining;
        });
      }, 1000);
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
  }, [isPaused, remaining, startTime, settings]);

  const start = useCallback(() => {
    setStartTime(new Date());
    setIsPaused(false);
  }, []);

  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const reset = useCallback(() => {
    setRemaining(originalDurationRef.current);
    setIsPaused(true);
    setStartTime(null);
  }, []);

  const addTime = useCallback((seconds: number) => {
    setRemaining((prev) => prev + seconds);
  }, []);

  const subtractTime = useCallback((seconds: number) => {
    setRemaining((prev) => Math.max(0, prev - seconds));
  }, []);

  const formatTime = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    remaining,
    isPaused,
    startTime,
    formattedTime: formatTime(remaining),
    progress: originalDurationRef.current > 0
      ? (remaining / originalDurationRef.current) * 100
      : 0,
    start,
    pause,
    resume,
    reset,
    addTime,
    subtractTime,
  };
}

