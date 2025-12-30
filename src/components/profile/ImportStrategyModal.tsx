import { useState } from 'react';
import { X, AlertTriangle, Merge, RefreshCw } from 'lucide-react';
import { ImportStrategy, ImportPreview } from '@/types/export';
import { cn } from '@/utils/cn';

interface ImportStrategyModalProps {
  preview: ImportPreview;
  onSelect: (strategy: ImportStrategy) => void;
  onCancel: () => void;
}

export function ImportStrategyModal({
  preview,
  onSelect,
  onCancel,
}: ImportStrategyModalProps) {
  const [selectedStrategy, setSelectedStrategy] =
    useState<ImportStrategy | null>(null);

  const handleConfirm = () => {
    if (selectedStrategy) {
      onSelect(selectedStrategy);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 safe-area-inset">
      <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto touch-pan-y">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-surface-dark border-b border-gray-200 dark:border-surface-border p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Choose Import Strategy
          </h2>
          <button
            onClick={onCancel}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-surface-dark-light transition-colors"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Preview */}
        <div className="p-4 border-b border-gray-200 dark:border-surface-border">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Import Preview
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Workouts:</span>
              <span className="ml-2 font-medium text-slate-900 dark:text-white">
                {preview.dataCounts.workouts}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Templates:</span>
              <span className="ml-2 font-medium text-slate-900 dark:text-white">
                {preview.dataCounts.templates}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Planned:</span>
              <span className="ml-2 font-medium text-slate-900 dark:text-white">
                {preview.dataCounts.plannedWorkouts}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Exercises:</span>
              <span className="ml-2 font-medium text-slate-900 dark:text-white">
                {preview.dataCounts.customExercises}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Sleep Logs:</span>
              <span className="ml-2 font-medium text-slate-900 dark:text-white">
                {preview.dataCounts.sleepLogs}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Recovery:</span>
              <span className="ml-2 font-medium text-slate-900 dark:text-white">
                {preview.dataCounts.recoveryLogs}
              </span>
            </div>
          </div>
          {preview.userProfile && (
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Profile: {preview.userProfile.name}
            </div>
          )}
        </div>

        {/* Strategy Options */}
        <div className="p-4 space-y-3">
          {/* Merge Option */}
          <button
            onClick={() => setSelectedStrategy('merge')}
            className={cn(
              'w-full p-4 rounded-xl border-2 text-left transition-all touch-manipulation',
              'active:scale-[0.98] min-h-[44px]', // iOS touch target
              selectedStrategy === 'merge'
                ? 'border-primary bg-primary/10 dark:bg-primary/20'
                : 'border-gray-200 dark:border-surface-border hover:border-primary/50 active:border-primary/50'
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5',
                  selectedStrategy === 'merge'
                    ? 'border-primary bg-primary'
                    : 'border-gray-300 dark:border-surface-border'
                )}
              >
                {selectedStrategy === 'merge' && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Merge className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    Merge with Existing Data
                  </h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Add new records and skip duplicates. Your existing data will be
                  preserved.
                </p>
              </div>
            </div>
          </button>

          {/* Replace Option */}
          <button
            onClick={() => setSelectedStrategy('replace')}
            className={cn(
              'w-full p-4 rounded-xl border-2 text-left transition-all touch-manipulation',
              'active:scale-[0.98] min-h-[44px]', // iOS touch target
              selectedStrategy === 'replace'
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                : 'border-gray-200 dark:border-surface-border hover:border-red-500/50 active:border-red-500/50'
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5',
                  selectedStrategy === 'replace'
                    ? 'border-red-500 bg-red-500'
                    : 'border-gray-300 dark:border-surface-border'
                )}
              >
                {selectedStrategy === 'replace' && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <RefreshCw className="w-5 h-5 text-red-500" />
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    Replace All Data
                  </h3>
                </div>
                <div className="flex items-start gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                    Warning: This will delete all your existing data before importing.
                  </p>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Clear all existing records and import everything from the file.
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-white dark:bg-surface-dark border-t border-gray-200 dark:border-surface-border p-4 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-surface-border text-slate-700 dark:text-slate-300 font-medium hover:bg-gray-50 dark:hover:bg-surface-dark-light transition-colors touch-manipulation active:scale-[0.98] min-h-[44px]"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedStrategy}
            className={cn(
              'flex-1 px-4 py-2 rounded-xl font-medium transition-colors touch-manipulation active:scale-[0.98] min-h-[44px]',
              selectedStrategy
                ? 'bg-primary hover:bg-[#0be060] text-black active:bg-[#0be060]'
                : 'bg-gray-300 dark:bg-surface-border text-slate-500 dark:text-slate-400 cursor-not-allowed'
            )}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

