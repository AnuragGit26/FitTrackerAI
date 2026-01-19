import { AlertCircle, Heart } from 'lucide-react';
import { Alert } from '@/types/insights';
import { cleanPlainTextResponse } from '@/utils/aiResponseCleaner';

interface CriticalAlertsCardProps {
  alerts: Alert[];
}

export function CriticalAlertsCard({ alerts }: CriticalAlertsCardProps) {
  if (alerts.length === 0) {
    return null;
  }

  const criticalAlert = alerts.find((a) => a.type === 'critical') || alerts[0];

  return (
    <div className="px-4">
      <h2 className="text-xl font-bold px-0 flex items-center gap-2 mb-4">
        <AlertCircle className="w-5 h-5 text-orange-500 fill-current" />
        Critical Alerts
      </h2>
      <div className="flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-surface-dark shadow-sm border border-gray-100 dark:border-white/5">
        <div className="relative h-48 w-full bg-black">
          <div
            className="absolute inset-0 bg-center bg-cover opacity-80"
            style={{
              backgroundImage: 'url("https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800")',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-dark via-transparent to-transparent" />
          <div className="absolute top-4 right-4 bg-red-500/20 backdrop-blur-sm border border-red-500/50 text-red-100 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            Warning
          </div>
        </div>
        <div className="flex flex-col p-5 gap-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-black dark:text-white leading-tight mb-1">
                {cleanPlainTextResponse(criticalAlert.title)}
              </h3>
              <p className="text-sm text-slate-500 dark:text-[#FF9933] leading-relaxed">{cleanPlainTextResponse(criticalAlert.message)}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs font-mono text-slate-500 dark:text-gray-400">Source: Workout Vol.</span>
            {criticalAlert.actionLabel && (
              <button
                onClick={criticalAlert.actionHandler}
                className="flex-1 max-w-[180px] h-10 bg-primary hover:bg-primary/90 text-[#102318] text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
              >
                <Heart className="w-4 h-4" />
                {criticalAlert.actionLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

