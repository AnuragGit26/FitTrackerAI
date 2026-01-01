import { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Trash2, Dumbbell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '@/components/common/Modal';
import { useTemplateStore } from '@/store/templateStore';
import { useUserStore } from '@/store/userStore';
import { usePlannedWorkoutStore } from '@/store/plannedWorkoutStore';
import { TemplateCategory, PlannedExercise } from '@/types/workout';
import { TemplateListCard } from '@/components/template/TemplateListCard';
import { ExerciseSelectorDropdown } from '@/components/exercise/ExerciseSelectorDropdown';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/utils/cn';
import { plannedWorkoutService } from '@/services/plannedWorkoutService';
import { format } from 'date-fns';
import { Exercise } from '@/types/exercise';
import { MuscleGroup } from '@/types/muscle';
import { exerciseLibrary } from '@/services/exerciseLibrary';
import { getMuscleMapping } from '@/services/muscleMapping';

interface PlanWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
}

type TabMode = 'template' | 'custom';

const CATEGORIES: Array<{ value: TemplateCategory; label: string }> = [
  { value: 'strength', label: 'Strength' },
  { value: 'hypertrophy', label: 'Hypertrophy' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'home', label: 'Home Workout' },
  { value: 'flexibility', label: 'Flexibility' },
];

export function PlanWorkoutModal({ isOpen, onClose, selectedDate }: PlanWorkoutModalProps) {
  const navigate = useNavigate();
  const { profile } = useUserStore();
  const { templates, isLoading, loadTemplates } = useTemplateStore();
  const { loadPlannedWorkoutsByDateRange, createPlannedWorkout } = usePlannedWorkoutStore();
  const { success, error: showError } = useToast();

  const [activeTab, setActiveTab] = useState<TabMode>('template');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [scheduledTime, setScheduledTime] = useState<string>('');
  
  // Custom workout state
  const [workoutName, setWorkoutName] = useState('');
  const [category, setCategory] = useState<TemplateCategory>('strength');
  const [estimatedDuration, setEstimatedDuration] = useState<number>(60);
  const [exercises, setExercises] = useState<PlannedExercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && profile) {
      loadTemplates(profile.id);
    }
    // Reset form when modal opens
    if (isOpen) {
      setActiveTab('template');
      setSelectedTemplateId(null);
      setScheduledTime('');
      setWorkoutName('');
      setCategory('strength');
      setEstimatedDuration(60);
      setExercises([]);
      setSelectedExercise(null);
      setNotes('');
    }
  }, [isOpen, profile, loadTemplates]);

  const handlePlanFromTemplate = async () => {
    if (!profile || !selectedTemplateId) {
      showError('Please select a template');
      return;
    }

    setIsSaving(true);
    try {
      const scheduledTimeDate = scheduledTime
        ? new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${scheduledTime}`)
        : undefined;

      await plannedWorkoutService.createFromTemplate(
        profile.id,
        selectedTemplateId,
        selectedDate,
        scheduledTimeDate
      );

      // Reload planned workouts for the current view
      const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      await loadPlannedWorkoutsByDateRange(profile.id, startOfMonth, endOfMonth);

      success('Workout planned successfully!');
      onClose();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to plan workout');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddExercise = () => {
    if (!selectedExercise) return;

    const newExercise: PlannedExercise = {
      exerciseId: selectedExercise.id,
      exerciseName: selectedExercise.name,
      sets: 3,
      reps: 10,
      weight: 0,
      restTime: 60,
    };

    setExercises([...exercises, newExercise]);
    setSelectedExercise(null);
  };

  const handleRemoveExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const handleUpdateExercise = (index: number, updates: Partial<PlannedExercise>) => {
    setExercises(
      exercises.map((ex, i) => (i === index ? { ...ex, ...updates } : ex))
    );
  };

  const calculateMusclesTargeted = async (): Promise<MuscleGroup[]> => {
    const musclesTargeted = new Set<MuscleGroup>();
    
    for (const ex of exercises) {
      try {
        const exerciseData = await exerciseLibrary.getExerciseById(ex.exerciseId);
        if (exerciseData) {
          const mapping = getMuscleMapping(exerciseData.name);
          if (mapping) {
            [...mapping.primary, ...mapping.secondary].forEach((m) =>
              musclesTargeted.add(m)
            );
          } else {
            exerciseData.primaryMuscles.forEach((m) => musclesTargeted.add(m));
            exerciseData.secondaryMuscles.forEach((m) => musclesTargeted.add(m));
          }
        }
      } catch (error) {
        console.warn('Failed to get exercise data for muscle calculation:', error);
      }
    }
    
    return Array.from(musclesTargeted);
  };

  const handlePlanCustomWorkout = async () => {
    if (!profile) {
      showError('Please log in to plan a workout');
      return;
    }

    if (!workoutName.trim()) {
      showError('Please enter a workout name');
      return;
    }

    if (exercises.length === 0) {
      showError('Please add at least one exercise');
      return;
    }

    setIsSaving(true);
    try {
      const scheduledTimeDate = scheduledTime
        ? new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${scheduledTime}`)
        : undefined;

      const musclesTargeted = await calculateMusclesTargeted();

      await createPlannedWorkout(profile.id, {
        userId: profile.id,
        scheduledDate: selectedDate,
        scheduledTime: scheduledTimeDate,
        workoutName: workoutName.trim(),
        category,
        estimatedDuration,
        exercises,
        musclesTargeted,
        notes: notes.trim() || undefined,
        isCompleted: false,
      });

      // Reload planned workouts for the current view
      const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      await loadPlannedWorkoutsByDateRange(profile.id, startOfMonth, endOfMonth);

      success('Workout planned successfully!');
      onClose();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to plan workout');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
  };

  const handleCreateCustomExercise = () => {
    navigate('/create-exercise');
  };

  const canSaveCustom = workoutName.trim().length > 0 && exercises.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Plan Workout" size="lg">
      <div className="space-y-6">
        {/* Selected Date Display */}
        <div className="flex items-center gap-3 p-4 bg-surface-dark/50 rounded-xl border border-white/5">
          <Calendar className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm text-slate-400">Scheduled Date</p>
            <p className="text-white font-semibold">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
          </div>
        </div>

        {/* Time Selection (Optional) */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            <Clock className="w-4 h-4 inline mr-2" />
            Time (Optional)
          </label>
          <input
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-surface-dark border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Tab Selector */}
        <div className="flex p-1 bg-surface-dark/50 dark:bg-surface-dark rounded-xl">
          <button
            onClick={() => setActiveTab('template')}
            className={cn(
              'flex-1 py-2 rounded-lg text-sm font-semibold transition-all',
              activeTab === 'template'
                ? 'bg-white dark:bg-background-dark text-slate-900 dark:text-primary shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            )}
          >
            From Template
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={cn(
              'flex-1 py-2 rounded-lg text-sm font-semibold transition-all',
              activeTab === 'custom'
                ? 'bg-white dark:bg-background-dark text-slate-900 dark:text-primary shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            )}
          >
            Custom Workout
          </button>
        </div>

        {/* Template Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'template' && (
            <motion.div
              key="template"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
            <h3 className="text-lg font-bold text-white mb-4">Select Template</h3>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p>No templates available. Create a template first.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => handleTemplateSelect(template.id)}
                    className={cn(
                      'cursor-pointer transition-all',
                      selectedTemplateId === template.id && 'ring-2 ring-primary rounded-xl'
                    )}
                  >
                    <TemplateListCard
                      template={template}
                      onClick={() => handleTemplateSelect(template.id)}
                    />
                  </div>
                ))}
              </div>
            )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom Workout Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'custom' && (
            <motion.div
              key="custom"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
            {/* Workout Name */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Workout Name *
              </label>
              <input
                type="text"
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
                placeholder="e.g., Push Day, Leg Day"
                className="w-full px-4 py-2 rounded-lg bg-surface-dark border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Category *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      category === cat.value
                        ? 'bg-primary text-background-dark'
                        : 'bg-surface-dark border border-white/10 text-white hover:bg-surface-dark/80'
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Estimated Duration */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Estimated Duration (minutes) *
              </label>
              <input
                type="number"
                min="1"
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(parseInt(e.target.value) || 60)}
                className="w-full px-4 py-2 rounded-lg bg-surface-dark border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Exercise Builder */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Exercises *
              </label>
              <ExerciseSelectorDropdown
                selectedExercise={selectedExercise}
                onSelect={setSelectedExercise}
                onCreateCustom={handleCreateCustomExercise}
              />
              {selectedExercise && (
                <button
                  onClick={handleAddExercise}
                  className="mt-2 w-full px-4 py-2 rounded-lg bg-primary text-background-dark font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Exercise
                </button>
              )}

              {/* Exercise List */}
              {exercises.length > 0 && (
                <div className="mt-4 space-y-3">
                  {exercises.map((exercise, index) => (
                    <div
                      key={index}
                      className="p-4 bg-surface-dark/50 rounded-xl border border-white/5"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-white font-semibold">{exercise.exerciseName}</h4>
                        </div>
                        <button
                          onClick={() => handleRemoveExercise(index)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Sets</label>
                          <input
                            type="number"
                            min="1"
                            value={exercise.sets}
                            onChange={(e) =>
                              handleUpdateExercise(index, { sets: parseInt(e.target.value) || 1 })
                            }
                            className="w-full px-2 py-1 rounded bg-surface-dark border border-white/10 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Reps</label>
                          <input
                            type="number"
                            min="1"
                            value={exercise.reps}
                            onChange={(e) =>
                              handleUpdateExercise(index, { reps: parseInt(e.target.value) || 1 })
                            }
                            className="w-full px-2 py-1 rounded bg-surface-dark border border-white/10 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Weight (kg)</label>
                          <input
                            type="number"
                            min="0"
                            value={exercise.weight || 0}
                            onChange={(e) =>
                              handleUpdateExercise(index, { weight: parseFloat(e.target.value) || 0 })
                            }
                            className="w-full px-2 py-1 rounded bg-surface-dark border border-white/10 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this workout..."
                rows={3}
                className="w-full px-4 py-2 rounded-lg bg-surface-dark border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            {/* Summary */}
            {exercises.length > 0 && (
              <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Dumbbell className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">Workout Summary</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Exercises:</span>
                    <span className="text-white font-semibold ml-2">{exercises.length}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Duration:</span>
                    <span className="text-white font-semibold ml-2">{estimatedDuration} min</span>
                  </div>
                </div>
              </div>
            )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-white/10">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 px-4 py-2 rounded-lg bg-surface-dark border border-white/10 text-white font-medium hover:bg-surface-dark/80 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={activeTab === 'template' ? handlePlanFromTemplate : handlePlanCustomWorkout}
            disabled={
              isSaving ||
              (activeTab === 'template' ? !selectedTemplateId : !canSaveCustom)
            }
            className={cn(
              'flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2',
              (activeTab === 'template' ? selectedTemplateId : canSaveCustom) && !isSaving
                ? 'bg-primary text-background-dark hover:bg-primary/90'
                : 'bg-surface-dark text-slate-400 cursor-not-allowed'
            )}
          >
            {isSaving ? (
              <>
                <LoadingSpinner size="sm" />
                Planning...
              </>
            ) : (
              'Plan Workout'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
