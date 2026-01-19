import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, ArrowRight, Scale, Ruler, Moon, Sun, Monitor, Bell, Volume2, Vibrate, Download, Upload, Trash2, AlertCircle, Clock, Cloud, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useUserStore, Gender, UnitSystem, unitHelpers, Goal } from '@/store/userStore';
import { useSettingsStore } from '@/store/settingsStore';
import { notificationService } from '@/services/notificationService';
import { ProfilePictureUpload } from '@/components/profile/ProfilePictureUpload';
import { UnitSwitcher } from '@/components/profile/UnitSwitcher';
import { GoalSelection } from '@/components/profile/GoalSelectionCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { dataExport } from '@/services/dataExport';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/utils/cn';
import { firestoreSyncService } from '@/services/firestoreSyncService';
import { ImportStrategyModal } from '@/components/profile/ImportStrategyModal';
import { ExportProgressModal } from '@/components/profile/ExportProgressModal';
import { ImportProgressModal } from '@/components/profile/ImportProgressModal';
import { ImportStrategy, ImportResult, ProgressCallback } from '@/types/export';
import { logger } from '@/utils/logger';
import { refreshAllAppData } from '@/utils/dataRefresh';
import { ImportErrorBoundary } from '@/components/import/ImportErrorBoundary';

