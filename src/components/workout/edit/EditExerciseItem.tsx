import { useState, useEffect } from 'react';
import { WorkoutExercise } from '@/types/exercise';
import { EditSetList } from './EditSetList';
import { calculateVolume } from '@/utils/calculations';
import { exerciseLibrary } from '@/services/exerciseLibrary';
import { useToast } from '@/hooks/useToast';
import { getMuscleGroupCategory } from '@/utils/muscleGroupCategories';

interface EditExerciseItemProps {
    exercise: WorkoutExercise;
    index: number;
    onUpdate: (exercise: WorkoutExercise) => void;
    onRemove: () => void;
}

export function EditExerciseItem({ exercise, index, onUpdate, onRemove }: EditExerciseItemProps) {
    const { error: showError } = useToast();
    const [isExpanded, setIsExpanded] = useState(index === 0); // First exercise expanded by default
    const [exerciseName, setExerciseName] = useState(exercise.exerciseName);
    const [exerciseCategory, setExerciseCategory] = useState<string>('');
    const [exerciseType, setExerciseType] = useState<string>('');

    useEffect(() => {
        const loadExerciseInfo = async () => {
            try {
                const exerciseData = await exerciseLibrary.getExerciseById(exercise.exerciseId);
                if (exerciseData) {
                    setExerciseCategory(exerciseData.category);
                    // Get primary muscle category
                    if (exerciseData.primaryMuscles.length > 0) {
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
                <div className="cursor-grab active:cursor-grabbing text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                    <span className="material-symbols-outlined">drag_indicator</span>
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
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="text-slate-400 hover:text-red-500 transition-colors p-2 -mr-2"
                >
                    <span className="material-symbols-outlined">delete</span>
                </button>
            </div>

            {/* Card Body (Sets) */}
            {isExpanded && (
                <div className="p-4 bg-slate-50 dark:bg-black/20">
                    <EditSetList
                        sets={exercise.sets}
                        onSetsChange={handleSetsChange}
                    />
                </div>
            )}
        </div>
    );
}

