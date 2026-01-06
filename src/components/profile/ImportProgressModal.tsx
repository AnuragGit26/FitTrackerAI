import { Upload, CheckCircle2, XCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { ImportResult, ImportError } from '@/types/export';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/Modal';
import { useState } from 'react';

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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const isComplete = result !== null;
  const hasErrors = result ? result.errors.length > 0 : false;
  const hasSkipped = result ? result.skipped > 0 : false;
  
  // Group errors by category
  const errorsByCategory = result?.errors.reduce((acc, error) => {
    const category = error.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(error);
    return acc;
  }, {} as Record<string, ImportError[]>) || {};
  
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };
  
  const getSeverityIcon = (severity: ImportError['severity']) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
  };
  
  const getSeverityColor = (severity: ImportError['severity']) => {
    switch (severity) {
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-400';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-400';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-400';
      default:
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-400';
    }
  };
  
  const formatCategoryName = (category: string): string => {
    return category
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isComplete
          ? hasErrors
            ? 'Import Completed with Errors'
            : 'Import Complete'
          : 'Importing Data'
      }
      size="md"
      showCloseButton={isComplete}
      closeOnBackdropClick={isComplete}
    >
      <div className="space-y-6">
        {!isComplete && progress && (
          <div className="flex items-center gap-4">
            <Upload className="w-8 h-8 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {progress.currentOperation}
              </p>
            </div>
          </div>
        )}

        {progress && !isComplete && (
          <>
            {/* Progress Bar */}
            <div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-sm text-gray-600 dark:text-gray-400">
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
                {hasErrors ? (
                  <XCircle className="w-5 h-5 text-yellow-500" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                )}
                <h3 className="font-semibold text-green-900 dark:text-green-300">
                  {hasErrors ? 'Import Completed with Errors' : 'Successfully Imported'}
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
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Import Details
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Workouts:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {result.details.workouts.imported}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Templates:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {result.details.templates.imported}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Planned:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {result.details.plannedWorkouts.imported}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Exercises:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {result.details.customExercises.imported}
                  </span>
                </div>
              </div>
            </div>

            {/* Errors - Grouped by Category */}
            {hasErrors && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {result.errors.length} Issue{result.errors.length !== 1 ? 's' : ''} Found
                  </h3>
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {Object.entries(errorsByCategory).map(([category, errors]) => {
                    const isExpanded = expandedCategories.has(category);
                    const errorCount = errors.length;
                    const hasErrors = errors.some(e => e.severity === 'error');
                    const hasWarnings = errors.some(e => e.severity === 'warning');
                    
                    return (
                      <div
                        key={category}
                        className={`border rounded-lg overflow-hidden ${
                          hasErrors
                            ? 'border-red-200 dark:border-red-800'
                            : hasWarnings
                            ? 'border-yellow-200 dark:border-yellow-800'
                            : 'border-blue-200 dark:border-blue-800'
                        }`}
                      >
                        <button
                          onClick={() => toggleCategory(category)}
                          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {getSeverityIcon(
                              hasErrors ? 'error' : hasWarnings ? 'warning' : 'info'
                            )}
                            <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                              {formatCategoryName(category)}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              ({errorCount})
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {isExpanded ? '▼' : '▶'}
                          </span>
                        </button>
                        
                        {isExpanded && (
                          <div className="border-t border-gray-200 dark:border-gray-700 p-3 space-y-3 bg-gray-50 dark:bg-gray-900/50">
                            {errors.map((error, index) => (
                              <div
                                key={index}
                                className={`p-3 rounded-lg border ${getSeverityColor(error.severity)}`}
                              >
                                <div className="flex items-start gap-2">
                                  {getSeverityIcon(error.severity)}
                                  <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium">
                                      {error.message}
                                    </p>
                                    {error.recordName && (
                                      <p className="text-xs opacity-75">
                                        Record: {error.recordName}
                                      </p>
                                    )}
                                    {error.suggestion && (
                                      <p className="text-xs font-medium mt-1">
                                        💡 {error.suggestion}
                                      </p>
                                    )}
                                    {error.technicalMessage && error.technicalMessage !== error.message && (
                                      <details className="mt-1">
                                        <summary className="text-xs cursor-pointer opacity-75 hover:opacity-100">
                                          Technical details
                                        </summary>
                                        <p className="text-xs mt-1 font-mono opacity-75">
                                          {error.technicalMessage}
                                        </p>
                                      </details>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

