import { Upload, CheckCircle2, XCircle, AlertTriangle, Info, AlertCircle, Cloud } from 'lucide-react';
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
    if (!acc[category]) {
    acc[category] = [];
  }
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
              <p className="text-sm text-slate-500 dark:text-gray-400">
                {progress.currentOperation}
              </p>
            </div>
          </div>
        )}

        {progress && !isComplete && (
          <>
            {/* Progress Bar */}
            <div>
              <div className="w-full bg-white dark:bg-surface-dark-light rounded-full h-3 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-sm text-slate-500 dark:text-gray-400">
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

            {/* Validation Warnings (shown during import if present) */}
            {!isComplete && result && result.errors.length > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm font-medium text-yellow-900 dark:text-yellow-300">
                    {result.errors.filter(e => e.severity === 'warning').length} Warning(s)
                  </span>
                </div>
                <p className="text-xs text-yellow-800 dark:text-yellow-400">
                  Some issues detected. Import will continue and details will be shown after completion.
                </p>
              </div>
            )}
          </>
        )}

        {isComplete && result && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                {hasErrors ? (
                  <XCircle className="w-5 h-5 text-yellow-500" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                )}
                <h3 className="font-semibold text-blue-900 dark:text-blue-300">
                  {hasErrors ? 'Import Completed with Errors' : 'Successfully Imported'}
                </h3>
              </div>
              <p className="text-sm text-blue-800 dark:text-blue-400">
                {result.imported} items imported successfully
              </p>
              {hasSkipped && (
                <p className="text-sm text-blue-700 dark:text-blue-500 mt-1">
                  {result.skipped} items skipped (duplicates)
                </p>
              )}
            </div>

            {/* Sync Status Section */}
            {progress?.currentOperation === 'Syncing to cloud...' && (
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <Cloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h4 className="font-semibold text-blue-900 dark:text-blue-300">
                    Cloud Sync Status
                  </h4>
                </div>
                <p className="text-sm text-blue-800 dark:text-blue-400">
                  Your imported data has been saved locally and is syncing to Firestore...
                </p>
              </div>
            )}

            {/* Details */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-gray-300">
                Import Details
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-500 dark:text-gray-400">Workouts:</span>
                  <span className="ml-2 font-medium text-slate-900 dark:text-white">
                    {result.details.workouts.imported}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-gray-400">Templates:</span>
                  <span className="ml-2 font-medium text-slate-900 dark:text-white">
                    {result.details.templates.imported}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-gray-400">Planned:</span>
                  <span className="ml-2 font-medium text-slate-900 dark:text-white">
                    {result.details.plannedWorkouts.imported}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-gray-400">Exercises:</span>
                  <span className="ml-2 font-medium text-slate-900 dark:text-white">
                    {result.details.customExercises.imported}
                  </span>
                </div>
              </div>
            </div>

            {/* Errors - Grouped by Category */}
            {hasErrors && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    <h3 className="font-semibold text-slate-900 dark:text-gray-100">
                      {result.errors.length} Issue{result.errors.length !== 1 ? 's' : ''} Found
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      // Expand all categories
                      const allCategories = new Set(Object.keys(errorsByCategory));
                      setExpandedCategories(allCategories);
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Expand All
                  </button>
                </div>

                {/* Error Summary Statistics */}
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-surface-dark border border-gray-100 dark:border-border-dark">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-gray-300 mb-2">
                    Error Summary
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 dark:text-gray-400">Errors:</span>
                      <span className="ml-1 font-medium text-red-600 dark:text-red-400">
                        {result.errors.filter(e => e.severity === 'error').length}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-gray-400">Warnings:</span>
                      <span className="ml-1 font-medium text-yellow-600 dark:text-yellow-400">
                        {result.errors.filter(e => e.severity === 'warning').length}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-gray-400">Info:</span>
                      <span className="ml-1 font-medium text-blue-600 dark:text-blue-400">
                        {result.errors.filter(e => e.severity === 'info').length}
                      </span>
                    </div>
                  </div>
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
                          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-surface-dark transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {getSeverityIcon(
                              hasErrors ? 'error' : hasWarnings ? 'warning' : 'info'
                            )}
                            <span className="font-medium text-sm text-slate-900 dark:text-gray-100">
                              {formatCategoryName(category)}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-gray-400">
                              ({errorCount})
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 dark:text-gray-400">
                            {isExpanded ? '▼' : '▶'}
                          </span>
                        </button>
                        
                        {isExpanded && (
                          <div className="border-t border-gray-100 dark:border-border-dark p-3 space-y-3 bg-gray-50 dark:bg-background-dark/50">
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

