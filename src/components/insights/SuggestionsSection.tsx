import { TrendingDown, Moon } from 'lucide-react';
import { Recommendation } from '@/types/insights';
import { cleanPlainTextResponse } from '@/utils/aiResponseCleaner';

interface SuggestionsSectionProps {
  suggestions: Recommendation[];
  onDismiss?: (id: string) => void;
}

export function SuggestionsSection({ suggestions, onDismiss }: SuggestionsSectionProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'deload':
        return <TrendingDown className="w-6 h-6" />;
      case 'sleep':
        return <Moon className="w-6 h-6" />;
      default:
        return null;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'deload':
        return 'bg-blue-500/10 text-blue-400';
      case 'sleep':
        return 'bg-purple-500/10 text-purple-400';
      default:
        return 'bg-gray-500/10 text-gray-400';
    }
  };

  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 mt-2">
      <h2 className="text-xl font-bold px-4">Suggestions</h2>
      <div className="px-4 flex flex-col gap-3">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="p-4 rounded-xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 flex gap-4 items-start shadow-sm"
          >
            <div className={`size-12 rounded-lg ${getColor(suggestion.type)} flex items-center justify-center shrink-0`}>
              {getIcon(suggestion.type)}
            </div>
            <div className="flex flex-col flex-1 gap-2">
              <div>
                <h4 className="font-bold text-base text-black dark:text-white">{cleanPlainTextResponse(suggestion.title)}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{cleanPlainTextResponse(suggestion.description)}</p>
              </div>
              {suggestion.actionLabel && (
                <div className="flex gap-2 mt-1">
                  {suggestion.actionLabel && (
                    <button className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors">
                      {suggestion.actionLabel}
                    </button>
                  )}
                  {suggestion.dismissable && (
                    <button
                      onClick={() => onDismiss?.(suggestion.id)}
                      className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

