import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '@/components/common/Modal';

interface WorkoutTimerCardProps {
  formattedTime: string;
  isVisible: boolean;
  isRunning: boolean;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
}

export function WorkoutTimerCard({
  formattedTime,
  isVisible,
  isRunning,
  onPause,
  onResume,
  onReset,
}: WorkoutTimerCardProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  if (!isVisible) {
    return null;
  }

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    onReset();
    setShowResetConfirm(false);
  };

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="px-4 mb-4"
          >
            <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-2xl border border-gray-200 dark:border-[#316847] shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center justify-center size-12 rounded-xl bg-primary/10">
                    <span className="material-symbols-outlined text-primary text-2xl">
                      timer
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">
                      Workout Duration
                    </p>
                    <p className="tabular-nums text-2xl font-display font-bold text-gray-900 dark:text-white tracking-tight">
                      {formattedTime}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Pause/Resume Button */}
                  <button
                    onClick={isRunning ? onPause : onResume}
                    className="flex items-center justify-center size-10 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                    aria-label={isRunning ? 'Pause timer' : 'Resume timer'}
                    title={isRunning ? 'Pause' : 'Resume'}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {isRunning ? 'pause' : 'play_arrow'}
                    </span>
                  </button>
                  {/* Reset Button */}
                  <button
                    onClick={handleReset}
                    className="flex items-center justify-center size-10 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-error/10 hover:text-error transition-colors text-gray-700 dark:text-gray-300"
                    aria-label="Reset timer"
                    title="Reset"
                  >
                    <span className="material-symbols-outlined text-xl">refresh</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        title="Reset Timer"
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to reset the workout timer? This will clear all timer data and cannot be undone.
          </p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowResetConfirm(false)}
              className="flex-1 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmReset}
              className="flex-1 h-12 rounded-lg bg-error text-white font-bold hover:bg-error/90 transition-colors"
            >
              Reset Timer
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
