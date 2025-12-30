import { Download, CheckCircle2, XCircle } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface ExportProgressModalProps {
    isOpen: boolean;
    progress: {
        percentage: number;
        currentOperation: string;
        completedItems: number;
        totalItems: number;
    } | null;
    error?: string | null;
    onClose: () => void;
}

export function ExportProgressModal({
    isOpen,
    progress,
    error,
    onClose,
}: ExportProgressModalProps) {
    if (!isOpen) return null;

    const isComplete = progress?.percentage === 100 && !error;
    const hasError = !!error;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 safe-area-inset">
            <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-xl max-w-md w-full p-6 touch-pan-y">
                <div className="flex items-center gap-4 mb-6">
                    {isComplete ? (
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                    ) : hasError ? (
                        <XCircle className="w-8 h-8 text-red-500" />
                    ) : (
                        <Download className="w-8 h-8 text-primary" />
                    )}
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            {isComplete
                                ? 'Export Complete'
                                : hasError
                                    ? 'Export Failed'
                                    : 'Exporting Data'}
                        </h2>
                        {progress && (
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

                {isComplete && (
                    <div className="text-center py-4">
                        <p className="text-slate-700 dark:text-slate-300">
                            Your data has been exported successfully. The file should download
                            automatically.
                        </p>
                    </div>
                )}

                {hasError && (
                    <div className="text-center py-4">
                        <p className="text-red-700 dark:text-red-400 font-medium mb-2">
                            Export Failed
                        </p>
                        <p className="text-sm text-red-600 dark:text-red-500">
                            {error}
                        </p>
                    </div>
                )}

                {(isComplete || hasError) && (
                    <button
                        onClick={onClose}
                        className="w-full mt-4 px-4 py-2 rounded-xl bg-primary hover:bg-[#0be060] text-black font-medium transition-colors touch-manipulation active:scale-[0.98] min-h-[44px]"
                    >
                        Close
                    </button>
                )}
            </div>
        </div>
    );
}

