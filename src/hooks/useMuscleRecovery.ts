import { useState, useEffect, useMemo, useRef } from 'react';
import { MuscleStatus } from '@/types/muscle';
import { dbHelpers } from '@/services/database';
import { useWorkoutStore } from '@/store/workoutStore';
import { useUserStore } from '@/store/userStore';
import { useSettingsStore } from '@/store/settingsStore';
import { calculateRecoveryStatus } from '@/services/recoveryCalculator';
import { muscleRecoveryService } from '@/services/muscleRecoveryService';
import { sleepRecoveryService } from '@/services/sleepRecoveryService';
import { SleepLog } from '@/types/sleep';
import { notificationService } from '@/services/notificationService';

export function useMuscleRecovery() {
  const [muscleStatuses, setMuscleStatuses] = useState<MuscleStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const { workouts } = useWorkoutStore();
  const { profile } = useUserStore();
  const { settings } = useSettingsStore();
  const isCalculatingRef = useRef(false);
  const workoutsLengthRef = useRef(workouts.length);
  const profileIdRef = useRef(profile?.id);
  const initializedRef = useRef(false);

  // Initialize muscle statuses from workout history if database is empty
  useEffect(() => {
    async function initializeIfNeeded() {
      if (initializedRef.current || !profile) return;
      
      try {
        const savedStatuses = await dbHelpers.getAllMuscleStatuses();
        
        // If no muscle statuses exist and we have workouts, initialize them
        if (savedStatuses.length === 0 && workouts.length > 0) {
          setIsInitializing(true);
          await muscleRecoveryService.initializeMuscleStatusesFromHistory(workouts, profile.id);
          initializedRef.current = true;
          setIsInitializing(false);
          // Recalculate after initialization
          await calculateMuscleStatuses();
        } else {
          initializedRef.current = true;
          await calculateMuscleStatuses();
        }
      } catch (error) {
        console.error('Failed to initialize muscle statuses:', error);
        setIsInitializing(false);
        initializedRef.current = true;
        await calculateMuscleStatuses();
      }
    }

    if (profile && workouts.length >= 0) {
      initializeIfNeeded();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, workouts.length]);

  // Recalculate when workouts change or profile changes
  useEffect(() => {
    const workoutsChanged = workoutsLengthRef.current !== workouts.length;
    const profileChanged = profileIdRef.current !== profile?.id;

    if (profile && initializedRef.current && (workoutsChanged || profileChanged) && !isCalculatingRef.current) {
      workoutsLengthRef.current = workouts.length;
      profileIdRef.current = profile?.id;
      calculateMuscleStatuses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workouts.length, profile?.id]);

  // Recalculate when base rest interval setting changes
  useEffect(() => {
    if (profile && initializedRef.current && !isCalculatingRef.current) {
      calculateMuscleStatuses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.baseRestInterval]);

  async function calculateMuscleStatuses() {
    if (isCalculatingRef.current) return;
    isCalculatingRef.current = true;
    setIsLoading(true);
    try {
      const savedStatuses = await dbHelpers.getAllMuscleStatuses();
      
      // Fetch recent sleep logs for recovery calculation
      let recentSleepLog: SleepLog | undefined;
      try {
        if (profile?.id) {
          const sleepLogs = await sleepRecoveryService.getAllSleepLogs(profile.id);
          recentSleepLog = sleepLogs.length > 0 ? sleepLogs[0] : undefined;
        }
      } catch (error) {
        console.error('Failed to fetch sleep logs:', error);
      }

      // Deduplicate muscle groups - keep the most recent entry for each muscle
      const uniqueStatuses = savedStatuses.reduce((acc, status) => {
        const existing = acc.find(s => s.muscle === status.muscle);
        
        if (!existing) {
          acc.push(status);
        } else {
          // Keep the one with the most recent lastWorked date
          const existingDate = existing.lastWorked ? new Date(existing.lastWorked).getTime() : 0;
          const currentDate = status.lastWorked ? new Date(status.lastWorked).getTime() : 0;
          
          if (currentDate > existingDate) {
            // Replace with more recent entry
            const index = acc.indexOf(existing);
            acc[index] = status;
          }
        }
        
        return acc;
      }, [] as typeof savedStatuses);

      const statuses: MuscleStatus[] = uniqueStatuses.map((status) => {
        // Convert date strings to Date objects
        let lastWorked: Date | null = null;
        if (status.lastWorked) {
          lastWorked = status.lastWorked instanceof Date 
            ? status.lastWorked 
            : new Date(status.lastWorked);
        }

        if (!lastWorked || !profile) {
          return {
            ...status,
            lastWorked: null,
            recoveryStatus: 'ready',
            recoveryPercentage: 100,
          };
        }

        // Use base rest interval from settings if available
        const baseRestInterval = settings.baseRestInterval || 48;

        return calculateRecoveryStatus({
          muscle: status.muscle,
          lastWorkout: lastWorked,
          workloadScore: status.workloadScore,
          userLevel: profile.experienceLevel,
          totalVolumeLast7Days: status.totalVolumeLast7Days,
          trainingFrequency: status.trainingFrequency,
          baseRestInterval,
          recentSleep: recentSleepLog,
        });
      });

      // Only update if content actually changed
      const prevStatuses = muscleStatuses;
      setMuscleStatuses(prev => {
        if (prev.length !== statuses.length) return statuses;
        const hasChanged = prev.some((p, i) => {
          const s = statuses[i];
          return !s || p.muscle !== s.muscle || p.recoveryPercentage !== s.recoveryPercentage;
        });
        return hasChanged ? statuses : prev;
      });

      // Check for muscle recovery notifications if settings allow
      if (settings.muscleRecoveryAlertsEnabled && settings.notificationPermission === 'granted') {
        // Only check if statuses actually changed
        const statusesChanged = prevStatuses.length !== statuses.length || 
          prevStatuses.some((p, i) => {
            const s = statuses[i];
            return !s || p.muscle !== s.muscle || p.recoveryPercentage !== s.recoveryPercentage;
          });
        
        if (statusesChanged) {
          notificationService.checkAndNotifyRecovery(statuses).catch((error) => {
            console.error('Failed to check muscle recovery notifications:', error);
          });
        }
      }
    } catch (error) {
      console.error('Failed to calculate muscle statuses:', error);
    } finally {
      setIsLoading(false);
      isCalculatingRef.current = false;
    }
  }

  const statusesKey = useMemo(() =>
    muscleStatuses.map(s => `${s.muscle}-${s.recoveryPercentage}`).join(','),
    [muscleStatuses]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedStatuses = useMemo(() => muscleStatuses, [statusesKey]);

  return { 
    muscleStatuses: memoizedStatuses, 
    isLoading: isLoading || isInitializing, 
    refetch: calculateMuscleStatuses 
  };
}

