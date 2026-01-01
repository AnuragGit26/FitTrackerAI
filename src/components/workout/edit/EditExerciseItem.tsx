import { useState, useEffect } from 'react';
import { WorkoutExercise, WorkoutSet } from '@/types/exercise';
import { EditSetList } from './EditSetList';
import { CopySetsModal } from './CopySetsModal';
import { calculateVolume } from '@/utils/calculations';
import { exerciseLibrary } from '@/services/exerciseLibrary';
import { useToast } from '@/hooks/useToast';
import { getMuscleGroupCategory } from '@/utils/muscleGroupCategories';

interface EditExerciseItemProps {
    exercise: WorkoutExercise;
    index: number;
    onUpdate: (exercise: WorkoutExercise) => void;
    onRemove: () => void;
    onDuplicate?: () => void;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
}

export function EditExerciseItem({ exercise, index, onUpdate, onRemove, onDuplicate, onMoveUp, onMoveDown }: EditExerciseItemProps) {
    const { error: showError } = useToast();
    const [isExpanded, setIsExpanded] = useState(index === 0); // First exercise expanded by default
    const [exerciseName, setExerciseName] = useState(exercise.exerciseName);
    const [exerciseCategory, setExerciseCategory] = useState<string>('');
    const [exerciseType, setExerciseType] = useState<string>('');
    const [showCopySetsModal, setShowCopySetsModal] = useState(false);

    useEffect(() => {
        const loadExerciseInfo = async () => {
            try {
                const exerciseData = await exerciseLibrary.getExerciseById(exercise.exerciseId);
                if (exerciseData) {
                    setExerciseCategory(exerciseData.category);
                    // Get primary muscle category
                    if ((exerciseData.primaryMuscles ?? []).length > 0) {
                        const category = getMuscleGroupCategory(exerciseData.primaryMuscles[0]);
                        setExerciseType(category);
                    }
                }
            } catch (err) {
                console.error('Failed to load exercise info:', err);
            }
        };
        loadExerciseInfo();
    }, [exercise.exerciseId]);

    const handleSetsChange = async (sets: typeof exercise.sets) => {
        try {
            // Get exercise tracking type
            const exerciseData = await exerciseLibrary.getExerciseById(exercise.exerciseId);
            const trackingType = exerciseData?.trackingType;

            // Recalculate volume
            const totalVolume = calculateVolume(sets, trackingType);

            // Update exercise
            onUpdate({
                ...exercise,
                sets,
                totalVolume,
            });
        } catch (err) {
            console.error('Failed to update sets:', err);
            showError('Failed to update sets');
        }
    };

    const handleCopySets = (copiedSets: WorkoutSet[]) => {
        const newSets = [...exercise.sets, ...copiedSets].map((set, index) => ({
            ...set,
            setNumber: index + 1,
        }));
        handleSetsChange(newSets);
    };

    const handleNameChange = (newName: string) => {
        setExerciseName(newName);
        onUpdate({
            ...exercise,
            exerciseName: newName,
        });
    };

    // Get set summary for collapsed view
    const getSetSummary = () => {
        if (exercise.sets.length === 0) return '';
        const firstSet = exercise.sets[0];
        if (firstSet.weight && firstSet.reps) {
            const reps = exercise.sets.map(s => s.reps).filter(Boolean);
            const minReps = Math.min(...reps as number[]);
            const maxReps = Math.max(...reps as number[]);
            if (minReps === maxReps) {
                return `${minReps} Reps`;
            }
            return `${minReps}-${maxReps} Reps`;
        }
        return `${exercise.sets.length} Sets`;
    };

    return (
        <div className="bg-white dark:bg-[#1A3324] rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden group">
            {/* Card Header */}
            <div
                className="p-4 flex items-center gap-3 border-b border-slate-100 dark:border-white/5 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex flex-col gap-1">
                    {onMoveUp && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onMoveUp();
                            }}
                            className="text-slate-400 hover:text-primary transition-colors p-0.5"
                            title="Move up"
                        >
                            <span className="material-symbols-outlined text-sm">arrow_upward</span>
                        </button>
                    )}
                    {onMoveDown && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onMoveDown();
                            }}
                            className="text-slate-400 hover:text-primary transition-colors p-0.5"
                            title="Move down"
                        >
                            <span className="material-symbols-outlined text-sm">arrow_downward</span>
                        </button>
                    )}
                    {!onMoveUp && !onMoveDown && (
                        <div className="text-slate-400 dark:text-slate-500">
                            <span className="material-symbols-outlined text-sm">drag_indicator</span>
                        </div>
                    )}
                </div>
                <div className="flex-1">
                    <input
                        type="text"
                        value={exerciseName}
                        onChange={(e) => handleNameChange(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-transparent border-none p-0 font-bold text-lg leading-tight text-slate-900 dark:text-white focus:outline-none focus:ring-0"
                    />
                    {!isExpanded && (
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 dark:text-[#90cba8]">
                            <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">fitness_center</span>
                                {exercise.sets.length} Set{exercise.sets.length !== 1 ? 's' : ''}
                            </span>
                            {getSetSummary() && (
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                                    {getSetSummary()}
                                </span>
                            )}
                        </div>
                    )}
                    {isExpanded && exerciseType && (
                        <p className="text-xs text-slate-500 dark:text-[#90cba8] mt-0.5">
                            {exerciseType} • {exerciseCategory === 'strength' ? 'Compound' : exerciseCategory}
                        </p>
                    )}
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(!isExpanded);
                    }}
                    className="text-slate-400 hover:text-white transition-colors p-2"
                >
                    <span className={`material-symbols-outlined transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        expand_more
                    </span>
                </button>
                {onDuplicate && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDuplicate();
                        }}
                        className="text-slate-400 hover:text-primary transition-colors p-2"
                        title="Duplicate exercise"
                    >
                        <span className="material-symbols-outlined">content_copy</span>
                    </button>
                )}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="text-slate-400 hover:text-red-500 transition-colors p-2 -mr-2"
                    title="Remove exercise"
                >
                    <span className="material-symbols-outlined">delete</span>
                </button>
            </div>

            {/* Card Body (Sets) */}
            {isExpanded && (
                <div className="p-4 bg-slate-50 dark:bg-black/20">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Sets</h4>
                        <button
                            onClick={() => setShowCopySetsModal(true)}
                            className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-sm">content_copy</span>
                            Copy from Previous
                        </button>
                    </div>
                    <EditSetList
                        sets={exercise.sets}
                        onSetsChange={handleSetsChange}
                    />
                </div>
            )}

            <CopySetsModal
                isOpen={showCopySetsModal}
                onClose={() => setShowCopySetsModal(false)}
                exerciseId={exercise.exerciseId}
                exerciseName={exercise.exerciseName}
                onCopySets={handleCopySets}
            />
        </div>
    );
}

