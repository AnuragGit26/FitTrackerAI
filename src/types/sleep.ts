export interface SleepLog {
  id?: number;
  userId: string;
  date: Date; // Date of the sleep (night of)
  bedtime: Date; // When they went to bed
  wakeTime: Date; // When they woke up
  duration: number; // Calculated duration in minutes
  quality: number; // 1-10 scale
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export interface RecoveryLog {
  id?: number;
  userId: string;
  date: Date; // Date of the recovery check-in
  overallRecovery: number; // 0-100 percentage
  stressLevel: number; // 1-10 scale
  energyLevel: number; // 1-10 scale
  soreness: number; // 1-10 scale
  readinessToTrain: 'full-power' | 'light' | 'rest-day';
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export interface SleepRecoveryEntry {
  sleep?: SleepLog;
  recovery?: RecoveryLog;
  date: Date;
}

export interface SleepMetrics {
  averageDuration: number; // minutes
  averageQuality: number; // 1-10
  totalSleepHours: number;
  sleepTrend: Array<{ date: string; duration: number; quality: number }>;
  consistencyScore: number; // 0-100
  optimalSleepPercentage: number; // % of nights with 7-9 hours
}

export interface RecoveryMetrics {
  averageRecovery: number; // 0-100
  averageStress: number; // 1-10
  averageEnergy: number; // 1-10
  averageSoreness: number; // 1-10
  readinessDistribution: {
    'full-power': number;
    'light': number;
    'rest-day': number;
  };
  recoveryTrend: Array<{ date: string; recovery: number }>;
  correlationWithSleep: number | null; // Correlation coefficient, null if insufficient data
}

