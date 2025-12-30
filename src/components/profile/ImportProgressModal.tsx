import { Upload, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { ImportResult } from '@/types/export';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface ImportProgressModalProps {
  isOpen: boolean;
  progress: {
    percentage: number;
    currentOperation: string;
    completedItems: number;
    totalItems: number;
  } | null;
  result: ImportResult | null;
  onClose: () => void;
}

export function ImportProgressModal({
  isOpen,
  progress,
  result,
  onClose,
}: ImportProgressModalProps) {
  if (!isOpen) return null;

  const isComplete = result !== null;
  const hasErrors = result ? result.errors.length > 0 : false;
  const hasSkipped = result ? result.skipped > 0 : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 safe-area-inset">
      <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto touch-pan-y">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            {isComplete ? (
              hasErrors ? (
                <XCircle className="w-8 h-8 text-yellow-500" />
              ) : (
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              )
            ) : (
              <Upload className="w-8 h-8 text-primary" />
            )}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {isComplete
                  ? hasErrors
                    ? 'Import Completed with Errors'
                    : 'Import Complete'
                  : 'Importing Data'}
              </h2>
              {progress && !isComplete && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {progress.currentOperation}
                </p>
              )}
            </div>
          </div>

          {progress && !isComplete && (
            <>
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="w-full bg-gray-200 dark:bg-surface-border rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-300"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-slate-600 dark:text-slate-400">
                  <span>{progress.percentage}%</span>
                  <span>
                    {progress.completedItems} of {progress.totalItems} steps
                  </span>
                </div>
              </div>

              {/* Loading Indicator */}
              <div className="flex items-center justify-center py-4">
                <LoadingSpinner size="md" />
              </div>
            </>
          )}

          {isComplete && result && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <h3 className="font-semibold text-green-900 dark:text-green-300">
                    Successfully Imported
                  </h3>
                </div>
                <p className="text-sm text-green-800 dark:text-green-400">
                  {result.imported} items imported successfully
                </p>
                {hasSkipped && (
                  <p className="text-sm text-green-700 dark:text-green-500 mt-1">
                    {result.skipped} items skipped (duplicates)
                  </p>
                )}
              </div>

              {/* Details */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Import Details
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Workouts:</span>
                    <span className="ml-2 font-medium text-slate-900 dark:text-white">
                      {result.details.workouts.imported}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Templates:</span>
                    <span className="ml-2 font-medium text-slate-900 dark:text-white">
                      {result.details.templates.imported}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Planned:</span>
                    <span className="ml-2 font-medium text-slate-900 dark:text-white">
                      {result.details.plannedWorkouts.imported}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Exercises:</span>
                    <span className="ml-2 font-medium text-slate-900 dark:text-white">
                      {result.details.customExercises.imported}
                    </span>
                  </div>
                </div>
              </div>

              {/* Errors */}
              {hasErrors && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    <h3 className="font-semibold text-yellow-900 dark:text-yellow-300">
                      {result.errors.length} Error(s)
                    </h3>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {result.errors.slice(0, 5).map((error, index) => (
                      <p
                        key={index}
                        className="text-xs text-yellow-800 dark:text-yellow-400"
                      >
                        {error.type}: {error.message}
                      </p>
                    ))}
                    {result.errors.length > 5 && (
                      <p className="text-xs text-yellow-700 dark:text-yellow-500">
                        ...and {result.errors.length - 5} more errors
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Close Button */}
                {isComplete && (
                    <button
                        onClick={onClose}
                        className="w-full mt-6 px-4 py-2 rounded-xl bg-primary hover:bg-[#0be060] text-black font-medium transition-colors touch-manipulation active:scale-[0.98] min-h-[44px]"
                    >
                        Close
                    </button>
                )}
        </div>
      </div>
    </div>
  );
}

