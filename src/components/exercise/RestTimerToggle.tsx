import { useState } from 'react';
import { cn } from '@/utils/cn';

interface RestTimerToggleProps {
  enabled?: boolean;
  onChange?: (enabled: boolean) => void;
  className?: string;
}

export function RestTimerToggle({
  enabled: controlledEnabled,
  onChange,
  className,
}: RestTimerToggleProps) {
  const [internalEnabled, setInternalEnabled] = useState(false);
  const isControlled = controlledEnabled !== undefined;
  const enabled = isControlled ? controlledEnabled : internalEnabled;

  const handleToggle = () => {
    const newValue = !enabled;
    if (!isControlled) {
      setInternalEnabled(newValue);
    }
    onChange?.(newValue);
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
        Rest Timer
      </span>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={handleToggle}
          className="sr-only peer"
        />
        <div
          className={cn(
            'w-11 h-6 rounded-full peer-focus:outline-none transition-colors relative',
            'after:content-[""] after:absolute after:top-[2px] after:start-[2px]',
            'after:bg-white after:border after:border-gray-100 dark:after:border-[#27272a] after:rounded-full after:h-5 after:w-5',
            'after:transition-all',
            enabled
              ? 'bg-primary after:translate-x-full rtl:after:-translate-x-full after:border-white'
              : 'bg-white dark:bg-[#27272a]'
          )}
        />
      </label>
    </div>
  );
}

