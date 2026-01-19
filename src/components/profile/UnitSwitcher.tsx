import { UnitSystem } from '@/store/userStore';
import { cn } from '@/utils/cn';

interface UnitSwitcherProps {
  unit: UnitSystem;
  onUnitChange: (unit: UnitSystem) => void;
}

export function UnitSwitcher({ unit, onUnitChange }: UnitSwitcherProps) {
  return (
    <div className="flex items-center rounded-lg bg-white dark:bg-surface-dark p-1">
      <button
        onClick={() => onUnitChange('metric')}
        className={cn(
          'px-3 py-1 rounded text-xs font-bold transition-all',
          unit === 'metric'
            ? 'bg-white dark:bg-primary text-black shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white'
        )}
      >
        Metric
      </button>
      <button
        onClick={() => onUnitChange('imperial')}
        className={cn(
          'px-3 py-1 rounded text-xs font-bold transition-all',
          unit === 'imperial'
            ? 'bg-white dark:bg-primary text-black shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white'
        )}
      >
        Imperial
      </button>
    </div>
  );
}

