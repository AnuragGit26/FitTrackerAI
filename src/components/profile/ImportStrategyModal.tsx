import { useState } from 'react';
import { AlertTriangle, Merge, RefreshCw } from 'lucide-react';
import { ImportStrategy, ImportPreview } from '@/types/export';
import { cn } from '@/utils/cn';
import { Modal } from '@/components/common/Modal';

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
    <Modal
      isOpen={true}
      onClose={onCancel}
      title="Choose Import Strategy"
      size="md"
      footer={
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors touch-manipulation active:scale-[0.98] min-h-[44px] focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedStrategy}
            className={cn(
              'flex-1 px-4 py-3 rounded-xl font-medium transition-colors touch-manipulation active:scale-[0.98] min-h-[44px] focus:outline-none focus:ring-2 focus:ring-offset-2',
              selectedStrategy
                ? 'bg-primary hover:bg-[#0be060] text-black active:bg-[#0be060] focus:ring-primary'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed focus:ring-gray-400'
            )}
          >
            Continue
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Preview */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Import Preview
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Workouts:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {preview.dataCounts.workouts}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Templates:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {preview.dataCounts.templates}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Planned:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {preview.dataCounts.plannedWorkouts}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Exercises:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {preview.dataCounts.customExercises}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Sleep Logs:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {preview.dataCounts.sleepLogs}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Recovery:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {preview.dataCounts.recoveryLogs}
              </span>
            </div>
          </div>
          {preview.userProfile && (
            <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Profile: {preview.userProfile.name}
            </div>
          )}
        </div>

        {/* Strategy Options */}
        <div className="space-y-3">
          {/* Merge Option */}
          <button
            onClick={() => setSelectedStrategy('merge')}
            className={cn(
              'w-full p-4 rounded-xl border-2 text-left transition-all touch-manipulation',
              'active:scale-[0.98] min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              selectedStrategy === 'merge'
                ? 'border-primary bg-primary/10 dark:bg-primary/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-primary/50 active:border-primary/50'
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
              'active:scale-[0.98] min-h-[44px] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
              selectedStrategy === 'replace'
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-red-500/50 active:border-red-500/50'
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
      </div>
    </Modal>
  );
}

