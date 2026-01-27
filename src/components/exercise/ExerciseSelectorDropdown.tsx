import { useState, useEffect, useRef, useMemo, useDeferredValue } from 'react';
import { Search, Plus, ChevronDown, Filter, X, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Exercise, ExerciseCategory, WorkoutExercise } from '@/types/exercise';
import { exerciseLibrary, EquipmentCategory, getEquipmentCategories } from '@/services/exerciseLibrary';
import { cn } from '@/utils/cn';
import { slideDown, staggerContainerFast, prefersReducedMotion } from '@/utils/animations';
import { MuscleGroupCategory, exerciseTargetsMuscleCategory } from '@/utils/muscleGroupCategories';
import { searchExercises } from '@/utils/exerciseSearch';
import { SearchHighlight } from './SearchHighlight';
import { exerciseFavoritesService } from '@/services/exerciseFavorites';
import { exerciseHistoryService } from '@/services/exerciseHistory';
import { exerciseSuggestionsService, SuggestedExercise } from '@/services/exerciseSuggestions';
import { useUserStore } from '@/store/userStore';
import { logger } from '@/utils/logger';

interface ExerciseSelectorDropdownProps {
  selectedExercise: Exercise | null;
  onSelect: (exercise: Exercise) => void;
  onCreateCustom: () => void;
  className?: string;
  selectedCategory?: ExerciseCategory | null;
  selectedMuscleGroups?: MuscleGroupCategory[];
  currentWorkoutExercises?: WorkoutExercise[]; // For smart suggestions
}

