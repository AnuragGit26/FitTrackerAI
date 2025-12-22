import { AlertTriangle, Eye, ChevronRight } from 'lucide-react';
import { ProgressAnalysis } from '@/types/insights';
import { cleanPlainTextResponse } from '@/utils/aiResponseCleaner';

interface AttentionNeededSectionProps {
  plateaus: ProgressAnalysis['plateaus'];
  formChecks: ProgressAnalysis['formChecks'];
}

export function AttentionNeededSection({ plateaus, formChecks }: AttentionNeededSectionProps) {
  return (
    <section>
      <h2 className="text-slate-800 dark:text-white text-lg font-bold mb-3 px-1">Attention Needed</h2>
      {plateaus.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/30 rounded-xl p-4 mb-4 flex gap-4 items-start">
          <div className="shrink-0 bg-amber-100 dark:bg-amber-900/40 p-2 rounded-full text-amber-600 dark:text-amber-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-slate-900 dark:text-amber-100 font-bold text-base mb-1">
              Plateau Detected: {plateaus[0].exercise}
            </h3>
            <p className="text-slate-600 dark:text-amber-200/70 text-sm leading-snug">
              {plateaus[0].exercise} stuck at {plateaus[0].weight}lbs for {plateaus[0].weeksStuck} weeks.
            </p>
            <div className="mt-3 bg-white dark:bg-black/20 rounded p-2 text-xs text-slate-700 dark:text-amber-100/90 border border-amber-100 dark:border-amber-700/20">
              <span className="font-bold">AI Tip:</span> {cleanPlainTextResponse(plateaus[0].suggestion)}
            </div>
          </div>
        </div>
      )}
      {formChecks.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-700/30 rounded-xl p-4 flex gap-4 items-center">
          <div className="w-16 h-16 shrink-0 bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden relative">
            <div
              className="w-full h-full bg-cover bg-center opacity-80 mix-blend-overlay"
              style={{
                backgroundImage: 'url("https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200")',
              }}
            />
            <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
              <Eye className="w-6 h-6 text-white drop-shadow-md" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-slate-900 dark:text-red-100 font-bold text-base mb-0.5">
              Form Check: {formChecks[0].exercise}
            </h3>
            <p className="text-slate-600 dark:text-red-200/70 text-xs leading-snug">{cleanPlainTextResponse(formChecks[0].issue)}</p>
          </div>
          <button className="shrink-0 text-red-600 dark:text-red-400">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </section>
  );
}

