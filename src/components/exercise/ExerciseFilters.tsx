import { ExerciseCategory } from '@/types/exercise';
import { MuscleGroupCategory } from '@/utils/muscleGroupCategories';
import { cn } from '@/utils/cn';

interface ExerciseFiltersProps {
  selectedCategory: ExerciseCategory | null;
  selectedMuscleGroups: MuscleGroupCategory[];
  onCategoryChange: (category: ExerciseCategory | null) => void;
  onMuscleGroupsChange: (groups: MuscleGroupCategory[]) => void;
}

const CATEGORIES: Array<{ value: ExerciseCategory; label: string; icon: string }> = [
  { value: 'strength', label: 'Strength', icon: 'fitness_center' },
  { value: 'cardio', label: 'Cardio', icon: 'directions_run' },
  { value: 'flexibility', label: 'Flexibility', icon: 'self_improvement' },
  { value: 'plyometric', label: 'HIIT', icon: 'timer' },
];

const MUSCLE_GROUP_CATEGORIES: MuscleGroupCategory[] = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];

export function ExerciseFilters({
  selectedCategory,
  selectedMuscleGroups,
  onCategoryChange,
  onMuscleGroupsChange,
}: ExerciseFiltersProps) {
  const handleCategoryClick = (category: ExerciseCategory) => {
    // Toggle: if already selected, deselect; otherwise select
    if (selectedCategory === category) {
      onCategoryChange(null);
    } else {
      onCategoryChange(category);
    }
  };

  const handleMuscleGroupClick = (category: MuscleGroupCategory) => {
    // Only allow muscle group selection when Strength category is selected
    if (selectedCategory !== 'strength') {
      return;
    }
    
    if (selectedMuscleGroups.includes(category)) {
      // Remove from selection
      onMuscleGroupsChange(selectedMuscleGroups.filter(g => g !== category));
    } else {
      // Add to selection
      onMuscleGroupsChange([...selectedMuscleGroups, category]);
    }
  };

  const handleResetMuscleGroups = () => {
    onMuscleGroupsChange([]);
  };

  const isMuscleGroupFilterEnabled = selectedCategory === 'strength';

  return (
    <div className="px-4 mb-5 space-y-4">
      {/* Category Filter */}
      <div className="bg-surface-light dark:bg-surface-dark p-3 rounded-2xl border border-gray-200 dark:border-[#316847] mt-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">category</span>
            Category
          </label>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar touch-pan-x pb-1">
          {CATEGORIES.map((category) => {
            const isSelected = selectedCategory === category.value;
            return (
              <button
                key={category.value}
                onClick={() => handleCategoryClick(category.value)}
                className={cn(
                  'shrink-0 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2',
                  isSelected
                    ? 'bg-primary text-background-dark hover:brightness-105'
                    : 'bg-background-light dark:bg-background-dark border border-gray-200 dark:border-[#316847] text-gray-600 dark:text-gray-300 font-medium hover:border-primary hover:text-primary'
                )}
              >
                <span className="material-symbols-outlined text-[18px]">{category.icon}</span>
                {category.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Muscle Group Filter */}
      <div className={cn(
        "bg-surface-light dark:bg-surface-dark p-3 rounded-2xl border border-gray-200 dark:border-[#316847]",
        !isMuscleGroupFilterEnabled && "opacity-50"
      )}>
        <div className="flex items-center justify-between mb-3">
          <label className={cn(
            "text-xs font-bold uppercase tracking-wider flex items-center gap-1.5",
            isMuscleGroupFilterEnabled 
              ? "text-gray-500 dark:text-gray-400" 
              : "text-gray-400 dark:text-gray-500"
          )}>
            <span className="material-symbols-outlined text-sm">accessibility_new</span>
            Muscle Group
            {!isMuscleGroupFilterEnabled && (
              <span className="text-[10px] font-normal normal-case ml-1">(Strength only)</span>
            )}
          </label>
          {selectedMuscleGroups.length > 0 && isMuscleGroupFilterEnabled && (
            <button
              onClick={handleResetMuscleGroups}
              className="text-[10px] font-semibold text-primary hover:underline bg-primary/10 px-2 py-1 rounded-md"
            >
              Reset
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar touch-pan-x pb-1">
          {MUSCLE_GROUP_CATEGORIES.map((category) => {
            const isSelected = selectedMuscleGroups.includes(category);
            return (
              <button
                key={category}
                onClick={() => handleMuscleGroupClick(category)}
                disabled={!isMuscleGroupFilterEnabled}
                className={cn(
                  'shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-xs transition-colors',
                  !isMuscleGroupFilterEnabled && 'cursor-not-allowed',
                  isSelected && isMuscleGroupFilterEnabled
                    ? 'bg-primary/10 border border-primary text-primary font-bold'
                    : isMuscleGroupFilterEnabled
                    ? 'bg-background-light dark:bg-background-dark border border-gray-200 dark:border-[#316847] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a3b2b] hover:border-primary/50'
                    : 'bg-background-light dark:bg-background-dark border border-gray-200 dark:border-[#316847] text-gray-400 dark:text-gray-600'
                )}
              >
                {isSelected && isMuscleGroupFilterEnabled && (
                  <span className="material-symbols-outlined text-[16px]">check</span>
                )}
                {category}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

