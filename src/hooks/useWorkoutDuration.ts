import { useState, useEffect, useRef } from 'react';

interface UseWorkoutDurationReturn {
    elapsedTime: number; // Total seconds elapsed
    formattedTime: string; // "MM:SS" or "HH:MM:SS" format
    isRunning: boolean;
    pause: () => void;
    resume: () => void;
    reset: () => void;
}

const STORAGE_KEYS = {
    startTime: 'fittrackai_workout_timer_startTime',
    pausedTime: 'fittrackai_workout_timer_pausedTime',
    pauseStartTime: 'fittrackai_workout_timer_pauseStartTime',
    isRunning: 'fittrackai_workout_timer_isRunning',
    wasReset: 'fittrackai_workout_timer_wasReset',
};

function loadFromStorage(): {
    startTime: Date | null;
    pausedTime: number;
    pauseStartTime: Date | null;
    isRunning: boolean;
} {
    try {
        const startTimeStr = localStorage.getItem(STORAGE_KEYS.startTime);
        const pausedTimeStr = localStorage.getItem(STORAGE_KEYS.pausedTime);
        const pauseStartTimeStr = localStorage.getItem(STORAGE_KEYS.pauseStartTime);
        const isRunningStr = localStorage.getItem(STORAGE_KEYS.isRunning);

        return {
            startTime: startTimeStr ? new Date(startTimeStr) : null,
            pausedTime: pausedTimeStr ? parseFloat(pausedTimeStr) : 0,
            pauseStartTime: pauseStartTimeStr ? new Date(pauseStartTimeStr) : null,
            isRunning: isRunningStr === 'true',
        };
    } catch (error) {
        console.error('Failed to load timer state from localStorage:', error);
        return {
            startTime: null,
            pausedTime: 0,
            pauseStartTime: null,
            isRunning: false,
        };
    }
}

function saveToStorage(
    startTime: Date | null,
    pausedTime: number,
    pauseStartTime: Date | null,
    isRunning: boolean
): void {
    try {
        if (startTime) {
            localStorage.setItem(STORAGE_KEYS.startTime, startTime.toISOString());
        } else {
            localStorage.removeItem(STORAGE_KEYS.startTime);
        }
        localStorage.setItem(STORAGE_KEYS.pausedTime, pausedTime.toString());
        if (pauseStartTime) {
            localStorage.setItem(STORAGE_KEYS.pauseStartTime, pauseStartTime.toISOString());
        } else {
            localStorage.removeItem(STORAGE_KEYS.pauseStartTime);
        }
        localStorage.setItem(STORAGE_KEYS.isRunning, isRunning.toString());
    } catch (error) {
        console.error('Failed to save timer state to localStorage:', error);
    }
}

function clearStorage(): void {
    try {
        Object.values(STORAGE_KEYS).forEach((key) => {
            localStorage.removeItem(key);
        });
        // Set reset flag to prevent restoration
        localStorage.setItem(STORAGE_KEYS.wasReset, 'true');
    } catch (error) {
        console.error('Failed to clear timer state from localStorage:', error);
    }
}

function wasReset(): boolean {
    try {
        return localStorage.getItem(STORAGE_KEYS.wasReset) === 'true';
    } catch {
        return false;
    }
}

function clearResetFlag(): void {
    try {
        localStorage.removeItem(STORAGE_KEYS.wasReset);
    } catch (error) {
        console.error('Failed to clear reset flag:', error);
    }
}

