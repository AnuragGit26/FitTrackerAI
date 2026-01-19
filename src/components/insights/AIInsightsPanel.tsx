import { useState, useEffect } from 'react';
import { Brain, RefreshCw } from 'lucide-react';
import { useAIInsights } from '@/hooks/useAIInsights';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Button } from '@/components/common/Button';
import { cleanPlainTextResponse } from '@/utils/aiResponseCleaner';

export function AIInsightsPanel() {
  const { insights, isLoading, generateInsights } = useAIInsights();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!insights && !isLoading) {
      generateInsights();
    }
  }, [insights, isLoading, generateInsights]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await generateInsights();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-surface-dark rounded-lg p-6 border border-gray-100 dark:border-border-dark">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Today's Insight Card */}
      <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg p-6 text-white">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6" />
            <h3 className="text-lg font-semibold">Today&apos;s Insight</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-white hover:bg-white/20"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {insights ? (
          <div>
            <p className="text-primary-50 mb-4">{cleanPlainTextResponse(insights.analysis)}</p>
            {insights.recommendations && insights.recommendations.length > 0 && (
              <div className="mt-4 pt-4 border-t border-primary-400">
                <h4 className="font-semibold mb-2">Recommendations:</h4>
                <ul className="list-disc list-inside space-y-1 text-primary-50">
                  {insights.recommendations.map((rec, index) => (
                    <li key={index}>{cleanPlainTextResponse(rec)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-primary-50">No insights available yet. Start logging workouts to get personalized insights!</p>
        )}
      </div>

      {/* Additional Insights */}
      {insights && (
        <div className="bg-white dark:bg-surface-dark rounded-lg p-6 border border-gray-100 dark:border-border-dark">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-gray-100 mb-4">
            Additional Insights
          </h3>
          {insights.motivation && (
            <div className="mb-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
              <p className="text-sm text-slate-700 dark:text-gray-300">{cleanPlainTextResponse(insights.motivation)}</p>
            </div>
          )}
          {insights.tip && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm font-medium text-slate-900 dark:text-gray-100 mb-1">💡 Tip</p>
              <p className="text-sm text-slate-700 dark:text-gray-300">{cleanPlainTextResponse(insights.tip)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

