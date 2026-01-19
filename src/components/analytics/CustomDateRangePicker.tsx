import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { format, startOfDay, endOfDay, isAfter } from 'date-fns';
import { Modal } from '@/components/common/Modal';
import { DateRange, getDateRange } from '@/utils/analyticsHelpers';

interface CustomDateRangePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRange: (startDate: Date, endDate: Date) => void;
  currentRange?: DateRange;
}

export function CustomDateRangePicker({
  isOpen,
  onClose,
  onSelectRange,
  currentRange,
}: CustomDateRangePickerProps) {
  const today = new Date();
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Format date for input (YYYY-MM-DD)
  const formatDateForInput = (date: Date): string => {
    return format(date, 'yyyy-MM-dd');
  };

  // Initialize with current range when modal opens
  useEffect(() => {
    if (isOpen) {
      if (currentRange && currentRange !== 'all') {
        const { start, end } = getDateRange(currentRange);
        setStartDate(formatDateForInput(start));
        setEndDate(formatDateForInput(end));
      } else {
        // Default to last 30 days
        const defaultEnd = new Date();
        const defaultStart = new Date();
        defaultStart.setDate(defaultStart.getDate() - 30);
        setStartDate(formatDateForInput(defaultStart));
        setEndDate(formatDateForInput(defaultEnd));
      }
      setError('');
    }
  }, [isOpen, currentRange]);

  const handleApply = () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));

    if (isAfter(start, end)) {
      setError('Start date must be before end date');
      return;
    }

    if (isAfter(start, today)) {
      setError('Start date cannot be in the future');
      return;
    }

    if (isAfter(end, today)) {
      setError('End date cannot be in the future');
      return;
    }

    onSelectRange(start, end);
    onClose();
  };

  const handleQuickSelect = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setStartDate(formatDateForInput(start));
    setEndDate(formatDateForInput(end));
    setError('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Date Range"
      size="md"
    >
      <div className="space-y-4">
        {/* Quick Select Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleQuickSelect(7)}
            className="px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-surface-dark hover:bg-white dark:hover:bg-surface-dark-light text-slate-700 dark:text-gray-300 transition-colors"
          >
            Last 7 Days
          </button>
          <button
            onClick={() => handleQuickSelect(30)}
            className="px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-surface-dark hover:bg-white dark:hover:bg-surface-dark-light text-slate-700 dark:text-gray-300 transition-colors"
          >
            Last 30 Days
          </button>
          <button
            onClick={() => handleQuickSelect(90)}
            className="px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-surface-dark hover:bg-white dark:hover:bg-surface-dark-light text-slate-700 dark:text-gray-300 transition-colors"
          >
            Last 90 Days
          </button>
          <button
            onClick={() => handleQuickSelect(180)}
            className="px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-surface-dark hover:bg-white dark:hover:bg-surface-dark-light text-slate-700 dark:text-gray-300 transition-colors"
          >
            Last 180 Days
          </button>
        </div>

        {/* Date Inputs */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">
              Start Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setError('');
                }}
                max={formatDateForInput(today)}
                className="w-full px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-600 bg-white dark:bg-surface-dark text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">
              End Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setError('');
                }}
                max={formatDateForInput(today)}
                min={startDate}
                className="w-full px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-600 bg-white dark:bg-surface-dark text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-100 dark:border-gray-600 bg-white dark:bg-surface-dark text-slate-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-surface-dark-light transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-background-dark font-medium hover:bg-primary-dark transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </Modal>
  );
}

