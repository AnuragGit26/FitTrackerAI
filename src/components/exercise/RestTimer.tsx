import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useSettingsStore } from '@/store/settingsStore';
import { prefersReducedMotion } from '@/utils/animations';

const REST_COMPLETE_MESSAGES = [
  'READY TO GO!',
  'LET\'S GO!',
  'YOU GOT THIS!',
  'TIME TO SHINE!',
  'NEXT SET!',
  'HERE WE GO!',
  'GO TIME!',
  'LET\'S DO THIS!',
  'BRING IT ON!',
  'SHOWTIME!',
  'GAME ON!',
  'ALL SET!',
  'LOCKED IN!',
  'FOCUS MODE!',
  'LET\'S CRUSH IT!',
  'READY TO DOMINATE!',
  'TIME TO LIFT!',
  'HERE WE GO AGAIN!',
];

interface RestTimerProps {
  duration: number; // Initial rest duration in seconds
  onComplete: (completionTime?: Date) => void; // Callback when timer reaches 0, with actual completion timestamp
  onSkip: () => void; // Callback when "Next Set" is clicked
  onPause?: (paused: boolean) => void; // Callback for pause state
  onTimeAdjust?: (seconds: number) => void; // Callback for time adjustments
  onRemainingTimeChange?: (remainingTime: number) => void; // Callback when remaining time changes (for state sync)
  isVisible: boolean; // Controls visibility
  initialPaused?: boolean; // Initial pause state (for restoration)
  initialRemainingTime?: number; // Initial remaining time (for restoration)
  initialStartTime?: Date | string | null; // Start time when timer was first started (for drift correction)
  initialOriginalDuration?: number | null; // Original duration when timer started (for drift correction)
}

