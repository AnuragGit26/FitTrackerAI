import { useState, useEffect, useRef, useCallback } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { useMuscleRecovery } from '@/hooks/useMuscleRecovery';

export function RestConfigurationPanel() {
  const { settings, setBaseRestInterval, toggleNotifications } = useSettingsStore();
  const { refetch: recalculateRecovery } = useMuscleRecovery();
  const [restInterval, setRestInterval] = useState(settings.baseRestInterval || 48);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setRestInterval(settings.baseRestInterval || 48);
  }, [settings.baseRestInterval]);

  // Debounced handler that updates settings and triggers recalculation
  const handleRestIntervalChange = useCallback((value: number) => {
    // Update local state immediately for responsive UI
    setRestInterval(value);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounced timer (500ms delay)
    debounceTimerRef.current = setTimeout(async () => {
      await setBaseRestInterval(value);
      // Trigger recalculation of all recovery data
      recalculateRecovery();
    }, 500);
  }, [setBaseRestInterval, recalculateRecovery]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div>
      <h3 className="text-lg font-bold leading-tight mb-4">Configurations</h3>
      <div className="bg-slate-100 dark:bg-white/5 rounded-xl p-5 border border-slate-200 dark:border-white/5">
        <div className="flex justify-between items-center mb-4">
          <span className="text-slate-900 dark:text-white font-medium">Base Rest Interval</span>
          <span className="text-primary font-bold">{restInterval} Hours</span>
        </div>
        <input
          type="range"
          min="12"
          max="72"
          step="4"
          value={restInterval}
          onChange={(e) => handleRestIntervalChange(Number(e.target.value))}
          className="w-full h-2 bg-slate-300 dark:bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary"
        />
        <div className="flex justify-between mt-2 text-xs text-slate-500">
          <span>12h</span>
          <span>72h</span>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-300 dark:border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-900 dark:text-white font-medium">Smart Notifications</p>
              <p className="text-xs text-slate-500 mt-0.5">Alert when recovery is 100%</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notificationsEnabled}
                onChange={() => toggleNotifications()}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 dark:peer-focus:ring-primary/80 rounded-full peer dark:bg-surface-dark-light peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-100 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

