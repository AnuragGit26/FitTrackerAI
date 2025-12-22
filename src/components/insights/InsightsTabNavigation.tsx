import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

type View = 'progress' | 'alerts' | 'recommendations';

interface InsightsTabNavigationProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

export function InsightsTabNavigation({ currentView, onViewChange }: InsightsTabNavigationProps) {
  const tabs: Array<{ id: View; label: string }> = [
    { id: 'progress', label: 'Progress' },
    { id: 'alerts', label: 'Alerts' },
    { id: 'recommendations', label: 'Recommendations' },
  ];

  const getTabPosition = () => {
    const index = tabs.findIndex(tab => tab.id === currentView);
    return index;
  };

  return (
    <div className="sticky top-[73px] z-40 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-gray-200 dark:border-[#316847]">
      <div className="flex items-center justify-center gap-2 p-2 relative">
        <motion.div
          className="absolute left-2 right-2 h-[calc(100%-16px)] bg-primary rounded-lg"
          layoutId="insightsTabIndicator"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{
            width: `calc(${100 / tabs.length}% - ${(tabs.length - 1) * 8 / tabs.length}px)`,
            left: `${(getTabPosition() * (100 / tabs.length)) + 8}px`,
          }}
        />
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            onClick={() => onViewChange(tab.id)}
            className={cn(
              'relative z-10 flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              currentView === tab.id
                ? 'text-background-dark'
                : 'text-gray-600 dark:text-gray-300'
            )}
            style={{
              // Remove any border styling from inactive tabs
              border: 'none',
              outline: 'none',
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {tab.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

