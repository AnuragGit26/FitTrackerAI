import { PersonalRecord } from '@/types/workoutSummary';
import { useUserStore } from '@/store/userStore';

interface PersonalRecordsCardProps {
  records: PersonalRecord[];
}

export function PersonalRecordsCard({ records }: PersonalRecordsCardProps) {
  const { profile } = useUserStore();
  const unit = profile?.preferredUnit || 'kg';

  if (records.length === 0) {
    return null;
  }

  const formatValue = (record: PersonalRecord): string => {
    if (record.type === '1rm' || record.type === 'volume' || record.type === 'weight') {
      return `${record.value.toFixed(record.type === '1rm' ? 1 : 0)}${unit}`;
    }
    if (record.type === 'reps') {
      return `${Math.round(record.value)} reps`;
    }
    if (record.type === 'time') {
      const minutes = Math.floor(record.value / 60);
      const seconds = Math.round(record.value % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    if (record.type === 'rest') {
      return `${Math.round(record.value)} sec`;
    }
    return record.value.toString();
  };

  const getRecordIcon = (type: PersonalRecord['type']): string => {
    switch (type) {
      case '1rm':
      case 'weight':
        return 'fitness_center';
      case 'volume':
        return 'trending_up';
      case 'reps':
        return 'repeat';
      case 'time':
        return 'timer';
      case 'rest':
        return 'timelapse';
      default:
        return 'emoji_events';
    }
  };

  const getRecordLabel = (type: PersonalRecord['type']): string => {
    switch (type) {
      case '1rm':
        return 'New 1RM';
      case 'volume':
        return 'Volume PR';
      case 'weight':
        return 'Weight PR';
      case 'reps':
        return 'Reps PR';
      case 'time':
        return 'Best Time';
      case 'rest':
        return 'Best Rest';
      default:
        return 'PR';
    }
  };

  return (
    <div className="px-4 pb-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-primary" style={{ fontSize: '24px' }}>
          emoji_events
        </span>
        <h2 className="text-white text-xl font-bold">Personal Records</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {records.slice(0, 4).map((record, index) => (
          <div
            key={index}
            className={`p-4 rounded-xl border flex flex-col gap-3 relative overflow-hidden group ${
              index === 0
                ? 'bg-[#1c3a29] border-primary/20'
                : 'bg-[#162e21] border-white/5'
            }`}
          >
            {index === 0 && (
              <div className="absolute -right-4 -top-4 bg-primary/10 w-20 h-20 rounded-full blur-xl group-hover:bg-primary/20 transition-all"></div>
            )}
            <div className="flex items-start justify-between">
              <span
                className={`material-symbols-outlined text-2xl ${
                  index === 0 ? 'text-primary' : 'text-[#90cba8]'
                }`}
                style={{ fontSize: '24px' }}
              >
                {getRecordIcon(record.type)}
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                  index === 0
                    ? 'bg-primary/20 text-primary'
                    : 'bg-white/10 text-white'
                }`}
              >
                {getRecordLabel(record.type)}
              </span>
            </div>
            <div>
              {record.exerciseName && (
                <p className="text-[#90cba8] text-xs uppercase font-bold tracking-wider mb-1">
                  {record.exerciseName}
                </p>
              )}
              {!record.exerciseName && (
                <p className="text-[#90cba8] text-xs uppercase font-bold tracking-wider mb-1">
                  {getRecordLabel(record.type)}
                </p>
              )}
              <p className="text-white text-2xl font-bold">
                {formatValue(record)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

