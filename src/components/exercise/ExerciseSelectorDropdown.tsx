import { useState, useEffect, useRef, useMemo, useDeferredValue } from 'react';
import { Search, Plus, ChevronDown, Filter, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Exercise, ExerciseCategory } from '@/types/exercise';
import { exerciseLibrary, EquipmentCategory, getEquipmentCategories } from '@/services/exerciseLibrary';
import { cn } from '@/utils/cn';
import { slideDown, staggerContainerFast, prefersReducedMotion } from '@/utils/animations';
import { MuscleGroupCategory, exerciseTargetsMuscleCategory, getMuscleGroupsInCategory } from '@/utils/muscleGroupCategories';
import { searchExercises } from '@/utils/exerciseSearch';
import { SearchHighlight } from './SearchHighlight';

interface ExerciseSelectorDropdownProps {
  selectedExercise: Exercise | null;
  onSelect: (exercise: Exercise) => void;
  onCreateCustom: () => void;
  className?: string;
  selectedCategory?: ExerciseCategory | null;
  selectedMuscleGroups?: MuscleGroupCategory[];
}

export function ExerciseSelectorDropdown({
  selectedExercise,
  onSelect,
  onCreateCustom,
  className,
  selectedCategory = null,
  selectedMuscleGroups = [],
}: ExerciseSelectorDropdownProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [selectedEquipmentCategories, setSelectedEquipmentCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadExercises();
  }, []);

  // Fast counter for immediate UI feedback (simple filter, no ranking)
  const fastFilteredCount = useMemo(() => {
    if (!searchQuery.trim()) {
      return exercises.length;
    }
    const query = searchQuery.toLowerCase();
    return exercises.filter((ex) => {
      if (selectedCategory && ex.category !== selectedCategory) return false;
      if (selectedMuscleGroups.length > 0 && 
          !exerciseTargetsMuscleCategory(ex.primaryMuscles, ex.secondaryMuscles, selectedMuscleGroups)) {
        return false;
      }
      return ex.name.toLowerCase().includes(query) ||
             ex.category.toLowerCase().includes(query) ||
             ex.equipment.some((eq) => eq.toLowerCase().includes(query));
    }).length;
  }, [searchQuery, exercises, selectedCategory, selectedMuscleGroups]);

  // Memoize filtered exercises to prevent unnecessary recalculations
  // Use deferredSearchQuery for expensive search computation
  const filteredExercises = useMemo(() => {
    let filtered = exercises;

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter((ex) => ex.category === selectedCategory);
    }

    // Apply muscle group filter
    if (selectedMuscleGroups.length > 0) {
      filtered = filtered.filter((ex) =>
        exerciseTargetsMuscleCategory(ex.primaryMuscles, ex.secondaryMuscles, selectedMuscleGroups)
      );
    }

    // Apply enhanced search filter with relevance ranking (using deferred query)
    if (deferredSearchQuery.trim() !== '') {
      filtered = searchExercises(filtered, deferredSearchQuery, 100);
    }

    // Apply equipment category filter
    if (selectedEquipmentCategories.length > 0) {
      filtered = filtered.filter((ex) => {
        const exerciseCategories = getEquipmentCategories(ex.equipment);
        return selectedEquipmentCategories.some((category) =>
          exerciseCategories.includes(category as EquipmentCategory)
        );
      });
    }

    return filtered;
  }, [deferredSearchQuery, selectedEquipmentCategories, exercises, selectedCategory, selectedMuscleGroups]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  async function loadExercises() {
    setIsLoading(true);
    try {
      const allExercises = await exerciseLibrary.getAllExercises();
      setExercises(allExercises);
      // Don't set filteredExercises here - let the filter effect handle it
      // This ensures filters are applied even on initial load
    } catch (error) {
      console.error('Failed to load exercises:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSelectExercise = (exercise: Exercise) => {
    onSelect(exercise);
    setIsOpen(false);
    setSearchQuery('');
    setSelectedEquipmentCategories([]);
  };

  return (
    <div className={cn('relative group', className)} ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
        Exercise
      </label>
      <div className="relative flex items-center">
        <Search className="absolute left-3 text-primary pointer-events-none w-5 h-5" />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full appearance-none rounded-xl border border-gray-200 dark:border-[#316847] bg-surface-light dark:bg-surface-dark py-4 pl-10 pr-10 text-base font-medium text-gray-900 dark:text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm transition-all text-left"
        >
          {selectedExercise ? selectedExercise.name : 'Select exercise...'}
        </button>
        <ChevronDown
          className={cn(
            'absolute right-3 text-gray-400 pointer-events-none w-5 h-5 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </div>

      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="absolute z-50 w-full mt-2 bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-[#316847] rounded-xl shadow-lg max-h-96 overflow-y-auto"
            variants={prefersReducedMotion() ? {} : slideDown}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
          {/* Search input */}
          <div className="sticky top-0 bg-surface-light dark:bg-surface-dark border-b border-gray-200 dark:border-[#316847] p-2 z-10">
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, muscle, or equipment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background-light dark:bg-background-dark rounded-lg border border-gray-200 dark:border-[#316847] text-sm text-gray-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                autoFocus
              />
            </div>
            
            {/* Filter Toggle */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors',
                  showFilters || selectedEquipmentCategories.length > 0
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                )}
              >
                <Filter className="w-3 h-3" />
                <span>Equipment</span>
                {selectedEquipmentCategories.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                    {selectedEquipmentCategories.length}
                  </span>
                )}
              </button>
              {selectedEquipmentCategories.length > 0 && (
                <button
                  onClick={() => setSelectedEquipmentCategories([])}
                  className="text-xs text-primary-500 hover:text-primary-600 flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>

            {/* Equipment Filter Section */}
            {showFilters && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-[#316847]">
                <div className="flex flex-wrap gap-1.5">
                  {Object.values(EquipmentCategory).map((category) => {
                    const isSelected = selectedEquipmentCategories.includes(category);
                    return (
                      <button
                        key={category}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedEquipmentCategories(
                              selectedEquipmentCategories.filter((c) => c !== category)
                            );
                          } else {
                            setSelectedEquipmentCategories([...selectedEquipmentCategories, category]);
                          }
                        }}
                        className={cn(
                          'px-2 py-1 text-xs font-medium rounded transition-colors',
                          isSelected
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        )}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active Filters Display */}
            {!showFilters && selectedEquipmentCategories.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-[#316847]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Filters:</span>
                  {selectedEquipmentCategories.map((category) => (
                    <span
                      key={category}
                      className="px-1.5 py-0.5 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Exercise list */}
          <div className="p-2">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Loading exercises...
              </div>
            ) : filteredExercises.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                <p>No exercises found</p>
                {(searchQuery || selectedEquipmentCategories.length > 0) && (
                  <p className="text-xs mt-1">Try adjusting your search or filters</p>
                )}
              </div>
            ) : (
              <>
                <div className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {filteredExercises.length} of {exercises.length} exercises
                  {deferredSearchQuery !== searchQuery && (
                    <span className="ml-1 text-primary">(updating...)</span>
                  )}
                </div>
                <motion.div 
                  className="space-y-1"
                  variants={prefersReducedMotion() ? {} : staggerContainerFast}
                  initial="hidden"
                  animate="visible"
                >
                  {filteredExercises.map((exercise, index) => (
                    <motion.button
                      key={exercise.id}
                      onClick={() => handleSelectExercise(exercise)}
                      className={cn(
                        'w-full px-3 py-2 text-left rounded-lg text-sm transition-colors',
                        'hover:bg-primary/10 hover:text-primary',
                        'text-gray-900 dark:text-white',
                        selectedExercise?.id === exercise.id &&
                          'bg-primary/10 text-primary'
                      )}
                      variants={prefersReducedMotion() ? {} : {
                        hidden: { opacity: 0, y: 10 },
                        visible: { 
                          opacity: 1, 
                          y: 0,
                          transition: { delay: index * 0.02 }
                        }
                      }}
                      whileHover={prefersReducedMotion() ? {} : { x: 4 }}
                    >
                      <div className="flex items-center justify-between">
                        <SearchHighlight
                          text={exercise.name}
                          query={deferredSearchQuery}
                          className="flex-1"
                        />
                        {getEquipmentCategories(exercise.equipment).length > 0 && (
                          <div className="flex gap-1 ml-2">
                            {getEquipmentCategories(exercise.equipment).slice(0, 2).map((category) => (
                              <span
                                key={category}
                                className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded"
                              >
                                {category}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              </>
            )}
          </div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* Create Custom button */}
      <div className="mt-3 flex justify-end">
        <button
          onClick={onCreateCustom}
          className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Create Custom
        </button>
      </div>
    </div>
  );
}

