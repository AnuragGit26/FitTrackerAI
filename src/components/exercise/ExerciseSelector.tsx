import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import { Exercise } from '@/types/exercise';
import { exerciseLibrary, EquipmentCategory, getEquipmentCategories } from '@/services/exerciseLibrary';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { cn } from '@/utils/cn';
import { searchExercises } from '@/utils/exerciseSearch';
import { SearchHighlight } from './SearchHighlight';
import { useDebounce } from '@/hooks/useDebounce';

interface ExerciseSelectorProps {
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}

export function ExerciseSelector({ onSelect, onClose }: ExerciseSelectorProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Triple optimization for search:
  // 1. useDebounce: Delays query execution until user stops typing (300ms)
  // 2. useDeferredValue: Allows UI to remain responsive during expensive filtering
  // 3. Combined: Reduces query frequency AND keeps UI smooth
  const debouncedQuery = useDebounce(searchQuery, 300);
  const deferredSearchQuery = useDeferredValue(debouncedQuery);

  const [selectedEquipmentCategories, setSelectedEquipmentCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadExercises();
  }, []);


  // Memoize filtered exercises to prevent unnecessary recalculations
  // Use deferredSearchQuery for expensive search computation
  const filteredExercises = useMemo(() => {
    let filtered = exercises;

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
  }, [deferredSearchQuery, selectedEquipmentCategories, exercises]);

  async function loadExercises() {
    setIsLoading(true);
    try {
      const allExercises = await exerciseLibrary.getAllExercises();
      setExercises(allExercises);
    } catch (error) {
      console.error('Failed to load exercises:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-background-dark">
      <div className="flex flex-col h-full">
        {/* Search Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-background-dark border-b border-gray-100 dark:border-border-dark">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, muscle, or equipment..."
                  value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-surface-dark rounded-lg border-0 focus:ring-2 focus:ring-primary-500"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white dark:hover:bg-surface-dark-light"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'px-3 py-2 rounded-lg transition-colors',
                  showFilters || selectedEquipmentCategories.length > 0
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-surface-dark text-slate-700 dark:text-gray-300'
                )}
              >
                <Filter className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-700 dark:text-gray-300 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Equipment Filter Section */}
          {showFilters && (
            <div className="px-4 pb-4 border-t border-gray-100 dark:border-border-dark pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-700 dark:text-gray-300">
                  Filter by Equipment
                </h3>
                {selectedEquipmentCategories.length > 0 && (
                  <button
                    onClick={() => setSelectedEquipmentCategories([])}
                    className="text-xs text-primary-500 hover:text-primary-600"
                  >
                    Clear filters
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
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
                        'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
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
            <div className="px-4 pb-3 border-t border-gray-100 dark:border-border-dark pt-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500 dark:text-gray-400">Active filters:</span>
                {selectedEquipmentCategories.map((category) => (
                  <span
                    key={category}
                    className="px-2 py-1 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded"
                  >
                    {category}
                  </span>
                ))}
                <button
                  onClick={() => setSelectedEquipmentCategories([])}
                  className="text-xs text-primary-500 hover:text-primary-600"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Exercise List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner />
            </div>
          ) : filteredExercises.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <p className="text-lg font-medium">No exercises found</p>
              <p className="text-sm">
                {searchQuery || selectedEquipmentCategories.length > 0
                  ? 'Try a different search term or filter'
                  : 'No exercises available'}
              </p>
            </div>
          ) : (
            <>
              <div className="px-4 py-2 text-xs text-slate-500 dark:text-gray-400 border-b border-gray-100 dark:border-border-dark">
                Showing {filteredExercises.length} of {exercises.length} exercises
                {(debouncedQuery !== searchQuery || deferredSearchQuery !== debouncedQuery) && (
                  <span className="ml-1 text-primary-500 animate-pulse">
                    (searching...)
                  </span>
                )}
              </div>
              <FixedSizeList
                height={window.innerHeight - 300} // Adjust based on header height
                itemCount={filteredExercises.length}
                itemSize={80}
                width="100%"
                className="divide-y divide-gray-200 dark:divide-gray-800"
              >
                {({ index, style }: ListChildComponentProps) => {
                  const exercise = filteredExercises[index];
                  return (
                    <div style={style}>
                      <button
                        onClick={() => {
                          onSelect(exercise);
                          onClose();
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-surface-dark transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
                        aria-label={`Select exercise ${exercise.name}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 dark:text-gray-100 truncate">
                              <SearchHighlight
                                text={exercise.name}
                                query={deferredSearchQuery}
                              />
                            </h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-surface-dark rounded text-slate-500 dark:text-gray-400">
                                {exercise.category}
                              </span>
                              {getEquipmentCategories(exercise.equipment).map((category) => (
                                <span
                                  key={category}
                                  className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded"
                                >
                                  {category}
                                </span>
                              ))}
                              {exercise.equipment.length > 0 && (
                                <span className="text-xs text-slate-500 dark:text-gray-400">
                                  {exercise.equipment.join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                          <span
                            className={cn(
                              'text-xs px-2 py-1 rounded',
                              exercise.difficulty === 'beginner' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                              exercise.difficulty === 'intermediate' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                              exercise.difficulty === 'advanced' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            )}
                          >
                            {exercise.difficulty}
                          </span>
                        </div>
                      </button>
                    </div>
                  );
                }}
              </FixedSizeList>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

