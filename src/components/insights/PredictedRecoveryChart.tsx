import { RecoveryPrediction } from '@/types/insights';
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { Dumbbell, ArrowDownToLine, ArrowUpFromLine, Footprints, Moon, HeartPulse, Trophy, Battery } from 'lucide-react';

interface PredictedRecoveryChartProps {
  predictions: RecoveryPrediction[];
}

export function PredictedRecoveryChart({ predictions }: PredictedRecoveryChartProps) {
  if (predictions.length === 0) {
    return null;
  }

  // Prepare data for chart
  const data = predictions.map((pred) => ({
    ...pred,
    // Ensure recovery is at least 5% for visibility
    displayRecovery: Math.max(5, pred.recoveryPercentage),
    // Map workout type to a numeric value for scatter/dot placement or bar height
    workoutTypeIndex: 10, // Just a placeholder for visual alignment if needed
    prPotentialScore: pred.prPotential && pred.prPotential.length > 0 ? 95 : null,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as RecoveryPrediction;
      return (
        <div className="bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/10 rounded-lg p-3 shadow-lg max-w-[200px]">
          <p className="font-bold text-slate-900 dark:text-white mb-1">{data.dayLabel}</p>
          <p className="text-sm text-slate-600 dark:text-gray-300">
            Recovery: <span className={`font-bold ${
              data.recoveryPercentage >= 90 ? 'text-blue-500' : 
              data.recoveryPercentage >= 75 ? 'text-blue-500' : 
              data.recoveryPercentage >= 50 ? 'text-amber-500' : 'text-red-500'
            }`}>{data.recoveryPercentage}%</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 capitalize">
            Focus: {data.workoutType || 'Rest'}
          </p>
          {data.prPotential && data.prPotential.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-white/10">
              <p className="text-xs font-bold text-purple-500 flex items-center gap-1">
                <span className="text-sm">🏆</span> PR Potential
              </p>
              <ul className="text-[10px] text-slate-500 dark:text-gray-400 list-disc list-inside">
                {data.prPotential.map((pr, i) => (
                  <li key={i}>{pr}</li>
                ))}
              </ul>
            </div>
          )}
          {data.fatigueWarnings && data.fatigueWarnings.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-white/10">
              <p className="text-xs font-bold text-amber-500 flex items-center gap-1">
                <span className="text-sm">⚠️</span> High Fatigue
              </p>
              <ul className="text-[10px] text-slate-500 dark:text-gray-400 list-disc list-inside">
                {data.fatigueWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const getWorkoutIcon = (type: string) => {
    switch (type) {
      case 'push': return <ArrowUpFromLine className="w-3 h-3 text-blue-500" />;
      case 'pull': return <ArrowDownToLine className="w-3 h-3 text-violet-500" />;
      case 'legs': return <Footprints className="w-3 h-3 text-amber-500" />;
      case 'cardio': return <HeartPulse className="w-3 h-3 text-pink-500" />;
      case 'rest': return <Moon className="w-3 h-3 text-slate-400" />;
      default: return <Dumbbell className="w-3 h-3 text-slate-400" />;
    }
  };

  const getWorkoutLabel = (type: string) => {
    switch (type) {
      case 'push': return 'Push';
      case 'pull': return 'Pull';
      case 'legs': return 'Legs';
      case 'cardio': return 'Cardio';
      case 'rest': return 'Rest';
      default: return 'Mixed';
    }
  };

  return (
    <div className="mt-6 px-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-slate-900 dark:text-white text-lg font-bold">Predicted Recovery</h3>
          <p className="text-xs text-slate-500 dark:text-gray-400">Recovery forecast & training schedule</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-[10px] text-slate-500 dark:text-gray-400">Optimal</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <span className="text-[10px] text-slate-500 dark:text-gray-400">Fatigue</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-card-dark rounded-xl p-4 border border-gray-100 dark:border-white/5 h-[340px] flex flex-col">
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="recoveryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
              
              <XAxis 
                dataKey="dayLabel" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                dy={10}
              />
              
              <YAxis 
                domain={[0, 100]} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                ticks={[0, 25, 50, 75, 100]}
              />
              
              <Tooltip cursor={{ opacity: 0.1 }} content={<CustomTooltip />} />
              
              {/* Zones */}
              <ReferenceLine y={90} stroke="#10b981" strokeDasharray="3 3" opacity={0.3} label={{ value: 'PR Zone', position: 'insideTopRight', fill: '#10b981', fontSize: 10, opacity: 0.7 }} />
              <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="3 3" opacity={0.3} />

              {/* Recovery Area */}
              <Area
                type="monotone"
                dataKey="displayRecovery"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#recoveryGradient)"
                activeDot={{ r: 4, strokeWidth: 0 }}
              />

              {/* Custom Dot for PR Potential */}
              <Line
                type="monotone"
                dataKey="prPotentialScore"
                stroke="none"
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  if (!payload.prPotential || payload.prPotential.length === 0) {
    return null;
  }
                  return (
                    <circle cx={cx} cy={cy} r={4} fill="#a855f7" stroke="#fff" strokeWidth={1.5} />
                  );
                }}
              />

            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* Intelligent Schedule Row */}
        <div className="flex justify-between items-start mt-4 pt-4 border-t border-gray-100 dark:border-white/5 px-2">
          {data.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 w-full">
              <div 
                className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5"
                title={d.workoutType}
              >
                {getWorkoutIcon(d.workoutType || 'rest')}
              </div>
              <span className="text-[9px] font-medium text-slate-600 dark:text-slate-300 uppercase tracking-tight">
                {getWorkoutLabel(d.workoutType || 'rest')}
              </span>
              
              {/* Mini Status Indicators */}
              <div className="flex gap-0.5 h-1">
                {d.prPotential && d.prPotential.length > 0 && (
                  <div className="w-1 h-1 rounded-full bg-purple-500" title="PR Potential" />
                )}
                {d.fatigueWarnings && d.fatigueWarnings.length > 0 && (
                  <div className="w-1 h-1 rounded-full bg-amber-500" title="High Fatigue" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
