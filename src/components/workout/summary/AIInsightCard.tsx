import { AIInsight } from '@/types/workoutSummary';

interface AIInsightCardProps {
  insights: AIInsight[];
}

export function AIInsightCard({ insights }: AIInsightCardProps) {
  if (insights.length === 0) {
    return null;
  }

  // Show the highest priority insight, or first one if all same priority
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  const sortedInsights = [...insights].sort(
    (a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]
  );
  const insight = sortedInsights[0];

  return (
    <div className="px-4">
      <div className="relative overflow-hidden p-5 rounded-xl bg-gradient-to-br from-gray-900 to-black border border-primary/20 shadow-sm group">
        {/* Background decorative element */}
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all"></div>
        <div className="relative z-10 flex gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">auto_awesome</span>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-white mb-1">{insight.title}</h4>
            <p className="text-sm text-gray-300 leading-snug">{insight.message}</p>
            {insight.recommendation && (
              <p className="text-xs text-primary mt-2 font-medium">{insight.recommendation}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

