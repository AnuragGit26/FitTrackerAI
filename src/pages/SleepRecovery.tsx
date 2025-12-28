import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Edit } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUserStore } from '@/store/userStore';
import { sleepRecoveryService } from '@/services/sleepRecoveryService';
import { SleepLog, RecoveryLog } from '@/types/sleep';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/utils/cn';
import { prefersReducedMotion } from '@/utils/animations';

export function SleepRecovery() {
  const navigate = useNavigate();
  const { profile } = useUserStore();
  const { success, error: showError } = useToast();
  const shouldReduceMotion = prefersReducedMotion();

  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasExistingData, setHasExistingData] = useState(false);
  const [existingSleepLog, setExistingSleepLog] = useState<SleepLog | null>(null);
  const [existingRecoveryLog, setExistingRecoveryLog] = useState<RecoveryLog | null>(null);
  
  // Track current date and detect changes
  const getToday = () => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  };
  
  const [today, setToday] = useState(() => getToday());
  const lastDateRef = useRef<string>(today.toISOString().split('T')[0]);

  // Sleep state
  const [bedtime, setBedtime] = useState(() => {
    const date = new Date();
    date.setHours(23, 0, 0, 0);
    return date;
  });
  const [wakeTime, setWakeTime] = useState(() => {
    const date = new Date();
    date.setHours(7, 30, 0, 0);
    return date;
  });
  const [sleepQuality, setSleepQuality] = useState(8);
  const [sleepNotes, setSleepNotes] = useState('');

  // Recovery state
  const [overallRecovery, setOverallRecovery] = useState(85);
  const [stressLevel, setStressLevel] = useState(3);
  const [energyLevel, setEnergyLevel] = useState(8);
  const [soreness, setSoreness] = useState(5);
  const [readinessToTrain, setReadinessToTrain] = useState<'full-power' | 'light' | 'rest-day'>('full-power');
  const [recoveryNotes, setRecoveryNotes] = useState('');

  // Daily reset mechanism - check for date changes
  useEffect(() => {
    const checkDateChange = () => {
      const currentDate = getToday();
      const currentDateStr = currentDate.toISOString().split('T')[0];
      
      if (currentDateStr !== lastDateRef.current) {
        // Date changed - reset state
        setToday(currentDate);
        lastDateRef.current = currentDateStr;
        setHasExistingData(false);
        setIsEditMode(false);
        setExistingSleepLog(null);
        setExistingRecoveryLog(null);
        
        // Reset form to defaults
        const defaultBedtime = new Date();
        defaultBedtime.setHours(23, 0, 0, 0);
        setBedtime(defaultBedtime);
        
        const defaultWakeTime = new Date();
        defaultWakeTime.setHours(7, 30, 0, 0);
        setWakeTime(defaultWakeTime);
        setSleepQuality(8);
        setSleepNotes('');
        setOverallRecovery(85);
        setStressLevel(3);
        setEnergyLevel(8);
        setSoreness(5);
        setReadinessToTrain('full-power');
        setRecoveryNotes('');
      }
    };

    // Check immediately
    checkDateChange();

    // Set up interval to check every minute
    const interval = setInterval(checkDateChange, 60000);

    return () => clearInterval(interval);
  }, []);

  // Load existing data
  useEffect(() => {
    if (!profile?.id) return;

    const loadData = async () => {
      try {
        const existingSleep = await sleepRecoveryService.getSleepLog(profile.id, today);
        const existingRecovery = await sleepRecoveryService.getRecoveryLog(profile.id, today);

        const hasData = !!(existingSleep || existingRecovery);
        setHasExistingData(hasData);
        setExistingSleepLog(existingSleep || null);
        setExistingRecoveryLog(existingRecovery || null);

        // Only populate form fields if in edit mode or no data exists
        if (isEditMode || !hasData) {
          if (existingSleep) {
            setBedtime(new Date(existingSleep.bedtime));
            setWakeTime(new Date(existingSleep.wakeTime));
            setSleepQuality(existingSleep.quality);
            setSleepNotes(existingSleep.notes || '');
          }

          if (existingRecovery) {
            setOverallRecovery(existingRecovery.overallRecovery);
            setStressLevel(existingRecovery.stressLevel);
            setEnergyLevel(existingRecovery.energyLevel);
            setSoreness(existingRecovery.soreness);
            setReadinessToTrain(existingRecovery.readinessToTrain);
            setRecoveryNotes(existingRecovery.notes || '');
          }
        }
      } catch (error) {
        console.error('Failed to load sleep/recovery data:', error);
      }
    };

    loadData();
  }, [profile?.id, today, isEditMode]);

  const calculateDuration = () => {
    return sleepRecoveryService.calculateSleepDuration(bedtime, wakeTime);
  };

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const parseTime = (timeString: string, baseDate: Date): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const newDate = new Date(baseDate);
    newDate.setHours(hours, minutes, 0, 0);
    return newDate;
  };

  const handleBedtimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBedtime = parseTime(e.target.value, bedtime);
    setBedtime(newBedtime);
  };

  const handleWakeTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWakeTime = parseTime(e.target.value, wakeTime);
    setWakeTime(newWakeTime);
  };

  const handleQuickDuration = (hours: number) => {
    const newBedtime = new Date(wakeTime);
    newBedtime.setHours(newBedtime.getHours() - hours);
    newBedtime.setMinutes(newBedtime.getMinutes() - 30);
    setBedtime(newBedtime);
  };

  const getStressLabel = (value: number): string => {
    if (value <= 3) return 'Low';
    if (value <= 6) return 'Medium';
    return 'High';
  };

  const getEnergyLabel = (value: number): string => {
    if (value <= 3) return 'Low';
    if (value <= 6) return 'Medium';
    return 'High';
  };

  const getSorenessLabel = (value: number): string => {
    if (value <= 3) return 'Low';
    if (value <= 6) return 'Medium';
    return 'High';
  };

  const handleSave = async () => {
    if (!profile?.id) {
      showError('User profile not found');
      return;
    }

    // Prevent duplicate saves if data exists and not in edit mode
    if (hasExistingData && !isEditMode) {
      showError('Sleep data already saved for today. Click Edit to modify.');
      return;
    }

    setIsSaving(true);
    try {
      const duration = calculateDuration();
      const sleepDate = new Date(bedtime);
      sleepDate.setHours(0, 0, 0, 0);

      const sleepLog: SleepLog = {
        ...(existingSleepLog || {}),
        userId: profile.id,
        date: sleepDate,
        bedtime,
        wakeTime,
        duration,
        quality: sleepQuality,
        notes: sleepNotes || undefined,
      };

      const recoveryLog: RecoveryLog = {
        ...(existingRecoveryLog || {}),
        userId: profile.id,
        date: today,
        overallRecovery,
        stressLevel,
        energyLevel,
        soreness,
        readinessToTrain,
        notes: recoveryNotes || undefined,
      };

      await Promise.all([
        sleepRecoveryService.saveSleepLog(sleepLog),
        sleepRecoveryService.saveRecoveryLog(recoveryLog),
      ]);

      // Update state after successful save
      setHasExistingData(true);
      setIsEditMode(false);
      setExistingSleepLog(sleepLog as SleepLog);
      setExistingRecoveryLog(recoveryLog as RecoveryLog);

      success('Sleep & Recovery logged successfully');
      navigate(-1);
    } catch (error) {
      showError('Failed to save sleep & recovery data');
      console.error('Error saving sleep/recovery:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = () => {
    setIsEditMode(true);
    // Load existing data into form when entering edit mode
    if (existingSleepLog) {
      setBedtime(new Date(existingSleepLog.bedtime));
      setWakeTime(new Date(existingSleepLog.wakeTime));
      setSleepQuality(existingSleepLog.quality);
      setSleepNotes(existingSleepLog.notes || '');
    }
    if (existingRecoveryLog) {
      setOverallRecovery(existingRecoveryLog.overallRecovery);
      setStressLevel(existingRecoveryLog.stressLevel);
      setEnergyLevel(existingRecoveryLog.energyLevel);
      setSoreness(existingRecoveryLog.soreness);
      setReadinessToTrain(existingRecoveryLog.readinessToTrain);
      setRecoveryNotes(existingRecoveryLog.notes || '');
    }
  };

  const duration = calculateDuration();
  const durationFormatted = sleepRecoveryService.formatDuration(duration);

  // Calculate summary metrics for minimal view
  const summaryDuration = existingSleepLog 
    ? sleepRecoveryService.formatDuration(existingSleepLog.duration)
    : durationFormatted;
  const summaryQuality = existingSleepLog?.quality || sleepQuality;
  const summaryRecovery = existingRecoveryLog?.overallRecovery || overallRecovery;

  // Determine if we should show minimal view or full form
  const showMinimalView = hasExistingData && !isEditMode;
  const showSaveButton = !hasExistingData || isEditMode;

  return (
    <div className="relative flex h-full min-h-screen w-full max-w-lg mx-auto flex-col overflow-hidden bg-background-light dark:bg-background-dark">
      {/* Top App Bar */}
      <div className="sticky top-0 z-50 flex items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md p-4 pb-2 justify-between border-b border-gray-200 dark:border-surface-border/30">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-900 dark:text-white flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">
          Log Recovery
        </h2>
        {showSaveButton ? (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex w-12 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors h-12"
          >
            {isSaving ? (
              <span className="text-primary text-base font-bold leading-normal tracking-[0.015em] shrink-0">
                Saving...
              </span>
            ) : (
              <span className="text-primary text-base font-bold leading-normal tracking-[0.015em] shrink-0">
                Save
              </span>
            )}
          </button>
        ) : (
          <div className="w-12" /> // Spacer for centering
        )}
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-24 p-4 space-y-6">
        {/* Minimal Summary View - shown when data exists and not editing */}
        {showMinimalView && (
          <>
            {/* Sleep Summary Card */}
            <section className="flex flex-col gap-4 rounded-xl bg-white dark:bg-surface-dark p-5 shadow-sm border border-gray-100 dark:border-surface-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <span className="material-symbols-outlined text-primary">bedtime</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold leading-tight">Last Night&apos;s Sleep</h3>
                    <p className="text-slate-500 dark:text-text-secondary text-xs font-medium uppercase tracking-wider">
                      Sleep Analysis
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-medium text-sm transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="flex flex-col items-center p-3 rounded-lg bg-background-light dark:bg-black/30 border border-gray-100 dark:border-white/5">
                  <span className="text-xs text-slate-500 dark:text-text-secondary mb-1">Duration</span>
                  <span className="text-primary font-bold text-lg">{summaryDuration}</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-lg bg-background-light dark:bg-black/30 border border-gray-100 dark:border-white/5">
                  <span className="text-xs text-slate-500 dark:text-text-secondary mb-1">Quality</span>
                  <span className="text-primary font-bold text-lg">{summaryQuality}/10</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-lg bg-background-light dark:bg-black/30 border border-gray-100 dark:border-white/5">
                  <span className="text-xs text-slate-500 dark:text-text-secondary mb-1">Recovery</span>
                  <span className="text-primary font-bold text-lg">{summaryRecovery}%</span>
                </div>
              </div>

              {existingSleepLog?.notes && (
                <div className="mt-2 pt-3 border-t border-gray-100 dark:border-surface-border">
                  <p className="text-xs text-slate-500 dark:text-text-secondary mb-1">Notes</p>
                  <p className="text-sm text-slate-700 dark:text-gray-300">{existingSleepLog.notes}</p>
                </div>
              )}
            </section>

            {/* Recovery Summary Card */}
            <section className="flex flex-col gap-4 rounded-xl bg-white dark:bg-surface-dark p-5 shadow-sm border border-gray-100 dark:border-surface-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <span className="material-symbols-outlined text-primary">ecg_heart</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold leading-tight">Body Status</h3>
                    <p className="text-slate-500 dark:text-text-secondary text-xs font-medium uppercase tracking-wider">
                      Daily Check-in
                    </p>
                  </div>
                </div>
                <div className="relative size-12 flex items-center justify-center">
                  <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-gray-200 dark:text-surface-border"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    ></path>
                    <path
                      className="text-primary"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray={`${summaryRecovery}, 100`}
                      strokeWidth="3"
                    ></path>
                  </svg>
                  <span className="absolute text-xs font-bold text-slate-900 dark:text-white">
                    {summaryRecovery}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="flex flex-col items-center p-3 rounded-lg bg-background-light dark:bg-black/30 border border-gray-100 dark:border-white/5">
                  <span className="text-xs text-slate-500 dark:text-text-secondary mb-1">Stress</span>
                  <span className="text-white font-medium text-sm">{getStressLabel(existingRecoveryLog?.stressLevel || stressLevel)}</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-lg bg-background-light dark:bg-black/30 border border-gray-100 dark:border-white/5">
                  <span className="text-xs text-slate-500 dark:text-text-secondary mb-1">Energy</span>
                  <span className="text-white font-medium text-sm">{getEnergyLabel(existingRecoveryLog?.energyLevel || energyLevel)}</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-lg bg-background-light dark:bg-black/30 border border-gray-100 dark:border-white/5">
                  <span className="text-xs text-slate-500 dark:text-text-secondary mb-1">Soreness</span>
                  <span className="text-white font-medium text-sm">{getSorenessLabel(existingRecoveryLog?.soreness || soreness)}</span>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-xs text-slate-500 dark:text-text-secondary mb-1 block">Readiness to Train</span>
                <span className="text-sm font-medium text-slate-700 dark:text-white capitalize">
                  {existingRecoveryLog?.readinessToTrain === 'full-power' && 'Full Power'}
                  {existingRecoveryLog?.readinessToTrain === 'light' && 'Light'}
                  {existingRecoveryLog?.readinessToTrain === 'rest-day' && 'Rest Day'}
                </span>
              </div>

              {existingRecoveryLog?.notes && (
                <div className="mt-2 pt-3 border-t border-gray-100 dark:border-surface-border">
                  <p className="text-xs text-slate-500 dark:text-text-secondary mb-1">Notes</p>
                  <p className="text-sm text-slate-700 dark:text-gray-300">{existingRecoveryLog.notes}</p>
                </div>
              )}
            </section>
          </>
        )}

        {/* Full Form - shown when no data exists or in edit mode */}
        {!showMinimalView && (
          <>
            {/* Sleep Log Card */}
            <section className="flex flex-col gap-4 rounded-xl bg-white dark:bg-surface-dark p-5 shadow-sm border border-gray-100 dark:border-surface-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <span className="material-symbols-outlined text-primary">bedtime</span>
            </div>
            <div>
              <h3 className="text-lg font-bold leading-tight">Last Night&apos;s Sleep</h3>
              <p className="text-slate-500 dark:text-text-secondary text-xs font-medium uppercase tracking-wider">
                Sleep Analysis
              </p>
            </div>
          </div>

          {/* Time Inputs */}
          <div className="flex flex-wrap gap-4">
            <label className="flex flex-col flex-1 min-w-[140px] group">
              <p className="text-slate-600 dark:text-gray-300 text-sm font-medium mb-2 group-focus-within:text-primary transition-colors">
                Bedtime
              </p>
              <div className="relative">
                <input
                  className="form-input w-full rounded-lg text-slate-900 dark:text-white border-gray-200 dark:border-surface-border bg-slate-50 dark:bg-black/20 focus:border-primary focus:ring-1 focus:ring-primary h-12 px-3 text-base font-medium"
                  type="time"
                  value={formatTime(bedtime)}
                  onChange={handleBedtimeChange}
                />
                <span className="material-symbols-outlined absolute right-3 top-3 text-slate-400 dark:text-text-secondary pointer-events-none text-xl">
                  schedule
                </span>
              </div>
            </label>
            <label className="flex flex-col flex-1 min-w-[140px] group">
              <p className="text-slate-600 dark:text-gray-300 text-sm font-medium mb-2 group-focus-within:text-primary transition-colors">
                Wake Time
              </p>
              <div className="relative">
                <input
                  className="form-input w-full rounded-lg text-slate-900 dark:text-white border-gray-200 dark:border-surface-border bg-slate-50 dark:bg-black/20 focus:border-primary focus:ring-1 focus:ring-primary h-12 px-3 text-base font-medium"
                  type="time"
                  value={formatTime(wakeTime)}
                  onChange={handleWakeTimeChange}
                />
                <span className="material-symbols-outlined absolute right-3 top-3 text-slate-400 dark:text-text-secondary pointer-events-none text-xl">
                  wb_sunny
                </span>
              </div>
            </label>
          </div>

          {/* Calculated Duration */}
          <div className="bg-background-light dark:bg-black/30 rounded-lg p-3 flex items-center justify-between border border-gray-100 dark:border-white/5">
            <span className="text-sm text-slate-500 dark:text-text-secondary">Calculated Duration</span>
            <span className="text-primary font-bold text-lg">{durationFormatted}</span>
          </div>

          <div className="h-px bg-gray-100 dark:bg-surface-border w-full my-1"></div>

          {/* Sleep Quality Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-slate-700 dark:text-white text-base font-medium">Sleep Quality</p>
              <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-sm font-bold">
                {sleepQuality}/10
              </span>
            </div>
            <div className="relative h-6 flex items-center">
              <input
                className="w-full z-20 opacity-0 absolute h-full cursor-pointer peer"
                type="range"
                min="1"
                max="10"
                step="1"
                value={sleepQuality}
                onChange={(e) => setSleepQuality(Number(e.target.value))}
              />
              <div className="w-full h-1.5 bg-gray-200 dark:bg-surface-border rounded-full relative overflow-hidden">
                <div
                  className="h-full bg-primary absolute top-0 left-0 transition-all"
                  style={{ width: `${((sleepQuality - 1) / 9) * 100}%` }}
                ></div>
              </div>
              <div
                className="absolute w-5 h-5 bg-white border-2 border-primary rounded-full shadow-lg transform -translate-x-1/2 pointer-events-none transition-all peer-active:scale-125"
                style={{ left: `${((sleepQuality - 1) / 9) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-slate-400 dark:text-text-secondary font-medium">
              <span>Poor</span>
              <span>Excellent</span>
            </div>
          </div>

          {/* Quick Chips */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {[7, 7.5, 8, 8.5].map((hours) => {
              const isSelected = Math.abs(duration / 60 - hours) < 0.25;
              return (
                <button
                  key={hours}
                  onClick={() => handleQuickDuration(hours)}
                  className={cn(
                    'whitespace-nowrap px-3 py-1.5 rounded-full border text-xs font-medium transition-all',
                    isSelected
                      ? 'bg-primary text-black border-primary font-bold'
                      : 'border-gray-200 dark:border-surface-border text-slate-600 dark:text-gray-300 hover:bg-primary/10 hover:border-primary hover:text-primary'
                  )}
                >
                  {hours} hrs
                </button>
              );
            })}
          </div>
        </section>

        {/* Recovery Log Card */}
        <section className="flex flex-col gap-5 rounded-xl bg-white dark:bg-surface-dark p-5 shadow-sm border border-gray-100 dark:border-surface-border">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <span className="material-symbols-outlined text-primary">ecg_heart</span>
              </div>
              <div>
                <h3 className="text-lg font-bold leading-tight">Body Status</h3>
                <p className="text-slate-500 dark:text-text-secondary text-xs font-medium uppercase tracking-wider">
                  Daily Check-in
                </p>
              </div>
            </div>
            {/* Readiness Gauge Visual */}
            <div className="relative size-12 flex items-center justify-center">
              <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-gray-200 dark:text-surface-border"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                ></path>
                <path
                  className="text-primary"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray={`${overallRecovery}, 100`}
                  strokeWidth="3"
                ></path>
              </svg>
              <span className="absolute text-xs font-bold text-slate-900 dark:text-white">
                {overallRecovery}%
              </span>
            </div>
          </div>

          {/* Recovery Slider (0-100) */}
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <p className="text-slate-700 dark:text-white text-sm font-medium">Overall Recovery</p>
              <span className="text-primary text-sm font-bold">{overallRecovery}%</span>
            </div>
            <input
              className="w-full h-1.5 bg-gray-200 dark:bg-surface-border rounded-lg appearance-none cursor-pointer accent-primary"
              type="range"
              min="0"
              max="100"
              value={overallRecovery}
              onChange={(e) => setOverallRecovery(Number(e.target.value))}
            />
          </div>

          {/* 3 Grid Metrics */}
          <div className="grid grid-cols-1 gap-6 pt-2">
            {/* Stress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-gray-400">Stress Level</span>
                <span className="text-white font-medium">{getStressLabel(stressLevel)}</span>
              </div>
              <div className="relative h-6 flex items-center">
                <input
                  className="w-full z-20 opacity-0 absolute h-full cursor-pointer peer"
                  type="range"
                  min="1"
                  max="10"
                  value={stressLevel}
                  onChange={(e) => setStressLevel(Number(e.target.value))}
                />
                <div className="w-full h-1.5 bg-gray-200 dark:bg-surface-border rounded-full relative overflow-hidden">
                  <div
                    className="h-full bg-sky-400 absolute top-0 left-0 transition-all"
                    style={{ width: `${((stressLevel - 1) / 9) * 100}%` }}
                  ></div>
                </div>
                <div
                  className="absolute w-4 h-4 bg-white border-2 border-sky-400 rounded-full shadow transform -translate-x-1/2 pointer-events-none"
                  style={{ left: `${((stressLevel - 1) / 9) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Energy */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-gray-400">Energy Level</span>
                <span className="text-white font-medium">{getEnergyLabel(energyLevel)}</span>
              </div>
              <div className="relative h-6 flex items-center">
                <input
                  className="w-full z-20 opacity-0 absolute h-full cursor-pointer peer"
                  type="range"
                  min="1"
                  max="10"
                  value={energyLevel}
                  onChange={(e) => setEnergyLevel(Number(e.target.value))}
                />
                <div className="w-full h-1.5 bg-gray-200 dark:bg-surface-border rounded-full relative overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 absolute top-0 left-0 transition-all"
                    style={{ width: `${((energyLevel - 1) / 9) * 100}%` }}
                  ></div>
                </div>
                <div
                  className="absolute w-4 h-4 bg-white border-2 border-yellow-400 rounded-full shadow transform -translate-x-1/2 pointer-events-none"
                  style={{ left: `${((energyLevel - 1) / 9) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Soreness */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-gray-400">Soreness</span>
                <span className="text-white font-medium">{getSorenessLabel(soreness)}</span>
              </div>
              <div className="relative h-6 flex items-center">
                <input
                  className="w-full z-20 opacity-0 absolute h-full cursor-pointer peer"
                  type="range"
                  min="1"
                  max="10"
                  value={soreness}
                  onChange={(e) => setSoreness(Number(e.target.value))}
                />
                <div className="w-full h-1.5 bg-gray-200 dark:bg-surface-border rounded-full relative overflow-hidden">
                  <div
                    className="h-full bg-rose-400 absolute top-0 left-0 transition-all"
                    style={{ width: `${((soreness - 1) / 9) * 100}%` }}
                  ></div>
                </div>
                <div
                  className="absolute w-4 h-4 bg-white border-2 border-rose-400 rounded-full shadow transform -translate-x-1/2 pointer-events-none"
                  style={{ left: `${((soreness - 1) / 9) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Readiness Toggle */}
          <div className="pt-2">
            <p className="text-slate-700 dark:text-white text-sm font-medium mb-3">Readiness to Train</p>
            <div className="grid grid-cols-3 gap-2">
              {(['full-power', 'light', 'rest-day'] as const).map((readiness) => (
                <label key={readiness} className="cursor-pointer">
                  <input
                    className="peer sr-only"
                    name="readiness"
                    type="radio"
                    checked={readinessToTrain === readiness}
                    onChange={() => setReadinessToTrain(readiness)}
                  />
                  <div
                    className={cn(
                      'flex flex-col items-center justify-center p-3 rounded-lg border transition-all h-20',
                      readinessToTrain === readiness
                        ? 'bg-primary/20 border-primary'
                        : 'border-gray-200 dark:border-surface-border bg-slate-50 dark:bg-black/20'
                    )}
                  >
                    <span
                      className={cn(
                        'material-symbols-outlined mb-1 text-2xl',
                        readinessToTrain === readiness
                          ? 'text-primary'
                          : 'text-slate-400 dark:text-gray-400'
                      )}
                    >
                      {readiness === 'full-power' && 'bolt'}
                      {readiness === 'light' && 'fitness_center'}
                      {readiness === 'rest-day' && 'weekend'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-gray-300 uppercase">
                      {readiness === 'full-power' && 'Full Power'}
                      {readiness === 'light' && 'Light'}
                      {readiness === 'rest-day' && 'Rest Day'}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* Notes Section */}
        <section className="rounded-xl bg-white dark:bg-surface-dark p-4 shadow-sm border border-gray-100 dark:border-surface-border">
          <label className="flex flex-col w-full">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-slate-400 dark:text-text-secondary text-lg">
                edit_note
              </span>
              <span className="text-slate-700 dark:text-white text-base font-medium">Daily Notes</span>
            </div>
            <textarea
              className="form-textarea w-full rounded-lg text-slate-900 dark:text-white border border-gray-200 dark:border-surface-border bg-slate-50 dark:bg-black/20 focus:border-primary focus:ring-0 placeholder:text-slate-400 dark:placeholder:text-text-secondary/50 p-3 text-sm min-h-[80px]"
              placeholder="How are you feeling today? Any specific aches or pains?"
              value={recoveryNotes}
              onChange={(e) => setRecoveryNotes(e.target.value)}
            />
          </label>
        </section>
        <div className="h-4"></div>
          </>
        )}
      </div>

      {/* Floating Action Button - only show when save button should be visible */}
      {showSaveButton && (
        <div className="fixed bottom-[90px] right-4 z-40">
          <motion.button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center justify-center size-14 rounded-full bg-primary text-black shadow-[0_4px_12px_rgba(13,242,105,0.4)] hover:shadow-[0_6px_16px_rgba(13,242,105,0.6)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={!isSaving && !shouldReduceMotion ? { scale: 1.05 } : {}}
            whileTap={!isSaving && !shouldReduceMotion ? { scale: 0.95 } : {}}
          >
            <Check className="w-6 h-6" />
          </motion.button>
        </div>
      )}
    </div>
  );
}