export function Profile() {
  const navigate = useNavigate();
  useAuth();
  const { profile, updateProfile, isLoading, setPreferredUnit, setDefaultRestTime, setProfilePicture: updateProfilePictureInStore } = useUserStore();
  const { 
    settings, 
    setTheme, 
    toggleAutoStartRestTimer, 
    toggleSound, 
    toggleVibration, 
    loadSettings,
    setWorkoutReminderEnabled,
    setWorkoutReminderMinutes,
    setMuscleRecoveryAlertsEnabled,
    setNotificationPermission,
  } = useSettingsStore();

  const [name, setName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [profilePicture, setProfilePicture] = useState<string | undefined>();
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
  
  // Weight and height stored in metric (kg, cm)
  const [weightKg, setWeightKg] = useState<number | ''>('');
  const [heightCm, setHeightCm] = useState<number | ''>('');
  
  // Display values for imperial
  const [weightLbs, setWeightLbs] = useState<number | ''>('');
  const [heightFeet, setHeightFeet] = useState<number | ''>('');
  const [heightInches, setHeightInches] = useState<number | ''>('');
  
  const [selectedGoals, setSelectedGoals] = useState<Goal[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [defaultRestTime, setDefaultRestTimeLocal] = useState<number>(90);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error: showError } = useToast();
  
  // Export/Import progress state
  const [exportProgress, setExportProgress] = useState<{
    percentage: number;
    currentOperation: string;
    completedItems: number;
    totalItems: number;
  } | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    percentage: number;
    currentOperation: string;
    completedItems: number;
    totalItems: number;
  } | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showImportStrategyModal, setShowImportStrategyModal] = useState(false);
  const [importPreview, setImportPreview] = useState<import('@/types/export').ImportPreview | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [lastSyncMessage, setLastSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    // Initialize notification service and check permission
    notificationService.initialize().then(() => {
      if ('Notification' in window) {
        setNotificationPermission(Notification.permission);
      }
    });
  }, [loadSettings, setNotificationPermission]);
  
  const handleManualSync = async () => {
    logger.log('[Profile.handleManualSync] Button clicked, profile.id:', profile?.id, 'isSyncing:', isSyncing);

    if (!profile?.id || isSyncing) {
      logger.warn('[Profile.handleManualSync] Sync aborted - missing profile.id or already syncing');
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      showError("You're offline — we'll sync when you're back online.");
      return;
    }

    setIsSyncing(true);

    try {
      logger.log('[Profile.handleManualSync] Calling firestoreSyncService.sync...');
      const results = await firestoreSyncService.sync(profile.id, {
        direction: 'bidirectional',
      });

      logger.log('[Profile.handleManualSync] Sync completed, results:', results);

      const hasErrors = results.some((r) => r.status === 'error');
      const totalConflicts = results.reduce((sum, r) => sum + r.conflicts, 0);
      const totalRecordsProcessed = results.reduce((sum, r) => sum + r.recordsProcessed, 0);
      const totalRecordsCreated = results.reduce((sum, r) => sum + r.recordsCreated, 0);
      const totalRecordsUpdated = results.reduce((sum, r) => sum + r.recordsUpdated, 0);
      const totalRecordsDeleted = results.reduce((sum, r) => sum + r.recordsDeleted, 0);

      // Check if no changes were found
      const noChanges = totalRecordsProcessed === 0 &&
                       totalRecordsCreated === 0 &&
                       totalRecordsUpdated === 0 &&
                       totalRecordsDeleted === 0;

      if (hasErrors) {
        showError('Sync completed with some errors. Check sync details for more information.');
      } else if (totalConflicts > 0) {
        success(`Sync completed with ${totalConflicts} conflict(s) resolved.`);
      } else if (noChanges) {
        setLastSyncMessage('All data is up to date. No changes to sync.');
        success('All data is up to date. No changes to sync.');
      } else {
        setLastSyncMessage(null); // Clear previous message when there are changes
        const changesSummary = [];
        if (totalRecordsCreated > 0) changesSummary.push(`${totalRecordsCreated} created`);
        if (totalRecordsUpdated > 0) changesSummary.push(`${totalRecordsUpdated} updated`);
        if (totalRecordsDeleted > 0) changesSummary.push(`${totalRecordsDeleted} deleted`);
        const summaryText = changesSummary.length > 0
          ? `Sync completed! ${changesSummary.join(', ')}.`
          : 'Sync completed successfully!';
        success(summaryText);
      }

      setLastSyncTime(new Date());
    } catch (error) {
      logger.error('[Profile.handleManualSync] Sync error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync data';
      showError(`Sync failed: ${errorMessage}`);
    } finally {
      setIsSyncing(false);
    }
  };
  
  const formatLastSyncTime = (date: Date | null): string => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  // Track if we're updating profile picture to prevent loop
  const isUpdatingPictureRef = useRef(false);
  const lastProfileIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (!profile) return;
    
    // Only update if profile ID changed or we're not currently updating picture
    const profileIdChanged = lastProfileIdRef.current !== profile.id;
    const shouldUpdate = profileIdChanged || !isUpdatingPictureRef.current;
    
    if (shouldUpdate) {
      setName(profile.name || '');
      setAge(profile.age ?? '');
      setGender(profile.gender || '');
      // Only update profilePicture from store if we're not currently updating it
      if (!isUpdatingPictureRef.current) {
        setProfilePicture(profile.profilePicture);
      }
      setSelectedGoals(profile.goals || []);
      setDefaultRestTimeLocal(profile.defaultRestTime || 90);
      
      if (profile.weight !== undefined) {
        setWeightKg(profile.weight);
        setWeightLbs(Math.round(unitHelpers.kgToLbs(profile.weight)));
      }
      
      if (profile.height !== undefined) {
        setHeightCm(profile.height);
        const { feet, inches } = unitHelpers.cmToFeetInches(profile.height);
        setHeightFeet(feet);
        setHeightInches(inches);
      }
      
      setUnitSystem(profile.preferredUnit === 'lbs' ? 'imperial' : 'metric');
      lastProfileIdRef.current = profile.id;
    }
  }, [profile]);

  const handleWeightChange = (value: string, unit: 'metric' | 'imperial') => {
    const numValue = value === '' ? '' : parseFloat(value);
    
    if (unit === 'metric') {
      setWeightKg(numValue);
      if (numValue !== '') {
        setWeightLbs(Math.round(unitHelpers.kgToLbs(numValue)));
      } else {
        setWeightLbs('');
      }
    } else {
      setWeightLbs(numValue);
      if (numValue !== '') {
        setWeightKg(Math.round(unitHelpers.lbsToKg(numValue) * 10) / 10);
      } else {
        setWeightKg('');
      }
    }
  };

  const handleHeightChange = (value: string, unit: 'metric' | 'imperial', part?: 'feet' | 'inches') => {
    if (unit === 'metric') {
      const numValue = value === '' ? '' : parseFloat(value);
      setHeightCm(numValue);
      if (numValue !== '') {
        const { feet, inches } = unitHelpers.cmToFeetInches(numValue);
        setHeightFeet(feet);
        setHeightInches(inches);
      } else {
        setHeightFeet('');
        setHeightInches('');
      }
    } else {
      if (part === 'feet') {
        const numValue = value === '' ? '' : parseInt(value);
        setHeightFeet(numValue);
        if (numValue !== '' && heightInches !== '') {
          const cm = unitHelpers.feetInchesToCm(numValue, heightInches as number);
          setHeightCm(Math.round(cm));
        } else if (numValue === '') {
          setHeightCm('');
        }
      } else {
        const numValue = value === '' ? '' : parseInt(value);
        setHeightInches(numValue);
        if (numValue !== '' && heightFeet !== '') {
          const cm = unitHelpers.feetInchesToCm(heightFeet as number, numValue);
          setHeightCm(Math.round(cm));
        } else if (numValue === '') {
          setHeightCm('');
        }
      }
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    setIsSaving(true);

    try {
      const updates: Parameters<typeof updateProfile>[0] = {
        name: name || profile.name,
        age: age !== '' ? age : undefined,
        gender: gender || undefined,
        profilePicture: profilePicture,
        weight: weightKg !== '' ? weightKg : undefined,
        height: heightCm !== '' ? heightCm : undefined,
        goals: selectedGoals.length > 0 ? selectedGoals : profile.goals,
        preferredUnit: unitSystem === 'imperial' ? 'lbs' : 'kg',
        defaultRestTime: defaultRestTime,
      };

      await updateProfile(updates);
      await setPreferredUnit(unitSystem === 'imperial' ? 'lbs' : 'kg');
      await setDefaultRestTime(defaultRestTime);

      navigate(-1);
    } catch (error) {
      logger.error('Failed to save profile:', error);
      showError('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const isProfileIncomplete = !profile?.name || !profile?.age || !profile?.gender;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white flex flex-col relative overflow-x-hidden">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-gray-100 dark:border-surface-border">
        <div className="flex items-center p-4 justify-between max-w-lg mx-auto w-full">
          <button
            onClick={() => navigate(-1)}
            className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-900 dark:text-white" />
          </button>
          <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center">
            Profile Setup
          </h2>
          <div className="size-10"></div>
        </div>
        {/* Progress Indicators */}
        {isProfileIncomplete && (
          <div className="flex w-full items-center justify-center gap-2 pb-4">
            <div className="h-1.5 w-6 rounded-full bg-primary"></div>
            <div className="h-1.5 w-6 rounded-full bg-white dark:bg-surface-border"></div>
            <div className="h-1.5 w-6 rounded-full bg-white dark:bg-surface-border"></div>
          </div>
        )}
      </div>

      {/* Main Scrollable Content */}
      <main className="flex-1 w-full max-w-lg mx-auto flex flex-col gap-8 px-4 py-6 pb-32">
        {/* Profile Picture Upload */}
        <ProfilePictureUpload
          picture={profilePicture || profile?.profilePicture}
          onPictureChange={async (newPicture) => {
            // Prevent loop by setting flag
            isUpdatingPictureRef.current = true;
            try {
              setProfilePicture(newPicture);
              // Update store immediately so it shows on home page right away
              if (profile?.id) {
                await updateProfilePictureInStore(newPicture);
              }
            } finally {
              // Reset flag after a short delay to allow store update to complete
              setTimeout(() => {
                isUpdatingPictureRef.current = false;
              }, 100);
            }
          }}
        />

        {/* Personal Details */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold tracking-tight px-1">Personal Details</h3>
          
          {/* Full Name */}
          <label className="block">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5 block ml-1">
              Full Name
            </span>
            <input
              className="w-full rounded-xl border border-gray-100 dark:border-surface-border bg-white dark:bg-surface-dark px-4 py-3.5 text-base text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#FF9933] focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
              placeholder="Enter your full name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          {/* Row: Age & Gender */}
          <div className="grid grid-cols-3 gap-4">
            <label className="col-span-1 block">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5 block ml-1">
                Age
              </span>
              <input
                className="w-full rounded-xl border border-gray-100 dark:border-surface-border bg-white dark:bg-surface-dark px-4 py-3.5 text-center text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                placeholder="25"
                type="number"
                min="1"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value === '' ? '' : parseInt(e.target.value))}
              />
            </label>
            <div className="col-span-2 flex flex-col">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5 block ml-1">
                Gender
              </span>
              <div className="flex rounded-xl bg-white dark:bg-surface-dark p-1 h-[50px]">
                <button
                  onClick={() => setGender('male')}
                  className={cn(
                    'flex-1 rounded-lg text-sm font-medium transition-all',
                    gender === 'male'
                      ? 'bg-white dark:bg-primary text-slate-900 dark:text-black shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  Male
                </button>
                <button
                  onClick={() => setGender('female')}
                  className={cn(
                    'flex-1 rounded-lg text-sm font-medium transition-all',
                    gender === 'female'
                      ? 'bg-white dark:bg-primary text-slate-900 dark:text-black shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  Female
                </button>
                <button
                  onClick={() => setGender('other')}
                  className={cn(
                    'flex-1 rounded-lg text-sm font-medium transition-all',
                    gender === 'other'
                      ? 'bg-white dark:bg-primary text-slate-900 dark:text-black shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  Other
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Body Metrics */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xl font-bold tracking-tight">Body Metrics</h3>
            <UnitSwitcher unit={unitSystem} onUnitChange={setUnitSystem} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* Weight */}
            <label className="block relative">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5 block ml-1">
                Weight
              </span>
              <div className="relative">
                <Scale className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  className="w-full rounded-xl border border-gray-100 dark:border-surface-border bg-white dark:bg-surface-dark pl-11 pr-12 py-3.5 text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                  placeholder={unitSystem === 'metric' ? '75' : '165'}
                  type="number"
                  min="0"
                  step={unitSystem === 'metric' ? '0.1' : '1'}
                  value={unitSystem === 'metric' ? weightKg : weightLbs}
                  onChange={(e) => handleWeightChange(e.target.value, unitSystem)}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500 dark:text-slate-400">
                  {unitSystem === 'metric' ? 'kg' : 'lbs'}
                </span>
              </div>
            </label>

            {/* Height */}
            <label className="block">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5 block ml-1">
                Height
              </span>
              {unitSystem === 'metric' ? (
                <div className="relative">
                  <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    className="w-full rounded-xl border border-gray-100 dark:border-surface-border bg-white dark:bg-surface-dark pl-11 pr-12 py-3.5 text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                    placeholder="180"
                    type="number"
                    min="0"
                    value={heightCm}
                    onChange={(e) => handleHeightChange(e.target.value, 'metric')}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500 dark:text-slate-400">
                    cm
                  </span>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      className="w-full rounded-xl border border-gray-100 dark:border-surface-border bg-white dark:bg-surface-dark pl-11 pr-12 py-3.5 text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                      placeholder="5"
                      type="number"
                      min="0"
                      max="8"
                      value={heightFeet}
                      onChange={(e) => handleHeightChange(e.target.value, 'imperial', 'feet')}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500 dark:text-slate-400">
                      ft
                    </span>
                  </div>
                  <div className="relative flex-1">
                    <input
                      className="w-full rounded-xl border border-gray-100 dark:border-surface-border bg-white dark:bg-surface-dark px-4 pr-12 py-3.5 text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                      placeholder="10"
                      type="number"
                      min="0"
                      max="11"
                      value={heightInches}
                      onChange={(e) => handleHeightChange(e.target.value, 'imperial', 'inches')}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500 dark:text-slate-400">
                      in
                    </span>
                  </div>
                </div>
              )}
            </label>
          </div>
        </section>

        {/* Primary Goal */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold tracking-tight px-1">Primary Goal</h3>
          <GoalSelection
            selectedGoals={selectedGoals}
            onGoalsChange={setSelectedGoals}
          />
        </section>

        {/* Workout Preferences */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold tracking-tight px-1">Workout Preferences</h3>
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5 block ml-1">
                Default Rest Time (seconds)
              </span>
              <input
                className="w-full rounded-xl border border-gray-100 dark:border-surface-border bg-white dark:bg-surface-dark px-4 py-3.5 text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                type="number"
                min="0"
                max="600"
                value={defaultRestTime}
                onChange={(e) => setDefaultRestTimeLocal(parseInt(e.target.value) || 90)}
              />
            </label>
          </div>
        </section>

        {/* Display Settings */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold tracking-tight px-1">Display</h3>
          <div className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5 block ml-1">
                Theme
              </span>
              <div className="flex rounded-xl bg-white dark:bg-surface-dark p-1 h-[50px]">
                <button
                  onClick={() => setTheme('light')}
                  className={cn(
                    'flex-1 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2',
                    settings.theme === 'light'
                      ? 'bg-white dark:bg-primary text-slate-900 dark:text-black shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <Sun className="w-4 h-4" />
                  Light
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={cn(
                    'flex-1 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2',
                    settings.theme === 'dark'
                      ? 'bg-white dark:bg-primary text-slate-900 dark:text-black shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <Moon className="w-4 h-4" />
                  Dark
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={cn(
                    'flex-1 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2',
                    settings.theme === 'system'
                      ? 'bg-white dark:bg-primary text-slate-900 dark:text-black shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <Monitor className="w-4 h-4" />
                  System
                </button>
              </div>
            </label>
          </div>
        </section>

        {/* Cloud Sync */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold tracking-tight px-1">Cloud Sync</h3>
          <div className="space-y-3">
            {/* Sync Status Display */}
            <div className="p-4 rounded-xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-surface-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isSyncing ? (
                    <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-blue-500" />
                  )}
                  <div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">
                      {isSyncing ? 'Syncing...' : 'Synced to Firestore'}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Last sync: {formatLastSyncTime(lastSyncTime)}
                    </span>
                  </div>
                </div>
              </div>

              {lastSyncMessage && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-surface-border">
                  <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{lastSyncMessage}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Manual Sync Button */}
            <button
              onClick={handleManualSync}
              disabled={isSyncing || !profile?.id || isLoading}
              className={cn(
                'w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-surface-border',
                'hover:bg-gray-50 dark:hover:bg-surface-dark-light transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              title={
                isLoading
                  ? 'Loading profile...'
                  : !profile?.id
                  ? 'Please wait for profile to load'
                  : isSyncing
                  ? 'Sync in progress...'
                  : 'Sync your data to Firestore'
              }
            >
              <div className="flex items-center gap-3">
                {isSyncing ? (
                  <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
                ) : (
                  <RefreshCw className="w-5 h-5 text-slate-400" />
                )}
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {isSyncing
                    ? 'Syncing...'
                    : isLoading
                    ? 'Loading...'
                    : !profile?.id
                    ? 'Waiting for profile...'
                    : 'Sync Now'}
                </span>
              </div>
              {isSyncing ? (
                <LoadingSpinner size="sm" />
              ) : isLoading || !profile?.id ? (
                <Clock className="w-4 h-4 text-slate-400" />
              ) : (
                <ArrowRight className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {/* Sync Info */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-blue-800 dark:text-blue-300 font-medium mb-1">
                  Cloud Sync with Firestore
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Your data is securely synced to Firebase Firestore. Click "Sync Now" to manually sync your workouts, exercises, templates, and profile data.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Data Management */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold tracking-tight px-1">Data Management</h3>
          <div className="space-y-3">
            <button
              onClick={async () => {
                if (!profile?.id) return;
                setIsExporting(true);
                setShowExportModal(true);
                setExportProgress({
                  percentage: 0,
                  currentOperation: 'Preparing export...',
                  completedItems: 0,
                  totalItems: 8,
                });
                
                const progressCallback: ProgressCallback = (progress) => {
                  setExportProgress(progress);
                };
                
                try {
                  setExportError(null);
                  await dataExport.downloadExport(profile.id, undefined, progressCallback);
                  success('Data exported successfully');
                } catch (error) {
                  const errorMessage = error instanceof Error ? error.message : 'Failed to export data';
                  setExportError(errorMessage);
                  showError(errorMessage);
                  logger.error('Export failed', error);
                } finally {
                  setIsExporting(false);
                  // Keep modal open for a moment to show completion or error
                  if (!exportError) {
                    setTimeout(() => {
                      setExportProgress(null);
                    }, 2000);
                  }
                }
              }}
              disabled={isExporting || !profile?.id}
              className={cn(
                'w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-surface-border',
                'hover:bg-gray-50 dark:hover:bg-surface-dark-light transition-colors touch-manipulation active:scale-[0.98] min-h-[44px]',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Export Data</span>
              </div>
              {isExporting ? (
                <LoadingSpinner size="sm" />
              ) : (
                <ArrowRight className="w-4 h-4 text-slate-400" />
              )}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting || !profile?.id}
              className={cn(
                'w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-surface-border',
                'hover:bg-gray-50 dark:hover:bg-surface-dark-light transition-colors touch-manipulation active:scale-[0.98] min-h-[44px]',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <div className="flex items-center gap-3">
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Import Data</span>
              </div>
              {isImporting ? (
                <LoadingSpinner size="sm" />
              ) : (
                <ArrowRight className="w-4 h-4 text-slate-400" />
              )}
            </button>
            <button
              onClick={() => navigate('/trash')}
              className={cn(
                'w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-surface-border',
                'hover:bg-gray-50 dark:hover:bg-surface-dark-light transition-colors touch-manipulation active:scale-[0.98] min-h-[44px]'
              )}
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Trash</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !profile?.id) {
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                  return;
                }
                
                // Validate file size (max 50MB for safety)
                const maxSize = 50 * 1024 * 1024; // 50MB
                if (file.size > maxSize) {
                  showError('File is too large. Maximum size is 50MB.');
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                  return;
                }
                
                try {
                  // Parse and validate file once
                  const parsedData = await dataExport.parseExportFile(file);

                  // Validate structure
                  const isValid = dataExport.validateExportFile(parsedData);
                  if (!isValid) {
                    throw new Error('Invalid export file structure');
                  }

                  // Get preview from parsed data (no re-parse)
                  const preview = dataExport.previewImport(parsedData);
                  setImportPreview(preview);
                  setSelectedFile(file);
                  setShowImportStrategyModal(true);
                } catch (error) {
                  const errorMessage = error instanceof Error ? error.message : 'Failed to validate import file';
                  showError(errorMessage);
                  logger.error('Import file validation failed', error);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }
              }}
            />
            <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
              <p className="text-xs text-yellow-800 dark:text-yellow-300">
                Export all your data including workouts, templates, exercises, sleep logs, and more. 
                Import supports merge (add new) or replace (clear all) strategies.
              </p>
            </div>
          </div>
        </section>

        {/* Export Progress Modal */}
        <ExportProgressModal
          isOpen={showExportModal}
          progress={exportProgress}
          error={exportError}
          onClose={() => {
            setShowExportModal(false);
            setExportProgress(null);
            setExportError(null);
          }}
        />

        {/* Import Strategy Modal */}
        <ImportErrorBoundary
          fallbackTitle="Import Configuration Error"
          onReset={() => {
            setShowImportStrategyModal(false);
            setImportPreview(null);
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
          onError={(error) => {
            logger.error('[Profile] Import strategy modal error:', error);
            showError('Import configuration failed. Please try again.');
          }}
        >
          {showImportStrategyModal && importPreview && selectedFile && (
            <ImportStrategyModal
              preview={importPreview}
              onSelect={async (strategy: ImportStrategy) => {
              setShowImportStrategyModal(false);
              if (!profile?.id || !selectedFile) return;
              
              setIsImporting(true);
              setShowImportModal(true);
              setImportProgress({
                percentage: 0,
                currentOperation: 'Starting import...',
                completedItems: 0,
                totalItems: 9,
              });
              
              const progressCallback: ProgressCallback = (progress) => {
                setImportProgress(progress);
              };
              
              try {
                const result = await dataExport.importFromFile(
                  profile.id,
                  selectedFile,
                  strategy,
                  progressCallback
                );
                setImportResult(result);

                if (result.errors.length > 0) {
                  showError(
                    `Imported ${result.imported} items with ${result.errors.length} error(s)`
                  );
                } else {
                  success(`Successfully imported ${result.imported} items`);
                }

                // Refresh data WITHOUT full page reload
                setImportProgress({
                  percentage: 100,
                  currentOperation: 'Syncing to cloud...',
                  completedItems: 9,
                  totalItems: 10,
                });

                try {
                  await refreshAllAppData(profile.id, {
                    includeSync: true,
                    syncTimeoutMs: 15000
                  });
                  success('Data synced successfully!');
                } catch (refreshError) {
                  logger.error('Failed to refresh after import:', refreshError);
                  showError('Import completed but data refresh failed. Please refresh the page manually.');
                }

                // Keep modal open to show results
              } catch (error) {
                showError(error instanceof Error ? error.message : 'Failed to import data');
                setShowImportModal(false);
              } finally {
                setIsImporting(false);
                setSelectedFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }
            }}
            onCancel={() => {
              setShowImportStrategyModal(false);
              setImportPreview(null);
              setSelectedFile(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
            />
          )}
        </ImportErrorBoundary>

        {/* Import Progress Modal */}
        <ImportErrorBoundary
          fallbackTitle="Import Progress Error"
          onReset={() => {
            setShowImportModal(false);
            setImportProgress(null);
            setImportResult(null);
            setIsImporting(false);
          }}
          onError={(error) => {
            logger.error('[Profile] Import progress modal error:', error);
            showError('Import display failed. Your data may have been imported - check your workout history.');
          }}
        >
          <ImportProgressModal
            isOpen={showImportModal}
            progress={importProgress}
            result={importResult}
            onClose={() => {
              setShowImportModal(false);
              setImportProgress(null);
              setImportResult(null);
            }}
          />
        </ImportErrorBoundary>

        {/* Notification Settings */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold tracking-tight px-1">Notifications</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-surface-border">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Auto-start Rest Timer</span>
              </div>
              <input
                type="checkbox"
                checked={settings.autoStartRestTimer}
                onChange={toggleAutoStartRestTimer}
                className="w-5 h-5 rounded accent-primary"
              />
            </label>
            <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-surface-border">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Sound Alerts</span>
              </div>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={toggleSound}
                className="w-5 h-5 rounded accent-primary"
              />
            </label>
            <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-surface-border">
              <div className="flex items-center gap-3">
                <Vibrate className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Vibration</span>
              </div>
              <input
                type="checkbox"
                checked={settings.vibrationEnabled}
                onChange={toggleVibration}
                className="w-5 h-5 rounded accent-primary"
              />
            </label>
          </div>
        </section>

        {/* Push Notification Settings */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold tracking-tight px-1">Push Notifications</h3>
          <div className="space-y-3">
            {settings.notificationPermission === 'default' && (
              <button
                onClick={async () => {
                  const permission = await notificationService.requestPermission();
                  await setNotificationPermission(permission);
                  if (permission === 'granted') {
                    success('Notification permission granted');
                  } else if (permission === 'denied') {
                    showError('Notification permission denied. Please enable it in your browser settings.');
                  }
                }}
                className="w-full p-3 rounded-xl bg-primary hover:bg-[#E67E22] text-black font-semibold transition-colors"
              >
                Enable Notifications
              </button>
            )}
            
            {settings.notificationPermission === 'denied' && (
              <div className="p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-yellow-800 dark:text-yellow-300">
                    Notifications are disabled. Please enable them in your browser settings to receive workout reminders and recovery alerts.
                  </p>
                </div>
              </div>
            )}

            {settings.notificationPermission === 'granted' && (
              <>
                <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-surface-border">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-slate-400" />
                    <div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">Workout Reminders</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Get notified before planned workouts</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.workoutReminderEnabled ?? true}
                    onChange={(e) => setWorkoutReminderEnabled(e.target.checked)}
                    className="w-5 h-5 rounded accent-primary"
                  />
                </label>

                {settings.workoutReminderEnabled && (
                  <label className="block p-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-surface-border">
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className="w-5 h-5 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Reminder Time</span>
                    </div>
                    <select
                      value={settings.workoutReminderMinutes ?? 30}
                      onChange={(e) => setWorkoutReminderMinutes(parseInt(e.target.value))}
                      className="w-full rounded-lg border border-gray-100 dark:border-surface-border bg-white dark:bg-surface-dark px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    >
                      <option value={15}>15 minutes before</option>
                      <option value={30}>30 minutes before</option>
                      <option value={60}>1 hour before</option>
                      <option value={120}>2 hours before</option>
                    </select>
                  </label>
                )}

                <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-surface-border">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-slate-400" />
                    <div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">Muscle Recovery Alerts</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Get notified when muscles are ready</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.muscleRecoveryAlertsEnabled ?? true}
                    onChange={(e) => setMuscleRecoveryAlertsEnabled(e.target.checked)}
                    className="w-5 h-5 rounded accent-primary"
                  />
                </label>
              </>
            )}
          </div>
        </section>
      </main>

      {/* Floating Action Button Area */}
      <div className="fixed bottom-20 left-0 w-full bg-gradient-to-t from-background-light via-background-light to-transparent dark:from-background-dark dark:via-background-dark dark:to-transparent pt-12 pb-6 px-4">
        <div className="max-w-lg mx-auto w-full">
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className={cn(
              'w-full rounded-xl bg-primary hover:bg-[#E67E22] text-black font-bold text-lg py-4',
              'shadow-[0_4px_14px_0_rgba(255,153,51,0.39)] transition-all active:scale-[0.98]',
              'flex items-center justify-center gap-2',
              (isSaving || isLoading) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isSaving || isLoading ? (
              <>
                <LoadingSpinner size="sm" />
                Saving...
              </>
            ) : (
              <>
                Save & Continue
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