export function RestTimer({
  duration,
  onComplete,
  onSkip,
  onPause,
  onTimeAdjust,
  onRemainingTimeChange,
  isVisible,
  initialPaused = false,
  initialRemainingTime,
  initialStartTime,
  initialOriginalDuration,
}: RestTimerProps) {
  const [remainingTime, setRemainingTime] = useState(initialRemainingTime ?? duration);
  const [isPaused, setIsPaused] = useState(initialPaused);
  const [showCompletionAnimation, setShowCompletionAnimation] = useState(false);
  const [completionMessage, setCompletionMessage] = useState<string>('Rest Complete!');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCompletedOrSkippedRef = useRef(false);
  const isInCompletionPhaseRef = useRef(false); // Track if we're in the completion animation phase
  const isMountedRef = useRef(true); // Track if component is mounted
  const initialDurationRef = useRef(initialRemainingTime ?? duration);
  const notificationPermissionRef = useRef<NotificationPermission | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onSkipRef = useRef(onSkip);
  const hasInitializedRef = useRef(initialRemainingTime !== undefined || initialPaused);
  const { settings } = useSettingsStore();
  const onRemainingTimeChangeRef = useRef(onRemainingTimeChange);
  const shouldReduceMotion = prefersReducedMotion();
  
  // Keep callback ref up to date
  useEffect(() => {
    onRemainingTimeChangeRef.current = onRemainingTimeChange;
  }, [onRemainingTimeChange]);

  // Keep onComplete ref up to date
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Keep onSkip ref up to date
  useEffect(() => {
    onSkipRef.current = onSkip;
  }, [onSkip]);

  // Cleanup on unmount - always clear all timeouts
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      // Always clear all timeouts on unmount, regardless of completion phase
      // This prevents stale callbacks from being invoked after component unmounts
      const interval = intervalRef.current;
      const completionTimeout = completionTimeoutRef.current;
      
      isMountedRef.current = false;
      
      if (interval) {
        clearInterval(interval);
        intervalRef.current = null;
      }
      if (completionTimeout) {
        clearTimeout(completionTimeout);
        completionTimeoutRef.current = null;
      }
    };
  }, []);

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
  // But don't reset if we're restoring from persisted state
  useEffect(() => {
    if (!isVisible) {
      // Reset initialization flag when timer becomes invisible
      // This allows proper reinitialization when timer becomes visible again
      hasInitializedRef.current = false;
      return;
    }

    if (isVisible && !hasInitializedRef.current) {
      // Check if we're restoring from persisted state
      const isRestoring = initialRemainingTime !== undefined || initialPaused;
      
      if (isRestoring && initialRemainingTime !== undefined) {
        // Restore from persisted state
        // Calculate elapsed time if start time is available to fix timer drift
        let adjustedRemainingTime = initialRemainingTime;
        if (initialStartTime && !initialPaused && initialOriginalDuration !== null && initialOriginalDuration !== undefined) {
          const startTime = initialStartTime instanceof Date 
            ? initialStartTime 
            : new Date(initialStartTime);
          const now = new Date();
          const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
          // Use original duration minus elapsed time to avoid double-counting
          // initialRemainingTime is already reduced, so we need the original duration
          adjustedRemainingTime = Math.max(0, initialOriginalDuration - elapsed);
        }
        
        initialDurationRef.current = adjustedRemainingTime;
        setRemainingTime(adjustedRemainingTime);
        setIsPaused(initialPaused);
        // Reset completion flag when timer becomes visible
        isCompletedOrSkippedRef.current = false;
        isInCompletionPhaseRef.current = false;
        // Clear any pending completion timeout
        if (completionTimeoutRef.current) {
          clearTimeout(completionTimeoutRef.current);
          completionTimeoutRef.current = null;
        }
        // Sync with parent - defer to avoid updating parent during render
        setTimeout(() => {
          onRemainingTimeChange?.(adjustedRemainingTime);
        }, 0);
      } else {
        // First time becoming visible - initialize with duration
        initialDurationRef.current = duration;
        setRemainingTime(duration);
        setIsPaused(false);
        // Reset completion flag when timer becomes visible
        isCompletedOrSkippedRef.current = false;
        isInCompletionPhaseRef.current = false;
        // Clear any pending completion timeout
        if (completionTimeoutRef.current) {
          clearTimeout(completionTimeoutRef.current);
          completionTimeoutRef.current = null;
        }
        // Sync with parent - defer to avoid updating parent during render
        setTimeout(() => {
          onRemainingTimeChange?.(duration);
        }, 0);
      }
      // Mark as initialized after setting up
      hasInitializedRef.current = true;
    }
  }, [duration, isVisible, initialRemainingTime, initialPaused, initialStartTime, initialOriginalDuration, onRemainingTimeChange]);

  // Track previous remainingTime to detect transitions from 0 to positive
  const prevRemainingTimeRef = useRef(remainingTime);

  // Handle transition from 0 to positive remainingTime (e.g., user adds time during completion phase)
  useEffect(() => {
    const prevTime = prevRemainingTimeRef.current;
    const currentTime = remainingTime;

    // Detect transition from 0 to positive
    if (prevTime === 0 && currentTime > 0 && isVisible && !isPaused) {
      // Exit completion phase if we're in it
      if (isInCompletionPhaseRef.current) {
        // Clear completion timeout
        if (completionTimeoutRef.current) {
          clearTimeout(completionTimeoutRef.current);
          completionTimeoutRef.current = null;
        }
        isInCompletionPhaseRef.current = false;
        isCompletedOrSkippedRef.current = false;
        setShowCompletionAnimation(false);
      }

      // Restart the countdown interval since main effect won't re-run (remainingTime not in deps)
      // Clear any existing interval first
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Start new interval to count down from the new remainingTime
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
                icon: '/assets/img/FitTrackAI_Iconv2.jpg',
                badge: '/assets/img/FitTrackAI_Iconv2.jpg',
                tag: 'rest-timer',
              });
            }

            // Play sound if enabled
            if (settings.soundEnabled && audioContextRef.current) {
              playCompletionSound();
            }

            // Vibrate if enabled - stronger pattern for attention
            if (settings.vibrationEnabled && 'vibrate' in navigator) {
              navigator.vibrate([300, 100, 200, 100, 300]);
            }

            // Select random completion message
            const randomMessage = REST_COMPLETE_MESSAGES[
              Math.floor(Math.random() * REST_COMPLETE_MESSAGES.length)
            ];
            setCompletionMessage(randomMessage);
            
            // Show completion animation
            setShowCompletionAnimation(true);

            // Only schedule completion timeout if not already in completion phase
            if (!isInCompletionPhaseRef.current) {
              isInCompletionPhaseRef.current = true;
              // Capture the actual completion time (when timer reached 0) before the animation delay
              // This ensures accurate rest time calculation even though onComplete is called 2 seconds later
              const actualCompletionTime = new Date();
              completionTimeoutRef.current = setTimeout(() => {
                // Only call onComplete if timer hasn't been skipped and component is still mounted
                if (!isCompletedOrSkippedRef.current && isMountedRef.current) {
                  isCompletedOrSkippedRef.current = true;
                  setShowCompletionAnimation(false);
                  onCompleteRef.current(actualCompletionTime);
                }
                completionTimeoutRef.current = null;
                isInCompletionPhaseRef.current = false;
              }, 2000);
            }

            // Defer onRemainingTimeChange to avoid updating parent during render
            setTimeout(() => {
              onRemainingTimeChangeRef.current?.(0);
            }, 0);
            return 0;
          }
          const newTime = prev - 1;
          // Defer onRemainingTimeChange to avoid updating parent during render
          setTimeout(() => {
            onRemainingTimeChangeRef.current?.(newTime);
          }, 0);
          return newTime;
        });
      }, 1000);
    }

    // Update ref for next comparison
    prevRemainingTimeRef.current = currentTime;

    // Cleanup: The interval created here is managed by the main timer effect's cleanup.
    // This effect only creates an interval during the 0→positive transition edge case.
    // The main effect will handle cleanup when dependencies change or component unmounts.
  }, [remainingTime, isVisible, isPaused, settings.soundEnabled, settings.vibrationEnabled]);

  // Timer countdown logic
  useEffect(() => {
    if (isVisible && !isPaused && remainingTime > 0) {
      // Clear existing interval before creating new one
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
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
                icon: '/assets/img/FitTrackAI_Iconv2.jpg',
                badge: '/assets/img/FitTrackAI_Iconv2.jpg',
                tag: 'rest-timer',
              });
            }

            // Play sound if enabled
            if (settings.soundEnabled && audioContextRef.current) {
              playCompletionSound();
            }

            // Vibrate if enabled - stronger pattern for attention
            if (settings.vibrationEnabled && 'vibrate' in navigator) {
              navigator.vibrate([300, 100, 200, 100, 300]);
            }

            // Select random completion message
            const randomMessage = REST_COMPLETE_MESSAGES[
              Math.floor(Math.random() * REST_COMPLETE_MESSAGES.length)
            ];
            setCompletionMessage(randomMessage);
            
            // Show completion animation
            setShowCompletionAnimation(true);

            // Only schedule completion timeout if not already in completion phase
            // This prevents the timeout from being cancelled when remainingTime changes trigger effect re-run
            if (!isInCompletionPhaseRef.current) {
              isInCompletionPhaseRef.current = true;
              // Capture the actual completion time (when timer reached 0) before the animation delay
              // This ensures accurate rest time calculation even though onComplete is called 2 seconds later
              const actualCompletionTime = new Date();
              // Call onComplete after animation delay (2 seconds)
              // Store timeout ID so we can cancel it if user skips
              completionTimeoutRef.current = setTimeout(() => {
                // Only call onComplete if timer hasn't been skipped
                if (!isCompletedOrSkippedRef.current) {
                  isCompletedOrSkippedRef.current = true;
                  setShowCompletionAnimation(false);
                  onCompleteRef.current(actualCompletionTime);
                }
                completionTimeoutRef.current = null;
                isInCompletionPhaseRef.current = false;
              }, 2000);
            }

            // Defer onRemainingTimeChange to avoid updating parent during render
            setTimeout(() => {
              onRemainingTimeChangeRef.current?.(0);
            }, 0);
            return 0;
          }
          const newTime = prev - 1;
          // Defer onRemainingTimeChange to avoid updating parent during render
          setTimeout(() => {
            onRemainingTimeChangeRef.current?.(newTime);
          }, 0);
          return newTime;
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
      // Only clear completion timeout if we're not in the completion phase
      // This prevents the timeout from being cancelled when remainingTime changes trigger effect re-run
      // Unmount cleanup is handled by separate unmount effect above
      if (completionTimeoutRef.current && !isInCompletionPhaseRef.current) {
        clearTimeout(completionTimeoutRef.current);
        completionTimeoutRef.current = null;
      }
    };
    // remainingTime is intentionally excluded from dependencies to prevent effect re-run
    // when timer reaches 0, which would cancel the completion timeout. We use functional
    // updates (setRemainingTime((prev) => ...)) so we don't need remainingTime as a dependency.
    // The separate effect above handles the transition from 0 to positive to restart the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, isPaused, settings.soundEnabled, settings.vibrationEnabled]);

  const handleSkip = () => {
    // Clear the completion timeout to prevent race condition
    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = null;
    }
    // Reset completion phase tracking
    isInCompletionPhaseRef.current = false;
    // Mark as completed/skipped to prevent onComplete from firing
    isCompletedOrSkippedRef.current = true;
    setShowCompletionAnimation(false);
    // Call onSkip callback
    onSkipRef.current();
  };

  const handlePause = () => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    onPause?.(newPausedState);
    // Report current remaining time when paused so parent can sync state
    if (newPausedState) {
      onRemainingTimeChange?.(remainingTime);
    }
  };

  const handleAddTime = (seconds: number) => {
    setRemainingTime((prev) => {
      const newTime = prev + seconds;
      onRemainingTimeChange?.(newTime);
      return newTime;
    });
    onTimeAdjust?.(seconds);
  };

  const handleSubtractTime = (seconds: number) => {
    setRemainingTime((prev) => {
      const newTime = Math.max(0, prev - seconds);
      onRemainingTimeChange?.(newTime);
      return newTime;
    });
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
    if (!audioContextRef.current) {return;}

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
    <>
      {/* Completion Animation Overlay */}
      <AnimatePresence>
        {showCompletionAnimation && !shouldReduceMotion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none bg-black/40 backdrop-blur-sm"
            style={{ willChange: 'opacity', transform: 'translate3d(0, 0, 0)' }}
          >
            {/* Screen Flash - Double Flash (behind content) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 0.35, 0, 0.2, 0],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.3,
                times: [0, 0.2, 0.4, 0.6, 1],
              }}
              className="absolute inset-0 bg-primary pointer-events-none"
              style={{ willChange: 'opacity' }}
            />

            {/* Content Container - Properly Centered */}
            <div className="relative flex flex-col items-center justify-center gap-8">
              {/* Success Checkmark with Pulse */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{
                  scale: [0, 1.5, 0.95, 1.1, 1],
                  rotate: 0,
                }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{
                  type: 'spring',
                  damping: 14,
                  stiffness: 350,
                  duration: 0.8
                }}
                className="relative z-10"
                style={{ willChange: 'transform' }}
              >
                {/* Main Checkmark Circle */}
                <div className="size-36 rounded-full bg-gradient-to-br from-background-dark/90 to-background-dark/95 flex items-center justify-center border-[5px] border-primary shadow-[0_0_60px_rgba(255,153,51,0.9),0_0_100px_rgba(255,153,51,0.5)] ring-[6px] ring-primary/30">
                  <Check className="w-20 h-20 text-primary stroke-[4.5] drop-shadow-[0_0_20px_rgba(255,153,51,1)]" />
                </div>

                {/* Persistent Background Glow */}
                <motion.div
                  className="absolute inset-0 rounded-full bg-primary/25 -z-10"
                  initial={{ scale: 1, opacity: 0.7 }}
                  animate={{
                    scale: [1, 1.25, 1],
                    opacity: [0.7, 0.4, 0.7],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  style={{ willChange: 'transform, opacity' }}
                />

                {/* Pulse Ripple Effect - Properly Centered */}
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full border-[5px] border-primary/70 -z-20"
                    initial={{ scale: 1, opacity: 1 }}
                    animate={{
                      scale: [1, 2.5, 4],
                      opacity: [1, 0.6, 0],
                    }}
                    transition={{
                      duration: 1.8,
                      delay: i * 0.25,
                      ease: 'easeOut',
                      repeat: 0,
                    }}
                    style={{
                      transformOrigin: 'center',
                      willChange: 'transform, opacity',
                    }}
                  />
                ))}
              </motion.div>

              {/* Success Message - Properly Aligned Below Checkmark */}
              <motion.div
                initial={{ y: 30, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -30, opacity: 0, scale: 0.9 }}
                transition={{
                  delay: 0.35,
                  duration: 0.5,
                  type: 'spring',
                  damping: 20,
                  stiffness: 300
                }}
                className="relative z-10"
                style={{ willChange: 'transform, opacity' }}
              >
                <div className="relative bg-gradient-to-br from-background-dark/85 to-background-dark/90 dark:from-background-dark/90 dark:to-background-dark/95 rounded-2xl px-8 py-4 border-2 border-primary/30 shadow-[0_0_30px_rgba(255,153,51,0.4)] backdrop-blur-sm">
                  {/* Glow effect behind text */}
                  <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl -z-10" />

                  <motion.p
                    className="text-4xl font-bold text-primary text-center tracking-wide"
                    animate={{
                      scale: [1, 1.08, 1.02, 1],
                    }}
                    transition={{
                      duration: 0.7,
                      delay: 0.4,
                      times: [0, 0.4, 0.7, 1],
                      type: 'spring',
                      stiffness: 200,
                      damping: 15,
                    }}
                    style={{
                      textShadow: '0 0 30px rgba(255, 153, 51, 1), 0 0 60px rgba(255, 153, 51, 0.8), 0 0 90px rgba(255, 153, 51, 0.6), 3px 3px 6px rgba(0, 0, 0, 0.7)',
                      willChange: 'transform',
                      letterSpacing: '0.05em'
                    }}
                  >
                    {completionMessage}
                  </motion.p>
                </div>
              </motion.div>

              {/* Decorative Particles */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={`particle-${i}`}
                  className="absolute size-2 rounded-full bg-primary/80 shadow-[0_0_10px_rgba(255,153,51,0.8)]"
                  initial={{
                    opacity: 0,
                    x: 0,
                    y: 0,
                    scale: 0
                  }}
                  animate={{
                    opacity: [0, 1, 1, 0],
                    x: [0, Math.cos((i * 60) * Math.PI / 180) * 120],
                    y: [0, Math.sin((i * 60) * Math.PI / 180) * 120],
                    scale: [0, 1, 0.8, 0]
                  }}
                  transition={{
                    duration: 1.5,
                    delay: 0.3 + (i * 0.08),
                    ease: 'easeOut'
                  }}
                  style={{ willChange: 'transform, opacity' }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute bottom-6 left-4 right-4 z-40"
          >
          <div className="bg-surface-dark dark:bg-surface-dark rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-transparent dark:border-border-dark overflow-hidden relative ring-1 ring-white/10">
            {/* Progress Bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-surface-dark/50">
              <motion.div
                className="h-full bg-primary rounded-r-full shadow-[0_0_10px_rgba(255,153,51,0.5)]"
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
                  className="size-11 rounded-full bg-white/5 flex items-center justify-center text-slate-300 hover:bg-white/10 hover:text-white transition-colors border border-white/5 focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label={isPaused ? 'Resume timer' : 'Pause timer'}
                >
                  <span className="material-symbols-outlined text-xl">
                    {isPaused ? 'play_arrow' : 'pause'}
                  </span>
                </button>
                <button
                  onClick={handleSkip}
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
    </>
  );
}

