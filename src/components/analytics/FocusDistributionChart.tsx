import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface FocusDistributionChartProps {
  legs: number;
  push: number;
  pull: number;
}

export function FocusDistributionChart({ legs, push, pull }: FocusDistributionChartProps) {
  const data = [
    { name: 'Legs', value: legs, color: '#0df269' },
    { name: 'Push', value: push, color: '#15803d' },
    { name: 'Pull', value: pull, color: '#4ade80' },
  ];

  const totalSets = legs + push + pull;

  if (totalSets === 0) {
    return (
      <div className="bg-white dark:bg-surface-dark rounded-xl p-6 border border-gray-100 dark:border-[#316847]">
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          No workout data available
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-surface-dark rounded-xl p-6 border border-gray-100 dark:border-[#316847]">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 px-1">
        Focus Distribution
      </h3>
      <div className="flex flex-col sm:flex-row items-center gap-8 justify-center">
        <div className="relative h-40 w-40 rounded-full shrink-0 shadow-lg">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={56}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-28 w-28 rounded-full bg-white dark:bg-surface-dark flex items-center justify-center flex-col">
              <span className="text-xs text-gray-500 font-medium uppercase">Total Sets</span>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {Math.round((legs + push + pull) / 10)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 w-full sm:w-auto">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-sm font-medium text-slate-700 dark:text-gray-200">
                  {item.name}
                </span>
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {item.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

