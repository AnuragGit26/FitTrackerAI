import { Moon, Coffee } from 'lucide-react';
import { TrainingPattern } from '@/types/insights';
import { cleanPlainTextResponse } from '@/utils/aiResponseCleaner';

interface TrainingPatternsSectionProps {
  patterns: TrainingPattern[];
}

export function TrainingPatternsSection({ patterns }: TrainingPatternsSectionProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'sleep':
        return <Moon className="w-5 h-5" />;
      case 'caffeine':
        return <Coffee className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'sleep':
        return 'text-indigo-500 dark:text-indigo-400';
      case 'caffeine':
        return 'text-orange-500 dark:text-orange-400';
      default:
        return 'text-slate-500 dark:text-gray-400';
    }
  };

  if (patterns.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-slate-800 dark:text-white text-lg font-bold mb-3 px-1">Training Patterns</h2>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 snap-x scroll-smooth">
        {patterns.map((pattern, index) => (
          <div
            key={pattern.id || `pattern-${index}`}
            className="snap-center shrink-0 w-64 bg-white dark:bg-surface-card rounded-xl p-4 border border-gray-100 dark:border-border-dark/50 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
          >
            <div>
              <div className={`flex items-center gap-2 mb-2 ${getColor(pattern.type)}`}>
                {getIcon(pattern.type)}
                <span className="text-xs font-bold uppercase tracking-wider">{pattern.title}</span>
              </div>
              <p className="text-slate-800 dark:text-white font-medium text-sm">
                You lift <span className="text-primary font-bold">{cleanPlainTextResponse(pattern.impact)}</span> when {cleanPlainTextResponse(pattern.description)}.
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

