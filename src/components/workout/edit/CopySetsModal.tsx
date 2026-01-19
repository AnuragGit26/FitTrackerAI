import { useState, useEffect } from 'react';
import { WorkoutSet } from '@/types/exercise';
import { workoutHistoryService, PreviousWorkoutData } from '@/services/workoutHistoryService';
import { useUserStore } from '@/store/userStore';
import { Modal } from '@/components/common/Modal';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/useToast';
import { format } from 'date-fns';

interface CopySetsModalProps {
    isOpen: boolean;
    onClose: () => void;
    exerciseId: string;
    exerciseName: string;
    onCopySets: (sets: WorkoutSet[]) => void;
}

export function CopySetsModal({
    isOpen,
    onClose,
    exerciseId,
    exerciseName,
    onCopySets,
}: CopySetsModalProps) {
    const { profile } = useUserStore();
    const { error: showError } = useToast();
    const [previousWorkout, setPreviousWorkout] = useState<PreviousWorkoutData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedSets, setSelectedSets] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (isOpen && profile?.id && exerciseId) {
            loadPreviousWorkout();
        } else {
            setPreviousWorkout(null);
            setSelectedSets(new Set());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, profile?.id, exerciseId]);

    const loadPreviousWorkout = async () => {
        if (!profile?.id) {
    return;
  }

        setIsLoading(true);
        try {
            const data = await workoutHistoryService.getLastWorkoutForExercise(profile.id, exerciseId);
            setPreviousWorkout(data);
            // Select all completed sets by default
            if (data) {
                const completedSetNumbers = data.sets
                    .filter(s => s.completed)
                    .map(s => s.setNumber);
                setSelectedSets(new Set(completedSetNumbers));
            }
        } catch (error) {
            console.error('Failed to load previous workout:', error);
            showError('Failed to load previous workout');
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleSet = (setNumber: number) => {
        setSelectedSets(prev => {
            const newSet = new Set(prev);
            if (newSet.has(setNumber)) {
                newSet.delete(setNumber);
            } else {
                newSet.add(setNumber);
            }
            return newSet;
        });
    };

    const handleCopy = () => {
        if (!previousWorkout || selectedSets.size === 0) {
    return;
  }

        const setsToCopy = previousWorkout.sets
            .filter(s => selectedSets.has(s.setNumber) && s.completed)
            .map((set, index) => ({
                ...set,
                setNumber: index + 1, // Renumber sets
                completed: false, // Reset completed state
                setDuration: undefined,
                setStartTime: undefined,
                setEndTime: undefined,
            }));

        onCopySets(setsToCopy);
        onClose();
    };

    const completedSets = previousWorkout?.sets.filter(s => s.completed) || [];

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Copy Sets from Previous Workout"
            footer={
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-transparent text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-surface-dark transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCopy}
                        disabled={selectedSets.size === 0}
                        className="flex-1 px-4 py-3 rounded-xl bg-primary hover:bg-[#E67E22] text-black font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                        Copy {selectedSets.size} Set{selectedSets.size !== 1 ? 's' : ''}
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <LoadingSpinner size="md" />
                    </div>
                ) : !previousWorkout || completedSets.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <p>No previous workout found for {exerciseName}</p>
                    </div>
                ) : (
                    <>
                        <div className="bg-gray-50 dark:bg-surface-dark/50 rounded-xl p-4 border border-gray-200 dark:border-border-dark">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                <span className="font-semibold">Last workout:</span>{' '}
                                {format(new Date(previousWorkout.date), 'MMM d, yyyy')}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {completedSets.length} completed set{completedSets.length !== 1 ? 's' : ''}
                            </p>
                        </div>

                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {completedSets.map((set) => {
                                const isSelected = selectedSets.has(set.setNumber);
                                return (
                                    <label
                                        key={set.setNumber}
                                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${isSelected
                                                ? 'border-primary bg-primary/10 dark:bg-primary/20'
                                                : 'border-gray-200 dark:border-border-dark hover:border-gray-300 dark:hover:border-gray-600'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleToggleSet(set.setNumber)}
                                            className="w-5 h-5 text-primary rounded focus:ring-primary"
                                        />
                                        <div className="flex-1">
                                            <div className="font-semibold text-gray-900 dark:text-white">
                                                Set {set.setNumber}
                                            </div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                {set.weight || 0}kg × {set.reps || 0} reps
                                                {set.rpe && ` • RPE ${set.rpe}`}
                                            </div>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}

