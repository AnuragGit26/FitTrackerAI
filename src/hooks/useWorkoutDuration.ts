import { useState, useEffect, useRef, useCallback } from 'react';

interface UseWorkoutDurationReturn {
    elapsedTime: number; // Total seconds elapsed
    formattedTime: string; // "MM:SS" or "HH:MM:SS" format
    isRunning: boolean;
    pause: () => void;
    resume: () => void;
    reset: () => void;
    start: () => void; // Explicit start function
}

const STORAGE_KEY = 'fittrackai_workout_timer_state';

interface TimerState {
    startTime: string | null; // ISO string
    pausedTime: number; // Total paused time in seconds
    pauseStartTime: string | null; // ISO string when paused
    isRunning: boolean;
    lastUpdateTime: string; // ISO string of last update
}

function loadTimerState(): TimerState | null {
    try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (!stored) return null;
        return JSON.parse(stored);
    } catch (error) {
        console.error('Failed to load timer state:', error);
        return null;
    }
}

function saveTimerState(state: TimerState): void {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error('Failed to save timer state:', error);
    }
}

function clearTimerState(): void {
    try {
        sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('Failed to clear timer state:', error);
    }
}

export function getTimerStartTime(): Date | null {
    const state = loadTimerState();
    if (state && state.startTime) {
        return new Date(state.startTime);
    }
    return null;
}

export function useWorkoutDuration(shouldStart: boolean = false): UseWorkoutDurationReturn {
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<Date | null>(null);
    const pausedTimeRef = useRef<number>(0);
    const pauseStartTimeRef = useRef<Date | null>(null);
    const lastUpdateRef = useRef<Date>(new Date());

    // Load persisted state on mount
    useEffect(() => {
        const persisted = loadTimerState();
        if (persisted && persisted.startTime) {
            const startTime = new Date(persisted.startTime);
            startTimeRef.current = startTime;
            pausedTimeRef.current = persisted.pausedTime || 0;
            setIsRunning(persisted.isRunning);
            
            if (persisted.pauseStartTime) {
                pauseStartTimeRef.current = new Date(persisted.pauseStartTime);
            }

            // Calculate elapsed time
            const now = new Date();
            const baseElapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
            let totalPaused = pausedTimeRef.current;

            if (!persisted.isRunning && pauseStartTimeRef.current) {
                const pauseDuration = Math.floor(
                    (now.getTime() - pauseStartTimeRef.current.getTime()) / 1000
                );
                totalPaused += pauseDuration;
            }

            setElapsedTime(Math.max(0, baseElapsed - totalPaused));
            lastUpdateRef.current = now;
        }
    }, []);

    // Update timer state in sessionStorage on every change
    const updateStorage = useCallback(() => {
        if (startTimeRef.current) {
            const state: TimerState = {
                startTime: startTimeRef.current.toISOString(),
                pausedTime: pausedTimeRef.current,
                pauseStartTime: pauseStartTimeRef.current?.toISOString() || null,
                isRunning: isRunning,
                lastUpdateTime: new Date().toISOString(),
            };
            saveTimerState(state);
        }
    }, [isRunning]);

    // Timer interval - updates every second
    useEffect(() => {
        if (startTimeRef.current && isRunning) {
            const updateTimer = () => {
                const now = new Date();
                const baseElapsed = Math.floor((now.getTime() - startTimeRef.current!.getTime()) / 1000);
                let totalPaused = pausedTimeRef.current;

                if (pauseStartTimeRef.current) {
                    const pauseDuration = Math.floor(
                        (now.getTime() - pauseStartTimeRef.current.getTime()) / 1000
                    );
                    totalPaused += pauseDuration;
                }

                const elapsed = Math.max(0, baseElapsed - totalPaused);
                setElapsedTime(elapsed);
                lastUpdateRef.current = now;
                updateStorage();
            };

            updateTimer();
            intervalRef.current = setInterval(updateTimer, 1000);
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
    }, [isRunning, updateStorage]);

    // Handle shouldStart prop - only start if explicitly requested and not already started
    useEffect(() => {
        if (shouldStart && !startTimeRef.current) {
            const now = new Date();
            startTimeRef.current = now;
            pausedTimeRef.current = 0;
            pauseStartTimeRef.current = null;
            setIsRunning(true);
            setElapsedTime(0);
            updateStorage();
        }
    }, [shouldStart, updateStorage]);

    const start = useCallback(() => {
        if (!startTimeRef.current) {
            const now = new Date();
            startTimeRef.current = now;
            pausedTimeRef.current = 0;
            pauseStartTimeRef.current = null;
            setIsRunning(true);
            setElapsedTime(0);
            updateStorage();
        }
    }, [updateStorage]);

    const pause = useCallback(() => {
        if (isRunning && startTimeRef.current) {
            const now = new Date();
            pauseStartTimeRef.current = now;
            setIsRunning(false);
            updateStorage();
        }
    }, [isRunning, updateStorage]);

    const resume = useCallback(() => {
        if (!isRunning && startTimeRef.current) {
            const now = new Date();
            
            if (pauseStartTimeRef.current) {
                const pauseDuration = Math.floor(
                    (now.getTime() - pauseStartTimeRef.current.getTime()) / 1000
                );
                pausedTimeRef.current += pauseDuration;
            }
            
            pauseStartTimeRef.current = null;
            setIsRunning(true);
            updateStorage();
        }
    }, [isRunning, updateStorage]);

    const reset = useCallback(() => {
        setIsRunning(false);
        setElapsedTime(0);
        pausedTimeRef.current = 0;
        pauseStartTimeRef.current = null;
        startTimeRef.current = null;
        clearTimerState();

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

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
        start,
    };
}
