import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { useSettingsStore } from '@/store/settingsStore';

interface RestTimerProps {
  duration: number; // Initial rest duration in seconds
  onComplete: () => void; // Callback when timer reaches 0
  onSkip: () => void; // Callback when "Next Set" is clicked
  onPause?: (paused: boolean) => void; // Callback for pause state
  onTimeAdjust?: (seconds: number) => void; // Callback for time adjustments
  isVisible: boolean; // Controls visibility
}

export function RestTimer({
  duration,
  onComplete,
  onSkip,
  onPause,
  onTimeAdjust,
  isVisible,
}: RestTimerProps) {
  const [remainingTime, setRemainingTime] = useState(duration);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialDurationRef = useRef(duration);
  const notificationPermissionRef = useRef<NotificationPermission | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const onCompleteRef = useRef(onComplete);
  const { settings } = useSettingsStore();

  // Keep onComplete ref up to date
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        notificationPermissionRef.current = permission;
      });
    } else if ('Notification' in window) {
      notificationPermissionRef.current = Notification.permission;
    }
  }, []);

  // Initialize audio context for sound alerts
  useEffect(() => {
    if (settings.soundEnabled && !audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
      } catch (error) {
        console.warn('AudioContext not supported:', error);
      }
    }
  }, [settings.soundEnabled]);

  // Reset timer when duration changes or component becomes visible
  useEffect(() => {
    if (isVisible) {
      initialDurationRef.current = duration;
      setRemainingTime(duration);
      setIsPaused(false);
    }
  }, [duration, isVisible]);

  // Timer countdown logic
  useEffect(() => {
    if (isVisible && !isPaused && remainingTime > 0) {
      intervalRef.current = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            // Timer completed
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            
            // Show notification if enabled
            if (notificationPermissionRef.current === 'granted') {
              new Notification('Rest Timer Complete', {
                body: 'Time to start your next set!',
                icon: '/assests/img/fittrackAI.png',
                badge: '/assests/img/fittrackAI.png',
                tag: 'rest-timer',
              });
            }
            
            // Play sound if enabled
            if (settings.soundEnabled && audioContextRef.current) {
              playCompletionSound();
            }
            
            // Vibrate if enabled
            if (settings.vibrationEnabled && 'vibrate' in navigator) {
              navigator.vibrate([200, 100, 200]);
            }
            
            // Defer onComplete to avoid updating parent during render
            setTimeout(() => {
              onCompleteRef.current();
            }, 0);
            return 0;
          }
          return prev - 1;
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
  }, [isVisible, isPaused, remainingTime, settings.soundEnabled, settings.vibrationEnabled]);

  const handlePause = () => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    onPause?.(newPausedState);
  };

  const handleAddTime = (seconds: number) => {
    setRemainingTime((prev) => prev + seconds);
    onTimeAdjust?.(seconds);
  };

  const handleSubtractTime = (seconds: number) => {
    setRemainingTime((prev) => Math.max(0, prev - seconds));
    onTimeAdjust?.(-seconds);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = initialDurationRef.current > 0
    ? (remainingTime / initialDurationRef.current) * 100
    : 0;

  // Play completion sound
  const playCompletionSound = () => {
    if (!audioContextRef.current) return;
    
    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.5);
      
      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + 0.5);
    } catch (error) {
      console.warn('Failed to play sound:', error);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="absolute bottom-6 left-4 right-4 z-40"
        >
          <div className="bg-surface-dark dark:bg-[#152e22] rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-gray-700 dark:border-[#316847] overflow-hidden relative ring-1 ring-white/10">
            {/* Progress Bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gray-800/50">
              <motion.div
                className="h-full bg-primary rounded-r-full shadow-[0_0_10px_rgba(13,242,105,0.5)]"
                initial={{ width: '100%' }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-2 mt-1">
              <span
                className={cn(
                  'text-xs font-bold uppercase tracking-wider flex items-center gap-1.5',
                  isPaused ? 'text-gray-400' : 'text-primary animate-pulse'
                )}
              >
                <span className="material-symbols-outlined text-sm">
                  {isPaused ? 'pause' : 'timer'}
                </span>
                {isPaused ? 'Paused' : 'Resting...'}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAddTime(30)}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label="Add 30 seconds"
                >
                  +30s
                </button>
                <button
                  onClick={() => handleSubtractTime(10)}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label="Subtract 10 seconds"
                >
                  -10s
                </button>
              </div>
            </div>

            {/* Timer Display and Controls */}
            <div className="flex items-center justify-between">
              <div className="tabular-nums text-4xl font-display font-bold text-white tracking-tight">
                {formatTime(remainingTime)}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePause}
                  className="size-11 rounded-full bg-white/5 flex items-center justify-center text-gray-300 hover:bg-white/10 hover:text-white transition-colors border border-white/5 focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label={isPaused ? 'Resume timer' : 'Pause timer'}
                >
                  <span className="material-symbols-outlined text-xl">
                    {isPaused ? 'play_arrow' : 'pause'}
                  </span>
                </button>
                <button
                  onClick={onSkip}
                  className="h-11 pl-4 pr-5 rounded-full bg-primary text-background-dark font-bold text-sm flex items-center gap-2 shadow-lg shadow-primary/20 hover:brightness-105 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  aria-label="Skip to next set"
                >
                  <span className="material-symbols-outlined text-xl">skip_next</span>
                  Next Set
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

