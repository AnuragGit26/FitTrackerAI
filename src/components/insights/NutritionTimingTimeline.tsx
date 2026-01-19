import { Egg, UtensilsCrossed } from 'lucide-react';
import { NutritionEvent } from '@/types/insights';
import { cleanPlainTextResponse } from '@/utils/aiResponseCleaner';

interface NutritionTimingTimelineProps {
  events: NutritionEvent[];
}

export function NutritionTimingTimeline({ events }: NutritionTimingTimelineProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'protein':
        return <Egg className="w-4 h-4" />;
      case 'meal':
      case 'carb':
        return <UtensilsCrossed className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (events.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 mt-4">
      <h2 className="text-xl font-bold px-4 flex items-center justify-between">
        <span>Nutrition Timing</span>
        <span className="text-xs font-normal text-primary bg-primary/10 px-2 py-1 rounded-md">Live Feed</span>
      </h2>
      <div className="px-4">
        <div className="relative border-l-2 border-dashed border-gray-100 dark:border-[#1c3a2f] ml-3 space-y-8 py-2">
          {events.map((event, index) => (
            <div key={event.id} className={`relative pl-8 ${index > 0 ? 'opacity-60' : ''}`}>
              <div
                className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-primary ${
                  index === 0 ? 'bg-background-light dark:bg-background-dark' : 'bg-white dark:bg-[#1c3a2f]'
                }`}
              />
              <div className="flex flex-col gap-1">
                <span
                  className={`text-xs font-mono font-bold ${
                    index === 0 ? 'text-primary' : 'text-slate-500 dark:text-gray-400'
                  }`}
                >
                  {event.relativeTime}
                </span>
                <div className="p-3 bg-white dark:bg-surface-dark rounded-lg border border-gray-100 dark:border-white/5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded bg-gray-100 dark:bg-white/10 flex items-center justify-center shrink-0">
                      {getIcon(event.type)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-black dark:text-white">{cleanPlainTextResponse(event.title)}</p>
                      <p className="text-xs text-slate-500 dark:text-gray-400">{cleanPlainTextResponse(event.description)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