export function useWorkoutDuration(startTime: Date | null): UseWorkoutDurationReturn {
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [pausedTime, setPausedTime] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<Date | null>(null);
    const pauseStartRef = useRef<Date | null>(null);
    const lastUpdateRef = useRef<Date>(new Date());
    const isVisibleRef = useRef(true);

    // Load persisted state on mount
    useEffect(() => {
        // Check if timer was reset - if so, don't restore state
        if (wasReset()) {
            clearResetFlag();
            // If startTime prop is provided, use it instead
            if (startTime) {
                startTimeRef.current = startTime;
                setIsRunning(true);
                setPausedTime(0);
                setElapsedTime(0);
                saveToStorage(startTime, 0, null, true);
            }
            return;
        }

        const persisted = loadFromStorage();

        // If we have a persisted start time, use it
        if (persisted.startTime) {
            startTimeRef.current = persisted.startTime;
            setPausedTime(persisted.pausedTime);
            setIsRunning(persisted.isRunning);

            if (persisted.pauseStartTime) {
                pauseStartRef.current = persisted.pauseStartTime;
            }

            // Calculate initial elapsed time
            const now = new Date();
            const baseElapsed = Math.floor((now.getTime() - persisted.startTime.getTime()) / 1000);
            let totalPaused = persisted.pausedTime;

            // If currently paused, add time since pause started
            if (persisted.isRunning === false && persisted.pauseStartTime) {
                const pauseDuration = Math.floor(
                    (now.getTime() - persisted.pauseStartTime.getTime()) / 1000
                );
                totalPaused += pauseDuration;
            }

            setElapsedTime(Math.max(0, baseElapsed - totalPaused));
        } else if (startTime) {
            // New timer started
            startTimeRef.current = startTime;
            setIsRunning(true);
            setPausedTime(0);
            saveToStorage(startTime, 0, null, true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run on mount - startTime is handled in separate effect

    // Handle new startTime prop (when exercise is selected)
    useEffect(() => {
        if (startTime && !startTimeRef.current) {
            // Only start if we don't have a persisted timer
            const persisted = loadFromStorage();
            if (!persisted.startTime) {
                startTimeRef.current = startTime;
                setIsRunning(true);
                setPausedTime(0);
                setElapsedTime(0);
                saveToStorage(startTime, 0, null, true);
            }
        }
    }, [startTime]); // startTime is intentionally included - we want to react to it

    // Page Visibility API - handle background/foreground
    useEffect(() => {
        const handleVisibilityChange = () => {
            const wasVisible = isVisibleRef.current;
            isVisibleRef.current = !document.hidden;

            if (!document.hidden && startTimeRef.current) {
                // Tab became visible - recalculate elapsed time immediately
                const now = new Date();
                const baseElapsed = Math.floor((now.getTime() - startTimeRef.current.getTime()) / 1000);
                let totalPaused = pausedTime;

                if (!isRunning && pauseStartRef.current) {
                    const pauseDuration = Math.floor(
                        (now.getTime() - pauseStartRef.current.getTime()) / 1000
                    );
                    totalPaused += pauseDuration;
                }

                setElapsedTime(Math.max(0, baseElapsed - totalPaused));
                lastUpdateRef.current = now;
                
                // If visibility changed from hidden to visible, restart interval with correct frequency
                if (wasVisible === false && intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = setInterval(() => {
                        const updateNow = new Date();
                        const updateBaseElapsed = Math.floor((updateNow.getTime() - startTimeRef.current!.getTime()) / 1000);
                        let updateTotalPaused = pausedTime;
                        
                        if (!isRunning && pauseStartRef.current) {
                            const updatePauseDuration = Math.floor(
                                (updateNow.getTime() - pauseStartRef.current.getTime()) / 1000
                            );
                            updateTotalPaused += updatePauseDuration;
                        }
                        
                        setElapsedTime(Math.max(0, updateBaseElapsed - updateTotalPaused));
                        lastUpdateRef.current = updateNow;
                    }, 1000);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isRunning, pausedTime]);

    // Timer interval - always update when we have a start time, even when paused
    useEffect(() => {
        if (startTimeRef.current) {
            const updateTimer = () => {
                const now = new Date();
                const baseElapsed = Math.floor((now.getTime() - startTimeRef.current!.getTime()) / 1000);
                let totalPaused = pausedTime;
                
                // If currently paused, add the current pause duration
                if (!isRunning && pauseStartRef.current) {
                    const currentPauseDuration = Math.floor(
                        (now.getTime() - pauseStartRef.current.getTime()) / 1000
                    );
                    totalPaused += currentPauseDuration;
                }
                
                const elapsed = Math.max(0, baseElapsed - totalPaused);
                setElapsedTime(elapsed);
                lastUpdateRef.current = now;
            };

            // Initial update
            updateTimer();

            // Always update every second when visible, every 5 seconds when hidden
            // This ensures accurate display even when paused
            const interval = isVisibleRef.current ? 1000 : 5000;
            intervalRef.current = setInterval(updateTimer, interval);
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
    }, [isRunning, pausedTime]);

    const pause = () => {
        if (isRunning && startTimeRef.current) {
            const now = new Date();
            pauseStartRef.current = now;
            setIsRunning(false);
            saveToStorage(startTimeRef.current, pausedTime, now, false);
        }
    };

    const resume = () => {
        // Only resume if timer is not running and we have a start time
        if (!isRunning && startTimeRef.current) {
            const now = new Date();
            
            // If pauseStartRef exists, calculate pause duration and add to pausedTime
            if (pauseStartRef.current) {
                const pauseDuration = Math.floor((now.getTime() - pauseStartRef.current.getTime()) / 1000);
                const newPausedTime = pausedTime + pauseDuration;
                setPausedTime(newPausedTime);
                pauseStartRef.current = null;
                setIsRunning(true);
                saveToStorage(startTimeRef.current, newPausedTime, null, true);
            } else {
                // If pauseStartRef doesn't exist but timer is paused,
                // it means we're resuming from a state where pauseStartRef was lost.
                // We can't calculate the exact pause duration, but we can still resume.
                // This handles edge cases where state might have been lost.
                pauseStartRef.current = null;
                setIsRunning(true);
                saveToStorage(startTimeRef.current, pausedTime, null, true);
            }
        }
    };

    const reset = () => {
        setIsRunning(false);
        setElapsedTime(0);
        setPausedTime(0);
        pauseStartRef.current = null;
        startTimeRef.current = null;
        clearStorage(); // This sets the reset flag

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return {
        elapsedTime,
        formattedTime: formatTime(elapsedTime),
        isRunning,
        pause,
        resume,
        reset,
    };
}
