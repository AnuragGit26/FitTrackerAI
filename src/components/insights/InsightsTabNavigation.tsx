import { motion } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
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

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 });

  useEffect(() => {
    const updateIndicator = () => {
      const activeIndex = tabs.findIndex(tab => tab.id === currentView);
      const activeTab = tabRefs.current[activeIndex];
      const container = containerRef.current;

      if (activeTab && container) {
        const containerRect = container.getBoundingClientRect();
        const tabRect = activeTab.getBoundingClientRect();
        
        setIndicatorStyle({
          width: tabRect.width,
          left: tabRect.left - containerRect.left,
        });
      }
    };

    updateIndicator();
    
    const handleResize = () => {
      updateIndicator();
    };

    window.addEventListener('resize', handleResize);
    const timer = setTimeout(updateIndicator, 10);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [currentView]);

  return (
    <div className="sticky top-[63px] z-40 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-gray-200 dark:border-[#316847]">
      <div ref={containerRef} className="flex items-center justify-center gap-2 p-2 relative">
        <motion.div
          className="absolute h-[calc(100%-16px)] bg-primary rounded-lg top-2"
          animate={{
            width: indicatorStyle.width,
            left: indicatorStyle.left,
          }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 30,
            mass: 0.8,
          }}
        />
        {tabs.map((tab, index) => (
          <motion.button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            onClick={() => onViewChange(tab.id)}
            className={cn(
              'relative z-10 flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              currentView === tab.id
                ? 'text-background-dark'
                : 'text-gray-600 dark:text-gray-300'
            )}
            style={{
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