export function ExerciseSelectorDropdown({
  selectedExercise,
  onSelect,
  onCreateCustom,
  className,
  selectedCategory = null,
  selectedMuscleGroups = [],
  currentWorkoutExercises = [],
}: ExerciseSelectorDropdownProps) {
  const profile = useUserStore((state) => state.profile);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [selectedEquipmentCategories, setSelectedEquipmentCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // New state for enhanced features
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [recentExercises, setRecentExercises] = useState<Exercise[]>([]);
  const [suggestedExercises, setSuggestedExercises] = useState<SuggestedExercise[]>([]);

  useEffect(() => {
    loadExercises();
  }, []);


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

  // Load favorites, recent, and suggestions when dropdown opens
  useEffect(() => {
    if (isOpen && profile?.id) {
      loadEnhancedData();
    }
  }, [isOpen, profile?.id, currentWorkoutExercises.length]);

  async function loadExercises() {
    setIsLoading(true);
    try {
      const allExercises = await exerciseLibrary.getAllExercises();
      setExercises(allExercises);
      // Don't set filteredExercises here - let the filter effect handle it
      // This ensures filters are applied even on initial load
    } catch (error) {
      logger.error('Failed to load exercises', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadEnhancedData() {
    if (!profile?.id) {
    return;
  }

    try {
      // Load favorites
      const favorites = await exerciseFavoritesService.loadFavorites(profile.id);
      setFavoriteIds(new Set(favorites.map(f => f.exerciseId)));

      // Load recent exercises
      const recentHistory = await exerciseHistoryService.getRecentExercises(profile.id, 10);
      const recentIds = recentHistory.map(r => r.exerciseId);
      const recentExs = exercises.filter(ex => recentIds.includes(ex.id));
      setRecentExercises(recentExs);

      // Load suggestions (only if workout has exercises)
      if (currentWorkoutExercises.length > 0) {
        const suggestions = await exerciseSuggestionsService.getComplementaryExercises(
          profile.id,
          currentWorkoutExercises,
          exercises,
          5
        );
        setSuggestedExercises(suggestions);
      } else {
        setSuggestedExercises([]);
      }
    } catch (error) {
      logger.error('[ExerciseSelectorDropdown] Failed to load enhanced data', error);
    }
  }

  const handleToggleFavorite = async (exerciseId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent selecting the exercise
    if (!profile?.id) {
    return;
  }

    try {
      const newState = await exerciseFavoritesService.toggleFavorite(profile.id, exerciseId);

      // Update local state
      setFavoriteIds(prev => {
        const newSet = new Set(prev);
        if (newState) {
          newSet.add(exerciseId);
        } else {
          newSet.delete(exerciseId);
        }
        return newSet;
      });
    } catch (error) {
      logger.error('[ExerciseSelectorDropdown] Failed to toggle favorite', error);
    }
  };

  const handleSelectExercise = async (exercise: Exercise) => {
    // Record usage
    if (profile?.id) {
      await exerciseHistoryService.recordUsage(profile.id, exercise.id, exercise.name);
    }

    onSelect(exercise);
    setIsOpen(false);
    setSearchQuery('');
    setSelectedEquipmentCategories([]);
  };

  return (
    <div className={cn('relative group', className)} ref={dropdownRef}>
      <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-2">
        Exercise
      </label>
      <div className="relative flex items-center">
        <Search className="absolute left-3 text-primary pointer-events-none w-5 h-5" />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full appearance-none rounded-xl border border-gray-100 dark:border-border-dark bg-surface-light dark:bg-surface-dark py-4 pl-10 pr-10 text-base font-medium text-slate-900 dark:text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm transition-all text-left"
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
            className="absolute z-50 w-full mt-2 bg-surface-light dark:bg-surface-dark border border-gray-100 dark:border-border-dark rounded-xl shadow-lg max-h-96 overflow-y-auto"
            variants={prefersReducedMotion() ? {} : slideDown}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
          {/* Search input */}
          <div className="sticky top-0 bg-surface-light dark:bg-surface-dark border-b border-gray-100 dark:border-border-dark p-2 z-10">
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, muscle, or equipment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background-light dark:bg-background-dark rounded-lg border border-gray-100 dark:border-border-dark text-sm text-slate-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
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
                    : 'bg-gray-100 dark:bg-surface-dark text-slate-700 dark:text-gray-300 hover:bg-white dark:hover:bg-surface-dark-light'
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
              <div className="mt-2 pt-2 border-t border-gray-100 dark:border-border-dark">
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
                            : 'bg-gray-100 dark:bg-surface-dark text-slate-700 dark:text-gray-300 hover:bg-white dark:hover:bg-surface-dark-light'
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
              <div className="mt-2 pt-2 border-t border-gray-100 dark:border-border-dark">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-slate-500 dark:text-gray-400">Filters:</span>
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
              <div className="p-4 text-center text-sm text-slate-500">
                Loading exercises...
              </div>
            ) : filteredExercises.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">
                <p>No exercises found</p>
                {(searchQuery || selectedEquipmentCategories.length > 0) && (
                  <p className="text-xs mt-1">Try adjusting your search or filters</p>
                )}
              </div>
            ) : (
              <>
                {/* Quick Access Sections - Only show when no search/filters active */}
                {!searchQuery && selectedEquipmentCategories.length === 0 && (
                  <>
                    {/* Favorites */}
                    {favoriteIds.size > 0 && (
                      <div className="mb-3">
                        <div className="px-2 py-1 text-xs font-medium text-slate-700 dark:text-gray-300 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          FAVORITES ({favoriteIds.size})
                        </div>
                        <div className="space-y-1">
                          {exercises.filter(ex => favoriteIds.has(ex.id)).slice(0, 5).map(exercise => (
                            <ExerciseItem
                              key={exercise.id}
                              exercise={exercise}
                              isFavorite={true}
                              onToggleFavorite={handleToggleFavorite}
                              onSelect={handleSelectExercise}
                              isSelected={selectedExercise?.id === exercise.id}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recently Used */}
                    {recentExercises.length > 0 && (
                      <div className="mb-3">
                        <div className="px-2 py-1 text-xs font-medium text-slate-700 dark:text-gray-300">
                          RECENTLY USED ({recentExercises.length})
                        </div>
                        <div className="space-y-1">
                          {recentExercises.slice(0, 5).map(exercise => (
                            <ExerciseItem
                              key={exercise.id}
                              exercise={exercise}
                              isFavorite={favoriteIds.has(exercise.id)}
                              onToggleFavorite={handleToggleFavorite}
                              onSelect={handleSelectExercise}
                              isSelected={selectedExercise?.id === exercise.id}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggested */}
                    {suggestedExercises.length > 0 && (
                      <div className="mb-3">
                        <div className="px-2 py-1 text-xs font-medium text-slate-700 dark:text-gray-300">
                          SUGGESTED FOR YOU ({suggestedExercises.length})
                        </div>
                        <div className="space-y-1">
                          {suggestedExercises.map(({ exercise, reason }) => (
                            <ExerciseItem
                              key={exercise.id}
                              exercise={exercise}
                              isFavorite={favoriteIds.has(exercise.id)}
                              onToggleFavorite={handleToggleFavorite}
                              onSelect={handleSelectExercise}
                              isSelected={selectedExercise?.id === exercise.id}
                              reason={reason}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* All Exercises */}
                <div className="mt-3">
                  <div className="px-2 py-1 text-xs text-slate-500 dark:text-gray-400 mb-1">
                    ALL EXERCISES: {filteredExercises.length} of {exercises.length}
                    {deferredSearchQuery !== searchQuery && (
                      <span className="ml-1 text-primary">(updating...)</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {filteredExercises.map((exercise, index) => (
                      <ExerciseItem
                        key={exercise.id}
                        exercise={exercise}
                        isFavorite={favoriteIds.has(exercise.id)}
                        onToggleFavorite={handleToggleFavorite}
                        onSelect={handleSelectExercise}
                        isSelected={selectedExercise?.id === exercise.id}
                        searchQuery={deferredSearchQuery}
                        index={index}
                      />
                    ))}
                  </div>
                </div>
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

  // Helper component for rendering exercise items
  function ExerciseItem({
    exercise,
    isFavorite,
    onToggleFavorite,
    onSelect,
    isSelected,
    reason,
    searchQuery,
    index = 0,
  }: {
    exercise: Exercise;
    isFavorite: boolean;
    onToggleFavorite: (exerciseId: string, event: React.MouseEvent) => void;
    onSelect: (exercise: Exercise) => void;
    isSelected: boolean;
    reason?: string;
    searchQuery?: string;
    index?: number;
  }) {
    return (
      <button
        onClick={() => onSelect(exercise)}
        className={cn(
          'w-full px-3 py-2 text-left rounded-lg text-sm transition-all duration-200 relative group/item',
          'hover:bg-primary/10 hover:text-primary',
          'text-slate-900 dark:text-white',
          isSelected && 'bg-primary/10 text-primary'
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            {searchQuery ? (
              <SearchHighlight text={exercise.name} query={searchQuery} className="flex-1" />
            ) : (
              <span>{exercise.name}</span>
            )}
            {reason && (
              <div className="text-[10px] text-slate-500 dark:text-gray-400 mt-0.5">
                {reason}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {getEquipmentCategories(exercise.equipment).length > 0 && (
              <div className="flex gap-1">
                {getEquipmentCategories(exercise.equipment).slice(0, 2).map((category) => (
                  <span
                    key={category}
                    className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded"
                  >
                    {category}
                  </span>
                ))}
              </div>
            )}

            <div
              onClick={(e) => onToggleFavorite(exercise.id, e)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggleFavorite(exercise.id, e as unknown as React.MouseEvent);
                }
              }}
              role="button"
              tabIndex={0}
              className="p-1 rounded transition-colors opacity-0 group-hover/item:opacity-100 hover:bg-white dark:hover:bg-surface-dark-light cursor-pointer"
              style={isFavorite ? { opacity: 1 } : undefined}
              aria-label={isFavorite ? 'Unfavorite' : 'Favorite'}
            >
              <Star
                className={cn(
                  'w-4 h-4 transition-colors',
                  isFavorite
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-gray-400 hover:text-amber-400'
                )}
              />
            </div>
          </div>
        </div>
      </button>
    );
  }
}

