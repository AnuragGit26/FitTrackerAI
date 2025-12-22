import { useState } from 'react';
import { X, ChevronRight, Trash2, Plus, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTemplateStore } from '@/store/templateStore';
import { useUserStore } from '@/store/userStore';
import { TemplateCategory, TemplateDifficulty } from '@/types/workout';
import { Exercise } from '@/types/exercise';
import { ExerciseSelectorDropdown } from '@/components/exercise/ExerciseSelectorDropdown';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/utils/cn';
import { getMuscleMapping } from '@/services/muscleMapping';
import { MuscleGroup } from '@/types/muscle';

interface TemplateExercise {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: number;
  weight?: number;
  restTime?: number;
}

const CATEGORIES: Array<{ value: TemplateCategory; label: string }> = [
  { value: 'strength', label: 'Strength' },
  { value: 'hypertrophy', label: 'Hypertrophy' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'home', label: 'Home Workout' },
  { value: 'flexibility', label: 'Flexibility' },
];

const DIFFICULTIES: Array<{ value: TemplateDifficulty; label: string }> = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export function CreateTemplate() {
  const navigate = useNavigate();
  const { profile } = useUserStore();
  const { createTemplate } = useTemplateStore();
  const { success, error: showError } = useToast();

  const [step, setStep] = useState(1);
  const [templateName, setTemplateName] = useState('');
  const [category, setCategory] = useState<TemplateCategory>('strength');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<TemplateDifficulty>('intermediate');
  const [daysPerWeek, setDaysPerWeek] = useState<number>(3);
  const [estimatedDuration, setEstimatedDuration] = useState<number>(60);
  const [exercises, setExercises] = useState<TemplateExercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddExercise = () => {
    if (!selectedExercise) return;

    const newExercise: TemplateExercise = {
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

  const handleUpdateExercise = (index: number, updates: Partial<TemplateExercise>) => {
    setExercises(
      exercises.map((ex, i) => (i === index ? { ...ex, ...updates } : ex))
    );
  };

  const handleSave = async () => {
    if (!profile) {
      showError('Please log in to create a template');
      return;
    }

    if (!templateName.trim()) {
      showError('Please enter a template name');
      return;
    }

    if (exercises.length === 0) {
      showError('Please add at least one exercise');
      return;
    }

    setIsSaving(true);

    try {
      // Calculate muscles targeted from exercises
      const musclesTargeted = new Set<MuscleGroup>();
      for (const ex of exercises) {
        const exerciseLibrary = await import('@/services/exerciseLibrary');
        const exerciseData = await exerciseLibrary.exerciseLibrary.getExerciseById(ex.exerciseId);
        if (exerciseData) {
          const mapping = getMuscleMapping(exerciseData.name);
          if (mapping) {
            [...mapping.primary, ...mapping.secondary].forEach((m) =>
              musclesTargeted.add(m)
            );
          } else {
            exerciseData.primaryMuscles.forEach((m) => musclesTargeted.add(m));
          }
        }
      }

      await createTemplate({
        userId: profile.id,
        name: templateName.trim(),
        category,
        description: description.trim() || undefined,
        difficulty,
        daysPerWeek,
        exercises,
        estimatedDuration,
        musclesTargeted: Array.from(musclesTargeted),
      });

      success('Template created successfully!');
      navigate('/workout-templates');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to create template');
    } finally {
      setIsSaving(false);
    }
  };

  const canProceed = () => {
    if (step === 1) {
      return templateName.trim().length > 0 && category;
    }
    if (step === 2) {
      return exercises.length > 0;
    }
    return true;
  };

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-black/5 dark:border-[#316847]/30">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center size-10 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          aria-label="Back"
        >
          <X className="w-6 h-6 text-slate-500 dark:text-gray-400" />
        </button>
        <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
          Create Template
        </h1>
        {step === 3 && (
          <button
            onClick={handleSave}
            disabled={!canProceed() || isSaving}
            className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-primary text-background-dark font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <LoadingSpinner />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save
              </>
            )}
          </button>
        )}
        {step < 3 && (
          <button
            onClick={() => {
              if (canProceed()) {
                setStep(step + 1);
              }
            }}
            disabled={!canProceed()}
            className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-primary text-background-dark font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </header>

      {/* Progress Indicator */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-[#316847]/30">
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  'size-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors',
                  step >= s
                    ? 'bg-primary text-background-dark'
                    : 'bg-gray-200 dark:bg-surface-dark text-gray-500 dark:text-gray-400'
                )}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={cn(
                    'flex-1 h-1 rounded-full transition-colors',
                    step > s ? 'bg-primary' : 'bg-gray-200 dark:bg-surface-dark'
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="px-4 py-6 space-y-6"
            >
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Upper/Lower Split"
                  className="w-full rounded-lg bg-white dark:bg-surface-dark border border-gray-200 dark:border-[#316847] text-gray-900 dark:text-white focus:border-primary focus:ring-primary h-12 px-4"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Category *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      className={cn(
                        'h-12 rounded-lg border-2 font-medium transition-colors',
                        category === cat.value
                          ? 'bg-primary border-primary text-background-dark'
                          : 'bg-white dark:bg-surface-dark border-gray-200 dark:border-[#316847] text-gray-700 dark:text-gray-300 hover:border-primary/50'
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe this workout template..."
                  rows={4}
                  className="w-full rounded-lg bg-white dark:bg-surface-dark border border-gray-200 dark:border-[#316847] text-gray-900 dark:text-white focus:border-primary focus:ring-primary resize-none p-3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as TemplateDifficulty)}
                    className="w-full rounded-lg bg-white dark:bg-surface-dark border border-gray-200 dark:border-[#316847] text-gray-900 dark:text-white focus:border-primary focus:ring-primary h-12 px-4"
                  >
                    {DIFFICULTIES.map((diff) => (
                      <option key={diff.value} value={diff.value}>
                        {diff.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Days/Week
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="7"
                    value={daysPerWeek}
                    onChange={(e) => setDaysPerWeek(parseInt(e.target.value) || 3)}
                    className="w-full rounded-lg bg-white dark:bg-surface-dark border border-gray-200 dark:border-[#316847] text-gray-900 dark:text-white focus:border-primary focus:ring-primary h-12 px-4"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Estimated Duration (minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(parseInt(e.target.value) || 60)}
                  className="w-full rounded-lg bg-white dark:bg-surface-dark border border-gray-200 dark:border-[#316847] text-gray-900 dark:text-white focus:border-primary focus:ring-primary h-12 px-4"
                />
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="px-4 py-6 space-y-6"
            >
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Add Exercises
                </h3>

                <div className="mb-4">
                  <ExerciseSelectorDropdown
                    selectedExercise={selectedExercise}
                    onSelect={setSelectedExercise}
                    onCreateCustom={() => navigate('/create-exercise')}
                  />
                  {selectedExercise && (
                    <button
                      onClick={handleAddExercise}
                      className="mt-3 w-full py-3 flex items-center justify-center gap-2 rounded-xl bg-primary text-background-dark font-bold hover:bg-primary/90 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      Add Exercise
                    </button>
                  )}
                </div>

                {exercises.length > 0 && (
                  <div className="space-y-3">
                    {exercises.map((exercise, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-[#316847]"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-bold text-gray-900 dark:text-white">
                            {exercise.exerciseName}
                          </h4>
                          <button
                            onClick={() => handleRemoveExercise(index)}
                            className="p-1 rounded-lg hover:bg-error/10 text-error transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                              Sets
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="20"
                              value={exercise.sets}
                              onChange={(e) =>
                                handleUpdateExercise(index, {
                                  sets: parseInt(e.target.value) || 1,
                                })
                              }
                              className="w-full rounded-lg bg-background-light dark:bg-background-dark border border-gray-200 dark:border-[#316847] text-gray-900 dark:text-white focus:border-primary focus:ring-primary h-10 px-3 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                              Reps
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={exercise.reps}
                              onChange={(e) =>
                                handleUpdateExercise(index, {
                                  reps: parseInt(e.target.value) || 1,
                                })
                              }
                              className="w-full rounded-lg bg-background-light dark:bg-background-dark border border-gray-200 dark:border-[#316847] text-gray-900 dark:text-white focus:border-primary focus:ring-primary h-10 px-3 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                              Weight (kg)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={exercise.weight || 0}
                              onChange={(e) =>
                                handleUpdateExercise(index, {
                                  weight: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-full rounded-lg bg-background-light dark:bg-background-dark border border-gray-200 dark:border-[#316847] text-gray-900 dark:text-white focus:border-primary focus:ring-primary h-10 px-3 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="px-4 py-6 space-y-6"
            >
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Review Template
                </h3>

                <div className="p-4 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-[#316847] space-y-4">
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">
                      {templateName}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {CATEGORIES.find((c) => c.value === category)?.label} •{' '}
                      {DIFFICULTIES.find((d) => d.value === difficulty)?.label} •{' '}
                      {daysPerWeek} Days/Week • {estimatedDuration} min
                    </p>
                    {description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                        {description}
                      </p>
                    )}
                  </div>

                  <div>
                    <h5 className="font-bold text-gray-900 dark:text-white mb-2">
                      Exercises ({exercises.length})
                    </h5>
                    <div className="space-y-2">
                      {exercises.map((exercise, index) => (
                        <div
                          key={index}
                          className="p-3 rounded-lg bg-background-light dark:bg-background-dark"
                        >
                          <p className="font-medium text-gray-900 dark:text-white">
                            {exercise.exerciseName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {exercise.sets} sets × {exercise.reps} reps
                            {exercise.weight && exercise.weight > 0 && ` @ ${exercise.weight}kg`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

