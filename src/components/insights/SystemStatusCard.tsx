import { AlertCircle } from 'lucide-react';
import { SmartAlerts } from '@/types/insights';

interface SystemStatusCardProps {
  alerts: SmartAlerts;
}

export function SystemStatusCard({ alerts }: SystemStatusCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimal':
        return 'text-primary';
      case 'good':
        return 'text-green-500';
      case 'moderate':
        return 'text-yellow-500';
      case 'low':
        return 'text-red-500';
      default:
        return 'text-primary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'optimal':
        return 'Optimal';
      case 'good':
        return 'Good';
      case 'moderate':
        return 'Moderate';
      case 'low':
        return 'Low';
      default:
        return 'Optimal';
    }
  };

  return (
    <div className="px-4 pt-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-end justify-between">
          <div className="flex flex-col">
            <p className="text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              System Status
            </p>
            <h1 className="text-4xl font-bold tracking-tighter text-black dark:text-white mt-1">
              {getStatusText(alerts.readinessStatus)}{' '}
              <span className={`text-2xl align-top ${getStatusColor(alerts.readinessStatus)}`}>●</span>
            </h1>
          </div>
          <div className="text-right">
            <span className="text-4xl font-bold text-primary">{alerts.readinessScore}%</span>
          </div>
        </div>
        <div className="relative w-full h-4 bg-gray-200 dark:bg-[#1c3a2f] rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-700 ease-out"
            style={{ width: `${alerts.readinessScore}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-[#90cba8]">{alerts.readinessMessage}</p>
      </div>
    </div>
  );
}

