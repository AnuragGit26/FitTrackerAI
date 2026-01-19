import { SleepLog, RecoveryLog, SleepMetrics, RecoveryMetrics } from '@/types/sleep';
import { db } from './database';
import { dataService } from './dataService';

export const sleepRecoveryService = {
  /**
   * Save sleep log
   */
  async saveSleepLog(sleepLog: SleepLog): Promise<number> {
    const now = new Date();
    const logToSave: SleepLog = {
      ...sleepLog,
      updatedAt: now,
      version: (sleepLog.version || 0) + 1,
    };

    let id: number;
    if (sleepLog.id) {
      await db.sleepLogs.update(sleepLog.id, logToSave);
      id = sleepLog.id;
    } else {
      logToSave.createdAt = now;
      id = await db.sleepLogs.add(logToSave as SleepLog);
    }
    
    // Trigger sync
    // We emit 'sleep' event which dataService maps to 'sleep_logs' table sync
    dataService.notifySleepUpdate();
    
    return id;
  },

  /**
   * Save recovery log
   */
  async saveRecoveryLog(recoveryLog: RecoveryLog): Promise<number> {
    const now = new Date();
    const logToSave: RecoveryLog = {
      ...recoveryLog,
      updatedAt: now,
      version: (recoveryLog.version || 0) + 1,
    };

    let id: number;
    if (recoveryLog.id) {
      await db.recoveryLogs.update(recoveryLog.id, logToSave);
      id = recoveryLog.id;
    } else {
      logToSave.createdAt = now;
      id = await db.recoveryLogs.add(logToSave as RecoveryLog);
    }

    // Trigger sync
    dataService.notifyRecoveryUpdate();

    return id;
  },

  /**
   * Get sleep log for a specific date
   */
  async getSleepLog(userId: string, date: Date): Promise<SleepLog | undefined> {
    const dateStr = date.toISOString().split('T')[0];
    const logs = await db.sleepLogs
      .where('userId')
      .equals(userId)
      .filter((log) => {
        const logDate = new Date(log.date).toISOString().split('T')[0];
        return logDate === dateStr;
      })
      .toArray();

    return logs[0];
  },

  /**
   * Get recovery log for a specific date
   */
  async getRecoveryLog(userId: string, date: Date): Promise<RecoveryLog | undefined> {
    const dateStr = date.toISOString().split('T')[0];
    const logs = await db.recoveryLogs
      .where('userId')
      .equals(userId)
      .filter((log) => {
        const logDate = new Date(log.date).toISOString().split('T')[0];
        return logDate === dateStr;
      })
      .toArray();

    return logs[0];
  },

  /**
   * Get all sleep logs for user
   */
  async getAllSleepLogs(userId: string): Promise<SleepLog[]> {
    return await db.sleepLogs
      .where('userId')
      .equals(userId)
      .reverse()
      .sortBy('date');
  },

  /**
   * Get all recovery logs for user
   */
  async getAllRecoveryLogs(userId: string): Promise<RecoveryLog[]> {
    return await db.recoveryLogs
      .where('userId')
      .equals(userId)
      .reverse()
      .sortBy('date');
  },

  /**
   * Get sleep logs by date range
   */
  async getSleepLogsByRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SleepLog[]> {
    return await db.sleepLogs
      .where('userId')
      .equals(userId)
      .filter((log) => {
        const logDate = new Date(log.date);
        return logDate >= startDate && logDate <= endDate;
      })
      .toArray();
  },

  /**
   * Get recovery logs by date range
   */
  async getRecoveryLogsByRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<RecoveryLog[]> {
    return await db.recoveryLogs
      .where('userId')
      .equals(userId)
      .filter((log) => {
        const logDate = new Date(log.date);
        return logDate >= startDate && logDate <= endDate;
      })
      .toArray();
  },

  /**
   * Calculate sleep metrics
   */
  calculateSleepMetrics(sleepLogs: SleepLog[]): SleepMetrics {
    if (sleepLogs.length === 0) {
      return {
        averageDuration: 0,
        averageQuality: 0,
        totalSleepHours: 0,
        sleepTrend: [],
        consistencyScore: 0,
        optimalSleepPercentage: 0,
      };
    }

    const totalDuration = sleepLogs.reduce((sum, log) => sum + log.duration, 0);
    const averageDuration = totalDuration / sleepLogs.length;
    const averageQuality =
      sleepLogs.reduce((sum, log) => sum + log.quality, 0) / sleepLogs.length;
    const totalSleepHours = totalDuration / 60;

    // Calculate optimal sleep percentage (7-9 hours)
    const optimalCount = sleepLogs.filter(
      (log) => log.duration >= 420 && log.duration <= 540
    ).length;
    const optimalSleepPercentage = (optimalCount / sleepLogs.length) * 100;

    // Calculate consistency score (based on variance in sleep times)
    const durations = sleepLogs.map((log) => log.duration);
    const mean = averageDuration;
    const variance =
      durations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) /
      durations.length;
    const stdDev = Math.sqrt(variance);
    // Consistency score: lower std dev = higher score (max 100)
    const consistencyScore = Math.max(0, 100 - (stdDev / 60) * 10);

    // Build trend data
    const sleepTrend = sleepLogs.map((log) => ({
      date: new Date(log.date).toLocaleDateString(),
      duration: log.duration / 60, // Convert to hours
      quality: log.quality,
    }));

    return {
      averageDuration,
      averageQuality,
      totalSleepHours,
      sleepTrend,
      consistencyScore,
      optimalSleepPercentage,
    };
  },

  /**
   * Calculate recovery metrics
   */
  calculateRecoveryMetrics(recoveryLogs: RecoveryLog[], sleepLogs?: SleepLog[]): RecoveryMetrics {
    if (recoveryLogs.length === 0) {
      return {
        averageRecovery: 0,
        averageStress: 0,
        averageEnergy: 0,
        averageSoreness: 0,
        readinessDistribution: {
          'full-power': 0,
          'light': 0,
          'rest-day': 0,
        },
        recoveryTrend: [],
        correlationWithSleep: null,
      };
    }

    const averageRecovery =
      recoveryLogs.reduce((sum, log) => sum + log.overallRecovery, 0) /
      recoveryLogs.length;
    const averageStress =
      recoveryLogs.reduce((sum, log) => sum + log.stressLevel, 0) /
      recoveryLogs.length;
    const averageEnergy =
      recoveryLogs.reduce((sum, log) => sum + log.energyLevel, 0) /
      recoveryLogs.length;
    const averageSoreness =
      recoveryLogs.reduce((sum, log) => sum + log.soreness, 0) /
      recoveryLogs.length;

    // Calculate readiness distribution
    const readinessDistribution = {
      'full-power': recoveryLogs.filter((log) => log.readinessToTrain === 'full-power').length,
      'light': recoveryLogs.filter((log) => log.readinessToTrain === 'light').length,
      'rest-day': recoveryLogs.filter((log) => log.readinessToTrain === 'rest-day').length,
    };

    // Build trend data
    const recoveryTrend = recoveryLogs.map((log) => ({
      date: new Date(log.date).toLocaleDateString(),
      recovery: log.overallRecovery,
    }));

    // Calculate correlation with sleep if sufficient data
    let correlationWithSleep: number | null = null;
    if (sleepLogs && sleepLogs.length > 0) {
      correlationWithSleep = this.calculateSleepRecoveryCorrelation(sleepLogs, recoveryLogs);
    }

    return {
      averageRecovery,
      averageStress,
      averageEnergy,
      averageSoreness,
      readinessDistribution,
      recoveryTrend,
      correlationWithSleep,
    };
  },

  /**
   * Calculate correlation between sleep and recovery
   * Returns null if insufficient data, otherwise returns correlation coefficient (-1 to 1)
   */
  calculateSleepRecoveryCorrelation(sleepLogs: SleepLog[], recoveryLogs: RecoveryLog[]): number | null {
    if (sleepLogs.length < 3 || recoveryLogs.length < 3) {
    return null;
  }

    // Match logs by date
    const pairs: { sleepQuality: number; recoveryScore: number }[] = [];
    
    recoveryLogs.forEach(rLog => {
      // Find sleep log for the previous night (recovery is usually logged in morning for previous night's sleep)
      // OR same date if the date represents "night of".
      // Assuming date represents the day the log was made (morning), so it corresponds to sleep from previous night.
      // But SleepLog date: "Date of the sleep (night of)".
      // RecoveryLog date: "Date of the recovery check-in".
      // Usually you wake up on Day X and log recovery for Day X, based on sleep from Night of Day X-1.
      // So if SleepLog date is Day X-1 (bedtime), and RecoveryLog date is Day X.
      
      // Let's assume simplest case: matching by date string if they are aligned by the user.
      // Or verify logic:
      // SleepLog.date = "Date of the sleep (night of)" e.g., Jan 1st night.
      // RecoveryLog.date = "Date of the recovery check-in" e.g., Jan 2nd morning.
      // So we should match SleepLog(Jan 1) with RecoveryLog(Jan 2).
      
      const recoveryDate = new Date(rLog.date);
      const sleepDate = new Date(recoveryDate);
      sleepDate.setDate(sleepDate.getDate() - 1); // Previous day
      const sleepDateStr = sleepDate.toISOString().split('T')[0];
      
      // Also try same date just in case user logs differently
      const sameDateStr = new Date(rLog.date).toISOString().split('T')[0];

      const sLog = sleepLogs.find(s => {
        const sDate = new Date(s.date).toISOString().split('T')[0];
        return sDate === sleepDateStr || sDate === sameDateStr;
      });

      if (sLog) {
        // Composite sleep score: duration factor * quality
        // Or just use quality? The prompt says "between sleep quality/duration and recovery scores"
        // Let's use a weighted score of quality and duration
        // optimal duration 8h = 480m. 
        const durationScore = Math.min(10, (sLog.duration / 480) * 10);
        const sleepScore = (sLog.quality + durationScore) / 2;
        
        pairs.push({
          sleepQuality: sleepScore,
          recoveryScore: rLog.overallRecovery
        });
      }
    });

    if (pairs.length < 3) {
    return null;
  }

    // Pearson correlation
    const n = pairs.length;
    const sumX = pairs.reduce((sum, p) => sum + p.sleepQuality, 0);
    const sumY = pairs.reduce((sum, p) => sum + p.recoveryScore, 0);
    const sumXY = pairs.reduce((sum, p) => sum + (p.sleepQuality * p.recoveryScore), 0);
    const sumX2 = pairs.reduce((sum, p) => sum + (p.sleepQuality * p.sleepQuality), 0);
    const sumY2 = pairs.reduce((sum, p) => sum + (p.recoveryScore * p.recoveryScore), 0);

    const numerator = (n * sumXY) - (sumX * sumY);
    const denominator = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));

    if (denominator === 0) {
    return null;
  }
    
    return Math.round((numerator / denominator) * 100) / 100;
  },

  /**
   * Calculate sleep duration from bedtime and wake time
   */
  calculateSleepDuration(bedtime: Date, wakeTime: Date): number {
    // Handle case where wake time is next day
    let duration = wakeTime.getTime() - bedtime.getTime();
    if (duration < 0) {
      // Wake time is next day
      duration = duration + 24 * 60 * 60 * 1000;
    }
    return Math.round(duration / (60 * 1000)); // Return in minutes
  },

  /**
   * Format duration for display
   */
  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${mins}m`;
  },
};

