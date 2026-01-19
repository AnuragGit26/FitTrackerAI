import { useState, useEffect, useRef } from 'react';
import { CheckCircle, ArrowRight, Activity, Timer, Repeat, Flame, Footprints, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { WorkoutSet } from '@/types/exercise';
import { cn } from '@/utils/cn';
import { prefersReducedMotion } from '@/utils/animations';
import { estimateCaloriesFromSteps } from '@/utils/calculations';

interface CardioRepsSetCardProps {
    setNumber: number;
    set: WorkoutSet;
    onUpdate: (updates: Partial<WorkoutSet>) => void;
    onLogSet: () => void;
    onAddSet?: () => void;
    onCancelSet?: () => void;
    disabled?: boolean;
    nextExerciseName?: string;
    isLastInSuperset?: boolean;
    showGroupRestMessage?: boolean;
}

export function CardioRepsSetCard({
    setNumber,
    set,
    onUpdate,
    onLogSet,
    onAddSet,
    onCancelSet,
    disabled = false,
    nextExerciseName,
    isLastInSuperset = false,
    showGroupRestMessage = false,
}: CardioRepsSetCardProps) {
    const [reps, setReps] = useState(() => (set.reps !== undefined ? set.reps.toString() : ''));
    const [durationMinutes, setDurationMinutes] = useState(() => {
        if (set.duration !== undefined && set.duration > 0) {
            return Math.floor(set.duration / 60).toString();
        }
        return '';
    });
    const [durationSeconds, setDurationSeconds] = useState(() => {
        if (set.duration !== undefined && set.duration > 0) {
            return (set.duration % 60).toString().padStart(2, '0');
        }
        return '';
    });
    const [heartRate, setHeartRate] = useState(() => (set.heartRate || '').toString());
    const [calories, setCalories] = useState(() => (set.calories || '').toString());
    const [steps, setSteps] = useState(() => (set.steps || '').toString());
    const [isNewSet, setIsNewSet] = useState(false);
    const [showButtonAnimation, setShowButtonAnimation] = useState(false);
    const [showParticles, setShowParticles] = useState(false);
    const [isLogging, setIsLogging] = useState(false);
    const [showRipple, setShowRipple] = useState(false);
    const [focusedInput, setFocusedInput] = useState<string | null>(null);
    const [hasValidData, setHasValidData] = useState(false);
    const previousSetNumberRef = useRef(setNumber);
    const repsInputRef = useRef<HTMLInputElement>(null);
    const durationMinutesInputRef = useRef<HTMLInputElement>(null);
    const durationSecondsInputRef = useRef<HTMLInputElement>(null);
    const heartRateInputRef = useRef<HTMLInputElement>(null);
    const caloriesInputRef = useRef<HTMLInputElement>(null);
    const stepsInputRef = useRef<HTMLInputElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    // Calculate total duration in seconds
    const minutesNum = durationMinutes ? parseInt(durationMinutes) : 0;
    const secondsNum = durationSeconds ? parseInt(durationSeconds) : 0;
    const totalDurationSeconds = minutesNum * 60 + secondsNum;
    const repsNum = reps ? parseInt(reps) : 0;

    // Update hasValidData when inputs change - need at least reps OR duration
    useEffect(() => {
        setHasValidData(repsNum > 0 || totalDurationSeconds > 0);
    }, [repsNum, totalDurationSeconds]);

    // Scroll input into view when focused (for mobile keyboard)
    useEffect(() => {
        const scrollToInput = (input: HTMLInputElement) => {
            let scrollContainer: HTMLElement | null = input.closest('main');

            if (!scrollContainer) {
                scrollContainer = document.documentElement;
            }

            const inputRect = input.getBoundingClientRect();
            const containerRect = scrollContainer.getBoundingClientRect();

            const keyboardHeight = 300;
            const visibleHeight = window.innerHeight - keyboardHeight;
            const inputBottom = inputRect.bottom;
            const inputTop = inputRect.top;

            if (inputBottom > visibleHeight || inputTop < 0) {
                const scrollTop = scrollContainer.scrollTop || window.pageYOffset;
                const inputOffsetTop = inputRect.top + scrollTop - containerRect.top;
                const targetScroll = inputOffsetTop - (visibleHeight / 2) + (inputRect.height / 2) + 50;

                scrollContainer.scrollTo({
                    top: Math.max(0, targetScroll),
                    behavior: 'smooth',
                });
            }
        };

        const handleFocus = (e: FocusEvent) => {
            const target = e.target as HTMLInputElement;
            if (target) {
                setTimeout(() => {
                    scrollToInput(target);
                }, 400);
            }
        };

        const inputs = [
            repsInputRef.current,
            durationMinutesInputRef.current,
            durationSecondsInputRef.current,
            heartRateInputRef.current,
            caloriesInputRef.current,
            stepsInputRef.current,
        ].filter(Boolean) as HTMLInputElement[];

        inputs.forEach((input) => {
            input.addEventListener('focus', handleFocus);
        });

        return () => {
            inputs.forEach((input) => {
                input.removeEventListener('focus', handleFocus);
            });
        };
    }, []);

    // Sync local state with prop changes
    useEffect(() => {
        if (setNumber !== previousSetNumberRef.current) {
            setIsNewSet(true);
            setShowButtonAnimation(true);
            setShowParticles(true);
            previousSetNumberRef.current = setNumber;
            setTimeout(() => {
                setIsNewSet(false);
                setShowButtonAnimation(false);
                setShowParticles(false);
            }, 1200);
        }

        if (set.reps !== undefined) {
            const propReps = set.reps.toString();
            if (reps !== propReps) {
                setReps(propReps);
            }
        } else if (reps !== '') {
            setReps('');
        }

        if (set.duration !== undefined) {
            const totalSeconds = set.duration;
            const propMinutes = Math.floor(totalSeconds / 60).toString();
            const propSeconds = (totalSeconds % 60).toString().padStart(2, '0');
            if (durationMinutes !== propMinutes || durationSeconds !== propSeconds) {
                setDurationMinutes(propMinutes);
                setDurationSeconds(propSeconds);
            }
        } else if (durationMinutes !== '' || durationSeconds !== '') {
            setDurationMinutes('');
            setDurationSeconds('');
        }

        if (set.heartRate !== undefined) {
            setHeartRate(set.heartRate.toString());
        }
        if (set.calories !== undefined) {
            setCalories(set.calories.toString());
        }
        if (set.steps !== undefined) {
            setSteps(set.steps.toString());
        }
    }, [set.reps, set.duration, set.heartRate, set.calories, set.steps, setNumber, reps, durationMinutes, durationSeconds]);

    const shouldReduceMotion = prefersReducedMotion();

    const handleRepsChange = (value: string) => {
        setReps(value);
        if (value === '' || value === '-') {
            onUpdate({ reps: undefined });
        } else {
            const numValue = parseInt(value);
            if (!isNaN(numValue) && numValue >= 0) {
                onUpdate({ reps: numValue });
            }
        }
    };

    const handleDurationChange = (minutes: string, seconds: string) => {
        setDurationMinutes(minutes);
        setDurationSeconds(seconds);
        const minutesNum = minutes === '' ? 0 : (parseInt(minutes) || 0);
        const secondsNum = seconds === '' ? 0 : (parseInt(seconds) || 0);
        const totalSeconds = minutesNum * 60 + secondsNum;

        if (minutes === '' && seconds === '') {
            onUpdate({ duration: undefined });
        } else {
            onUpdate({ duration: totalSeconds });
        }
    };

    const handleHeartRateChange = (value: string) => {
        setHeartRate(value);
        const numValue = parseInt(value) || undefined;
        onUpdate({ heartRate: numValue });
    };

    const handleCaloriesChange = (value: string) => {
        setCalories(value);
        const numValue = parseInt(value) || undefined;
        onUpdate({ calories: numValue });
    };

    const handleStepsChange = (value: string) => {
        setSteps(value);
        const numValue = parseInt(value) || undefined;
        onUpdate({ steps: numValue });
        // Auto-estimate calories from steps if calories not set
        if (numValue && !calories) {
            const estimatedCalories = estimateCaloriesFromSteps(numValue);
            if (estimatedCalories > 0) {
                setCalories(estimatedCalories.toString());
                onUpdate({ steps: numValue, calories: estimatedCalories });
            }
        }
    };

    const canLogSet = repsNum > 0 || totalDurationSeconds > 0;

    const handleLogSetClick = () => {
        if (!canLogSet || disabled) {
    return;
  }

        setIsLogging(true);
        setShowRipple(true);
        setShowParticles(true);

        onLogSet();

        setTimeout(() => {
            setIsLogging(false);
            setShowRipple(false);
            setShowParticles(false);
        }, 1200);
    };

    return (
        <motion.div
            ref={cardRef}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            className="relative mt-2 flex flex-col rounded-2xl bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 dark:from-purple-950/30 dark:via-pink-950/30 dark:to-purple-900/30 p-1 shadow-xl border-2 border-purple-200/50 dark:border-purple-800/50 overflow-hidden backdrop-blur-sm"
        >
            {/* Animated background gradient */}
            {!shouldReduceMotion && (
                <motion.div
                    className="absolute inset-0 opacity-30 dark:opacity-20"
                    animate={{
                        background: [
                            'radial-gradient(circle at 20% 50%, rgba(168, 85, 247, 0.1) 0%, transparent 50%)',
                            'radial-gradient(circle at 80% 50%, rgba(236, 72, 153, 0.1) 0%, transparent 50%)',
                            'radial-gradient(circle at 20% 50%, rgba(168, 85, 247, 0.1) 0%, transparent 50%)',
                        ],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
            )}

            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2 relative z-10">
                {/* Cancel Button */}
                {onCancelSet && !disabled && (
                    <motion.button
                        onClick={onCancelSet}
                        className="absolute top-2 right-2 z-20 p-2 rounded-full text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        aria-label={`Cancel set ${setNumber}`}
                        whileHover={!shouldReduceMotion ? { scale: 1.1 } : {}}
                        whileTap={!shouldReduceMotion ? { scale: 0.9 } : {}}
                    >
                        <X className="w-5 h-5" />
                    </motion.button>
                )}

                {showParticles && !shouldReduceMotion && (
                    <>
                        {[...Array(12)].map((_, i) => {
                            const angle = (i * 360) / 12;
                            const radius = 50;
                            const x = Math.cos((angle * Math.PI) / 180) * radius;
                            const y = Math.sin((angle * Math.PI) / 180) * radius;
                            return (
                                <motion.div
                                    key={`sparkle-${i}`}
                                    className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-400"
                                    style={{ left: '50%', top: '50%', x: 0, y: 0 }}
                                    initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
                                    animate={{
                                        scale: [0, 1.8, 0],
                                        opacity: [0, 1, 0],
                                        x: [0, x, x * 1.8],
                                        y: [0, y, y * 1.8],
                                        rotate: [0, 180, 360],
                                    }}
                                    transition={{
                                        duration: 1.2,
                                        times: [0, 0.5, 1],
                                        ease: 'easeOut',
                                        delay: i * 0.03,
                                    }}
                                />
                            );
                        })}
                    </>
                )}

                <motion.h2
                    key={setNumber}
                    className="text-purple-900 dark:text-purple-100 tracking-tight text-xl font-bold relative z-10 flex items-center gap-2"
                    initial={false}
                    animate={isNewSet && !shouldReduceMotion ? {
                        scale: [1, 0.8, 1.3, 0.95, 1.02, 1],
                        opacity: [1, 0.4, 1, 1, 1, 1],
                    } : {}}
                    transition={isNewSet && !shouldReduceMotion ? {
                        duration: 1.0,
                        times: [0, 0.2, 0.4, 0.6, 0.8, 1],
                        ease: [0.34, 1.56, 0.64, 1],
                    } : {}}
                >
                    <motion.div
                        animate={hasValidData && !shouldReduceMotion ? {
                            scale: [1, 1.2, 1],
                            rotate: [0, 10, -10, 0],
                        } : {}}
                        transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            repeatDelay: 2,
                        }}
                    >
                        <Activity className="w-5 h-5" />
                    </motion.div>
                    SET {setNumber}
                </motion.h2>
            </div>

            {/* Main Inputs */}
            <div className="px-4 py-3 space-y-4 relative z-10">
                {/* Reps Input */}
                <motion.label
                    className="flex flex-col"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                >
                    <div className="flex items-center gap-2 pb-2">
                        <motion.div
                            animate={repsNum > 0 && !shouldReduceMotion ? {
                                scale: [1, 1.2, 1],
                                rotate: [0, 5, -5, 0],
                            } : {}}
                            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
                        >
                            <Repeat className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </motion.div>
                        <span className="text-purple-700 dark:text-purple-300 text-xs font-medium uppercase tracking-wide">
                            Reps
                        </span>
                    </div>
                    <motion.div
                        className="relative"
                        animate={focusedInput === 'reps' && !shouldReduceMotion ? {
                            scale: 1.02,
                        } : {}}
                        transition={{ duration: 0.2 }}
                    >
                        <input
                            ref={repsInputRef}
                            type="number"
                            inputMode="numeric"
                            value={reps}
                            onChange={(e) => handleRepsChange(e.target.value)}
                            onFocus={() => {
                                setFocusedInput('reps');
                            }}
                            onBlur={() => setFocusedInput(null)}
                            disabled={disabled}
                            placeholder="0"
                            className={cn(
                                "w-full rounded-xl bg-white dark:bg-purple-950/50 border-2 text-center text-2xl sm:text-3xl font-bold text-purple-900 dark:text-purple-100 h-20 focus:ring-0 transition-all placeholder:text-purple-300 dark:placeholder:text-purple-600",
                                focusedInput === 'reps'
                                    ? 'border-purple-500 dark:border-purple-400 shadow-lg shadow-purple-500/20'
                                    : 'border-purple-200 dark:border-purple-800'
                            )}
                        />
                        {focusedInput === 'reps' && !shouldReduceMotion && (
                            <motion.div
                                className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 pointer-events-none"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            />
                        )}
                    </motion.div>
                </motion.label>

                {/* Duration Input (Optional) */}
                <motion.label
                    className="flex flex-col"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                >
                    <div className="flex items-center gap-2 pb-2">
                        <motion.div
                            animate={totalDurationSeconds > 0 && !shouldReduceMotion ? {
                                scale: [1, 1.2, 1],
                                rotate: [0, -5, 5, 0],
                            } : {}}
                            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
                        >
                            <Timer className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                        </motion.div>
                        <span className="text-purple-700 dark:text-purple-300 text-xs font-medium uppercase tracking-wide">
                            Duration (Optional)
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <motion.div
                            className="flex-1 min-w-0 relative"
                            animate={focusedInput === 'durationMinutes' && !shouldReduceMotion ? {
                                scale: 1.02,
                            } : {}}
                            transition={{ duration: 0.2 }}
                        >
                            <input
                                ref={durationMinutesInputRef}
                                type="number"
                                inputMode="numeric"
                                min="0"
                                max="59"
                                value={durationMinutes}
                                onChange={(e) => {
                                    const mins = e.target.value;
                                    if (mins === '' || (!isNaN(parseInt(mins)) && parseInt(mins) >= 0 && parseInt(mins) <= 59)) {
                                        handleDurationChange(mins, durationSeconds);
                                    }
                                }}
                                onFocus={() => {
                                    setFocusedInput('durationMinutes');
                                }}
                                onBlur={() => setFocusedInput(null)}
                                disabled={disabled}
                                placeholder="00"
                                className={cn(
                                    "flex-1 min-w-0 rounded-xl bg-white dark:bg-purple-950/50 border-2 text-center text-2xl font-bold text-purple-900 dark:text-purple-100 h-16 focus:ring-0 transition-all w-full",
                                    focusedInput === 'durationMinutes'
                                        ? 'border-purple-500 dark:border-purple-400 shadow-lg shadow-purple-500/20'
                                        : 'border-purple-200 dark:border-purple-800'
                                )}
                            />
                        </motion.div>
                        <motion.span
                            className="text-purple-600 dark:text-purple-400 font-bold text-xl shrink-0"
                            animate={totalDurationSeconds > 0 && !shouldReduceMotion ? {
                                opacity: [1, 0.5, 1],
                            } : {}}
                            transition={{ duration: 1, repeat: Infinity }}
                        >
                            :
                        </motion.span>
                        <motion.div
                            className="flex-1 min-w-0 relative"
                            animate={focusedInput === 'durationSeconds' && !shouldReduceMotion ? {
                                scale: 1.02,
                            } : {}}
                            transition={{ duration: 0.2 }}
                        >
                            <input
                                ref={durationSecondsInputRef}
                                type="number"
                                inputMode="numeric"
                                min="0"
                                max="59"
                                value={durationSeconds}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === '') {
                                        handleDurationChange(durationMinutes, '');
                                    } else {
                                        const secs = value.padStart(2, '0');
                                        if (!isNaN(parseInt(secs)) && parseInt(secs) >= 0 && parseInt(secs) <= 59) {
                                            handleDurationChange(durationMinutes, secs);
                                        }
                                    }
                                }}
                                onFocus={() => {
                                    setFocusedInput('durationSeconds');
                                }}
                                onBlur={() => setFocusedInput(null)}
                                disabled={disabled}
                                placeholder="00"
                                className={cn(
                                    "flex-1 min-w-0 rounded-xl bg-white dark:bg-purple-950/50 border-2 text-center text-2xl font-bold text-purple-900 dark:text-purple-100 h-16 focus:ring-0 transition-all w-full",
                                    focusedInput === 'durationSeconds'
                                        ? 'border-purple-500 dark:border-purple-400 shadow-lg shadow-purple-500/20'
                                        : 'border-purple-200 dark:border-purple-800'
                                )}
                            />
                        </motion.div>
                        <span className="text-purple-600 dark:text-purple-400 text-xs font-medium shrink-0 hidden sm:inline">(MM:SS)</span>
                    </div>
                    <span className="text-purple-600 dark:text-purple-400 text-xs font-medium mt-1 sm:hidden">(MM:SS)</span>
                </motion.label>

                {/* Optional Fields Row */}
                <motion.div
                    className="grid grid-cols-3 gap-2 min-w-0"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                >
                    {/* Heart Rate */}
                    <motion.label
                        className="flex flex-col min-w-0"
                        whileHover={!disabled && !shouldReduceMotion ? { scale: 1.02 } : {}}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="flex items-center gap-1 pb-1">
                            <motion.div
                                animate={heartRate && parseInt(heartRate) > 0 && !shouldReduceMotion ? {
                                    scale: [1, 1.3, 1],
                                } : {}}
                                transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
                            >
                                <Activity className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
                            </motion.div>
                            <span className="text-purple-600 dark:text-purple-400 text-[10px] font-medium uppercase truncate">
                                HR (BPM)
                            </span>
                        </div>
                        <input
                            ref={heartRateInputRef}
                            type="number"
                            inputMode="numeric"
                            min="0"
                            max="250"
                            value={heartRate}
                            onChange={(e) => handleHeartRateChange(e.target.value)}
                            onFocus={() => {
                                setFocusedInput('heartRate');
                            }}
                            onBlur={() => setFocusedInput(null)}
                            disabled={disabled}
                            placeholder="--"
                            className={cn(
                                "w-full rounded-lg bg-white dark:bg-purple-950/50 border text-center text-base sm:text-lg font-semibold text-purple-900 dark:text-purple-100 h-12 focus:ring-0 transition-all min-w-0",
                                focusedInput === 'heartRate'
                                    ? 'border-purple-500 dark:border-purple-400 shadow-md shadow-purple-500/20'
                                    : 'border-purple-200 dark:border-purple-800'
                            )}
                        />
                    </motion.label>

                    {/* Calories */}
                    <motion.label
                        className="flex flex-col min-w-0"
                        whileHover={!disabled && !shouldReduceMotion ? { scale: 1.02 } : {}}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="flex items-center gap-1 pb-1">
                            <motion.div
                                animate={calories && parseInt(calories) > 0 && !shouldReduceMotion ? {
                                    scale: [1, 1.3, 1],
                                    rotate: [0, 15, -15, 0],
                                } : {}}
                                transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
                            >
                                <Flame className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
                            </motion.div>
                            <span className="text-purple-600 dark:text-purple-400 text-[10px] font-medium uppercase truncate">
                                Calories
                            </span>
                        </div>
                        <input
                            ref={caloriesInputRef}
                            type="number"
                            inputMode="numeric"
                            min="0"
                            value={calories}
                            onChange={(e) => handleCaloriesChange(e.target.value)}
                            onFocus={() => {
                                setFocusedInput('calories');
                            }}
                            onBlur={() => setFocusedInput(null)}
                            disabled={disabled}
                            placeholder="--"
                            className={cn(
                                "w-full rounded-lg bg-white dark:bg-purple-950/50 border text-center text-base sm:text-lg font-semibold text-purple-900 dark:text-purple-100 h-12 focus:ring-0 transition-all min-w-0",
                                focusedInput === 'calories'
                                    ? 'border-purple-500 dark:border-purple-400 shadow-md shadow-purple-500/20'
                                    : 'border-purple-200 dark:border-purple-800'
                            )}
                        />
                    </motion.label>

                    {/* Steps */}
                    <motion.label
                        className="flex flex-col min-w-0"
                        whileHover={!disabled && !shouldReduceMotion ? { scale: 1.02 } : {}}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="flex items-center gap-1 pb-1">
                            <motion.div
                                animate={steps && parseInt(steps) > 0 && !shouldReduceMotion ? {
                                    y: [0, -3, 0],
                                } : {}}
                                transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
                            >
                                <Footprints className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
                            </motion.div>
                            <span className="text-purple-600 dark:text-purple-400 text-[10px] font-medium uppercase truncate">
                                Steps
                            </span>
                        </div>
                        <input
                            ref={stepsInputRef}
                            type="number"
                            inputMode="numeric"
                            min="0"
                            value={steps}
                            onChange={(e) => handleStepsChange(e.target.value)}
                            onFocus={() => {
                                setFocusedInput('steps');
                            }}
                            onBlur={() => setFocusedInput(null)}
                            disabled={disabled}
                            placeholder="--"
                            className={cn(
                                "w-full rounded-lg bg-white dark:bg-purple-950/50 border text-center text-base sm:text-lg font-semibold text-purple-900 dark:text-purple-100 h-12 focus:ring-0 transition-all min-w-0",
                                focusedInput === 'steps'
                                    ? 'border-purple-500 dark:border-purple-400 shadow-md shadow-purple-500/20'
                                    : 'border-purple-200 dark:border-purple-800'
                            )}
                        />
                    </motion.label>
                </motion.div>
            </div>

            {/* Log Button */}
            <div
                className="px-4 py-4 pb-8 relative overflow-hidden"
                style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px) + 2rem)' }}
            >
                {/* Celebration Particle Effects */}
                {showParticles && !shouldReduceMotion && (
                    <>
                        {[...Array(12)].map((_, i) => {
                            const angle = (i * 360) / 12;
                            const radius = 60;
                            const x = Math.cos((angle * Math.PI) / 180) * radius;
                            const y = Math.sin((angle * Math.PI) / 180) * radius;
                            return (
                                <motion.div
                                    key={`celebration-particle-${i}`}
                                    className="absolute w-2 h-2 rounded-full bg-purple-500"
                                    style={{ left: '50%', top: '50%', x: 0, y: 0 }}
                                    initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
                                    animate={isLogging ? {
                                        scale: [0, 1.8, 0],
                                        opacity: [0, 1, 0],
                                        x: [0, x, x * 1.5],
                                        y: [0, y, y * 1.5],
                                        rotate: [0, 180, 360],
                                    } : {}}
                                    transition={{
                                        duration: 1.2,
                                        times: [0, 0.5, 1],
                                        ease: 'easeOut',
                                        delay: i * 0.03,
                                    }}
                                />
                            );
                        })}
                    </>
                )}

                {/* Ripple Effect */}
                {showRipple && !shouldReduceMotion && (
                    <motion.div
                        className="absolute inset-0 rounded-xl bg-purple-500/30"
                        initial={{ scale: 0, opacity: 0.8 }}
                        animate={{
                            scale: [0, 2, 3],
                            opacity: [0.8, 0.4, 0],
                        }}
                        transition={{
                            duration: 0.6,
                            times: [0, 0.5, 1],
                            ease: 'easeOut',
                        }}
                        style={{ left: '50%', top: '50%', x: '-50%', y: '-50%' }}
                    />
                )}

                <motion.button
                    key={`button-${setNumber}`}
                    onClick={handleLogSetClick}
                    disabled={!canLogSet || disabled}
                    className={cn(
                        'flex w-full items-center justify-center gap-2 rounded-xl h-14 shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all relative z-10 overflow-hidden',
                        canLogSet && !disabled
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
                            : 'bg-white dark:bg-surface-dark-light text-slate-500 cursor-not-allowed'
                    )}
                    initial={false}
                    animate={(showButtonAnimation || isLogging) && !shouldReduceMotion ? {
                        scale: [1, 0.85, 1.12, 1.02, 1],
                        opacity: [1, 0.6, 1, 1, 1],
                        y: [0, 12, -6, 2, 0],
                    } : {}}
                    transition={(showButtonAnimation || isLogging) && !shouldReduceMotion ? {
                        duration: 1.0,
                        times: [0, 0.2, 0.5, 0.8, 1],
                        ease: [0.34, 1.56, 0.64, 1],
                        delay: isLogging ? 0 : 0.25,
                    } : {}}
                    whileHover={canLogSet && !disabled && !shouldReduceMotion && !isLogging ? {
                        scale: 1.02,
                        boxShadow: '0 0 30px rgba(168, 85, 247, 0.4)',
                    } : {}}
                    whileTap={canLogSet && !disabled && !shouldReduceMotion ? { scale: 0.98 } : {}}
                >
                    {canLogSet && !disabled && !shouldReduceMotion && (
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                            animate={{
                                x: ['-100%', '100%'],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: 'linear',
                            }}
                        />
                    )}
                    {nextExerciseName && !isLastInSuperset ? (
                        <>
                            <motion.span
                                className="text-lg font-bold tracking-wide uppercase relative z-10"
                                animate={!shouldReduceMotion ? {
                                    x: [0, 2, 0],
                                } : {}}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            >
                                Next: {nextExerciseName}
                            </motion.span>
                            <motion.div
                                animate={!shouldReduceMotion ? {
                                    x: [0, 4, 0],
                                } : {}}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            >
                                <ArrowRight className="w-6 h-6 font-bold relative z-10" />
                            </motion.div>
                        </>
                    ) : (
                        <>
                            <motion.div
                                animate={(showButtonAnimation || isLogging) && !shouldReduceMotion ? {
                                    scale: [1, 1.5, 1.2, 1],
                                    rotate: [0, 25, -10, 0],
                                } : canLogSet && !shouldReduceMotion ? {
                                    scale: [1, 1.2, 1],
                                    rotate: [0, 10, -10, 0],
                                } : {}}
                                transition={(showButtonAnimation || isLogging) && !shouldReduceMotion ? {
                                    duration: 1.0,
                                    times: [0, 0.3, 0.7, 1],
                                    delay: isLogging ? 0 : 0,
                                    ease: [0.34, 1.56, 0.64, 1],
                                } : canLogSet && !shouldReduceMotion ? {
                                    duration: 0.6,
                                    repeat: Infinity,
                                    repeatDelay: 2,
                                } : {}}
                            >
                                <CheckCircle className="w-6 h-6 font-bold relative z-10" />
                            </motion.div>
                            <motion.span
                                className="text-lg font-bold tracking-wide uppercase relative z-10"
                                animate={(showButtonAnimation || isLogging) && !shouldReduceMotion ? {
                                    scale: [1, 1.15, 1.05, 1],
                                    x: [0, 2, 0, 0],
                                } : canLogSet && !shouldReduceMotion ? {
                                    opacity: [1, 0.8, 1],
                                } : {}}
                                transition={(showButtonAnimation || isLogging) && !shouldReduceMotion ? {
                                    duration: 1.0,
                                    times: [0, 0.3, 0.7, 1],
                                    delay: isLogging ? 0 : 0,
                                    ease: [0.34, 1.56, 0.64, 1],
                                } : canLogSet && !shouldReduceMotion ? {
                                    duration: 1.5,
                                    repeat: Infinity,
                                } : {}}
                            >
                                Log Set
                            </motion.span>
                        </>
                    )}
                </motion.button>
                {showGroupRestMessage && nextExerciseName && (
                    <p className="text-center text-[10px] text-purple-600 dark:text-purple-400 mt-2">
                        Logging will start group rest timer
                    </p>
                )}
                {onAddSet && (
                    <motion.button
                        onClick={onAddSet}
                        disabled={disabled}
                        className={cn(
                            'flex w-full items-center justify-center gap-2 rounded-xl h-12 mt-3 border-2 transition-all relative overflow-hidden',
                            !disabled
                                ? 'border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                : 'border-gray-100 dark:border-border-dark bg-gray-100 dark:bg-surface-dark text-gray-400 cursor-not-allowed'
                        )}
                        initial={false}
                        animate={isNewSet && !shouldReduceMotion ? {
                            scale: [1, 1.05, 1],
                            y: [0, -2, 0],
                        } : {}}
                        transition={isNewSet && !shouldReduceMotion ? {
                            duration: 0.5,
                            times: [0, 0.5, 1],
                            ease: 'easeOut',
                        } : {}}
                        whileHover={!disabled && !shouldReduceMotion ? {
                            scale: 1.02,
                            borderColor: 'rgba(168, 85, 247, 0.5)',
                        } : {}}
                        whileTap={!disabled && !shouldReduceMotion ? { scale: 0.98 } : {}}
                    >
                        {!disabled && !shouldReduceMotion && (
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10"
                                animate={{
                                    x: ['-100%', '100%'],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: 'linear',
                                }}
                            />
                        )}
                        <motion.span
                            className="text-sm font-semibold tracking-wide relative z-10"
                            animate={isNewSet && !shouldReduceMotion ? {
                                scale: [1, 1.1, 1],
                            } : {}}
                            transition={isNewSet && !shouldReduceMotion ? {
                                duration: 0.5,
                                times: [0, 0.5, 1],
                            } : {}}
                        >
                            Add Set
                        </motion.span>
                    </motion.button>
                )}
            </div>
        </motion.div>
    );
}

