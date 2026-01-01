import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { ArrowLeft, ArrowRight, Scale, Ruler, Moon, Sun, Monitor, Bell, Volume2, Vibrate, Download, Upload, AlertCircle, Clock, Cloud, CloudOff, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
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
import { dataService } from '@/services/dataService';
import { mongodbSyncService } from '@/services/mongodbSyncService';
import { syncMetadataService } from '@/services/syncMetadataService';
import { SyncStatus, SyncProgress } from '@/types/sync';
import { logger } from '@/utils/logger';
import { ImportStrategyModal } from '@/components/profile/ImportStrategyModal';
import { ExportProgressModal } from '@/components/profile/ExportProgressModal';
import { ImportProgressModal } from '@/components/profile/ImportProgressModal';
import { ImportStrategy, ImportResult, ProgressCallback } from '@/types/export';

export function Profile() {
  const navigate = useNavigate();
  const { user: auth0User, getAccessTokenSilently, isAuthenticated } = useAuth0();
  const { profile, updateProfile, isLoading, setPreferredUnit, setDefaultRestTime, setProfilePicture: updateProfilePictureInStore, syncToAuth0, auth0SyncStatus, auth0SyncError } = useUserStore();
  
  // Debug logging for profile state
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[Profile] Component render - profile:', profile, 'profile?.id:', profile?.id, 'isLoading:', isLoading, 'isAuthenticated:', isAuthenticated);
  }, [profile, isLoading, isAuthenticated]);
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
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncMetadata, setSyncMetadata] = useState<Array<{ conflictCount?: number; syncStatus?: SyncStatus; lastSyncAt?: number | null }>>([]);
  const [lastSyncMessage, setLastSyncMessage] = useState<string | null>(null);
  
  // Auth0 sync state
  const [auth0SyncEnabled, setAuth0SyncEnabled] = useState(false);
  const [isSyncingToAuth0, setIsSyncingToAuth0] = useState(false);
  const [lastAuth0SyncTime, setLastAuth0SyncTime] = useState<Date | null>(null);

  useEffect(() => {
    loadSettings();
    // Initialize notification service and check permission
    notificationService.initialize().then(() => {
      if ('Notification' in window) {
        setNotificationPermission(Notification.permission);
      }
    });
    
    // Set up sync progress callback
    mongodbSyncService.setProgressCallback((progress) => {
      setSyncProgress(progress);
    });
    
    return () => {
      mongodbSyncService.setProgressCallback(null);
    };
  }, [loadSettings, setNotificationPermission]);
  
  // Load sync status when profile is available
  useEffect(() => {
    if (profile?.id) {
      loadSyncStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);
  
  const loadSyncStatus = useCallback(async () => {
    if (!profile?.id) return;
    
    try {
      const currentlySyncing = mongodbSyncService.getIsSyncing();
      setIsSyncing(currentlySyncing);
      
      if (currentlySyncing) {
        setSyncStatus('syncing');
        setSyncProgress(mongodbSyncService.getCurrentProgress());
      } else {
        const status = await mongodbSyncService.getSyncStatus(profile.id);
        setSyncStatus(status);
      }
      
      const metadata = await syncMetadataService.getAllMetadata(profile.id);
      setSyncMetadata(metadata);
      
      // Find the most recent sync time
      const mostRecent = metadata
        .filter(m => m.lastSyncAt)
        .sort((a, b) => (b.lastSyncAt || 0) - (a.lastSyncAt || 0))[0];
      
      if (mostRecent?.lastSyncAt) {
        setLastSyncTime(new Date(mostRecent.lastSyncAt));
      }
      
      // Check if auto-sync is enabled (stored in settings)
      const autoSyncSetting = await dataService.getSetting('autoSyncEnabled');
      setAutoSyncEnabled(autoSyncSetting === true);
      
      // Check if Auth0 auto-sync is enabled
      const auth0AutoSyncSetting = await dataService.getSetting('auth0AutoSyncEnabled');
      setAuth0SyncEnabled(auth0AutoSyncSetting === true);
    } catch (error) {
      logger.error('Failed to load sync status', error);
    }
  }, [profile?.id]);
  
  // Poll sync status when syncing
  useEffect(() => {
    if (!isSyncing) return;
    
    const intervalId = setInterval(() => {
      const currentlySyncing = mongodbSyncService.getIsSyncing();
      setIsSyncing(currentlySyncing);
      setSyncProgress(mongodbSyncService.getCurrentProgress());
      
      if (!currentlySyncing) {
        loadSyncStatus();
      }
    }, 1000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [isSyncing, loadSyncStatus]);
  
  const handleToggleAutoSync = async (enabled: boolean) => {
    setAutoSyncEnabled(enabled);
    dataService.enableSync(enabled);
    await dataService.updateSetting('autoSyncEnabled', enabled);
    if (enabled) {
      success('Auto-sync enabled. Changes will be synced automatically.');
    } else {
      success('Auto-sync disabled.');
    }
  };
  
  const handleManualSync = async () => {
    // eslint-disable-next-line no-console
    console.log('[Profile.handleManualSync] Button clicked, profile.id:', profile?.id, 'isSyncing:', isSyncing);
    
    if (!profile?.id || isSyncing) {
      // eslint-disable-next-line no-console
      console.warn('[Profile.handleManualSync] Sync aborted - missing profile.id or already syncing');
      return;
    }
    
    setIsSyncing(true);
    setSyncStatus('syncing');
    
    try {
      // eslint-disable-next-line no-console
      console.log('[Profile.handleManualSync] Calling mongodbSyncService.sync...');
      const results = await mongodbSyncService.sync(profile.id, {
        direction: 'bidirectional',
      });
      
      // eslint-disable-next-line no-console
      console.log('[Profile.handleManualSync] Sync completed, results:', results);
      
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
        setSyncStatus('error');
        showError('Sync completed with some errors. Check sync details for more information.');
      } else if (totalConflicts > 0) {
        setSyncStatus('conflict');
        success(`Sync completed with ${totalConflicts} conflict(s) resolved.`);
      } else if (noChanges) {
        setSyncStatus('success');
        setLastSyncMessage('All data is up to date. No changes to sync.');
        success('All data is up to date. No changes to sync.');
      } else {
        setSyncStatus('success');
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
      await loadSyncStatus();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[Profile.handleManualSync] Sync error:', error);
      setSyncStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync data';
      
      // Provide helpful error message for missing env var
      if (errorMessage.includes('VITE_MONGODB_URI') || errorMessage.includes('MONGODB_URI')) {
        showError(
          'MongoDB is not configured. Please add VITE_MONGODB_URI to your .env file. ' +
          'Get your connection string from MongoDB Atlas.'
        );
      } else if (errorMessage.includes('VITE_SUPABASE') || errorMessage.includes('anonymous key is not configured')) {
        showError(
          'Supabase is not configured. Please add VITE_SUPABASE_ANON_KEY to your .env file. ' +
          'Get your key from Supabase project settings → API.'
        );
      } else {
        showError(`Sync failed: ${errorMessage}`);
      }
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
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
  
  const getSyncStatusIcon = (status: SyncStatus) => {
    switch (status) {
      case 'syncing':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'conflict':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <CloudOff className="w-5 h-5 text-slate-400" />;
    }
  };
  
  const getSyncStatusText = (status: SyncStatus): string => {
    switch (status) {
      case 'syncing':
        return 'Syncing...';
      case 'success':
        return 'Synced';
      case 'error':
        return 'Sync Error';
      case 'conflict':
        return 'Conflicts Resolved';
      default:
        return 'Not Synced';
    }
  };
  
  const totalConflicts = syncMetadata.reduce((sum, m) => sum + (m.conflictCount || 0), 0);
  const hasErrors = syncMetadata.some(m => m.syncStatus === 'error');

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
      
      // Sync to Auth0 if enabled and user is authenticated
      if (auth0SyncEnabled && isAuthenticated && auth0User) {
        try {
          setIsSyncingToAuth0(true);
          const accessToken = await getAccessTokenSilently();
          await syncToAuth0(auth0User, accessToken);
          setLastAuth0SyncTime(new Date());
          success('Profile synced to Auth0 successfully');
        } catch (error) {
          logger.error('Failed to sync to Auth0', error);
          showError('Profile saved locally but failed to sync to Auth0. Please try syncing manually.');
        } finally {
          setIsSyncingToAuth0(false);
        }
      }
      
      navigate(-1);
    } catch (error) {
      console.error('Failed to save profile:', error);
      showError('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleAuth0Sync = async () => {
    if (!isAuthenticated || !auth0User || !profile) return;
    
    setIsSyncingToAuth0(true);
    try {
      const accessToken = await getAccessTokenSilently();
      await syncToAuth0(auth0User, accessToken);
      setLastAuth0SyncTime(new Date());
      success('Profile synced to Auth0 successfully');
    } catch (error) {
      logger.error('Failed to sync to Auth0', error);
      showError(auth0SyncError || 'Failed to sync to Auth0. Please check your Auth0 configuration.');
    } finally {
      setIsSyncingToAuth0(false);
    }
  };
  
  const getAuth0SyncStatusIcon = () => {
    if (isSyncingToAuth0 || auth0SyncStatus === 'syncing') {
      return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
    }
    switch (auth0SyncStatus) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <CloudOff className="w-5 h-5 text-slate-400" />;
    }
  };
  
  const getAuth0SyncStatusText = (): string => {
    if (isSyncingToAuth0 || auth0SyncStatus === 'syncing') {
      return 'Syncing...';
    }
    switch (auth0SyncStatus) {
      case 'success':
        return 'Synced';
      case 'error':
        return 'Sync Error';
      default:
        return 'Not Synced';
    }
  };

  const isProfileIncomplete = !profile?.name || !profile?.age || !profile?.gender;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white flex flex-col relative overflow-x-hidden">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-gray-200 dark:border-surface-border">
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
            <div className="h-1.5 w-6 rounded-full bg-gray-300 dark:bg-surface-border"></div>
            <div className="h-1.5 w-6 rounded-full bg-gray-300 dark:bg-surface-border"></div>
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
              className="w-full rounded-xl border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-dark px-4 py-3.5 text-base text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#90cba8] focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
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
                className="w-full rounded-xl border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-dark px-4 py-3.5 text-center text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
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
              <div className="flex rounded-xl bg-gray-200 dark:bg-surface-dark p-1 h-[50px]">
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
                  className="w-full rounded-xl border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-dark pl-11 pr-12 py-3.5 text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
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
                    className="w-full rounded-xl border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-dark pl-11 pr-12 py-3.5 text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
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
                      className="w-full rounded-xl border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-dark pl-11 pr-12 py-3.5 text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
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
                      className="w-full rounded-xl border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-dark px-4 pr-12 py-3.5 text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
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
                className="w-full rounded-xl border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-dark px-4 py-3.5 text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
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
              <div className="flex rounded-xl bg-gray-200 dark:bg-surface-dark p-1 h-[50px]">
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
            {/* Sync Status Card */}
            <div className="p-4 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-surface-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getSyncStatusIcon(syncStatus)}
                  <div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">
                      {getSyncStatusText(syncStatus)}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Last sync: {formatLastSyncTime(lastSyncTime)}
                    </span>
                  </div>
                </div>
              </div>
              
              {syncProgress && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span>{syncProgress.currentOperation}</span>
                    <span>{syncProgress.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-surface-border rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${syncProgress.percentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {syncProgress.completedTables} of {syncProgress.totalTables} tables synced
                  </div>
                </div>
              )}
              
              {(totalConflicts > 0 || hasErrors || lastSyncMessage) && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-surface-border space-y-1">
                  {lastSyncMessage && syncStatus === 'success' && (
                    <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{lastSyncMessage}</span>
                    </div>
                  )}
                  {totalConflicts > 0 && (
                    <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{totalConflicts} conflict{totalConflicts > 1 ? 's' : ''} resolved</span>
                    </div>
                  )}
                  {hasErrors && (
                    <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                      <XCircle className="w-4 h-4" />
                      <span>Some sync errors occurred</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Auto Sync Toggle */}
            <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-surface-border">
              <div className="flex items-center gap-3">
                <Cloud className="w-5 h-5 text-slate-400" />
                <div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">Auto Sync</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Automatically sync changes to cloud</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoSyncEnabled}
                onChange={(e) => handleToggleAutoSync(e.target.checked)}
                className="w-5 h-5 rounded accent-primary"
                disabled={isSyncing}
              />
            </label>
            
            {/* Manual Sync Button */}
            <button
              onClick={handleManualSync}
              disabled={isSyncing || !profile?.id || isLoading}
              className={cn(
                'w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-surface-border',
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
                  : 'Sync your data to MongoDB'
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
                  Cloud Sync Information
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Your data is securely synced to the cloud. Enable auto-sync to keep your data backed up automatically, or sync manually whenever you want.
                </p>
              </div>
            </div>
            
            {/* Auth0 Sync Section */}
            {isAuthenticated && (
              <>
                <div className="pt-4 border-t border-gray-200 dark:border-surface-border">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 px-1">
                    Auth0 Profile Sync
                  </h4>
                </div>
                
                {/* Auth0 Sync Status Card */}
                <div className="p-4 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-surface-border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getAuth0SyncStatusIcon()}
                      <div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">
                          {getAuth0SyncStatusText()}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Last sync: {formatLastSyncTime(lastAuth0SyncTime)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {auth0SyncError && auth0SyncStatus === 'error' && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-surface-border">
                      <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
                        <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span className="flex-1">{auth0SyncError}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Auth0 Auto Sync Toggle */}
                <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-surface-border">
                  <div className="flex items-center gap-3">
                    <Cloud className="w-5 h-5 text-slate-400" />
                    <div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">Auto Sync to Auth0</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Automatically sync profile changes to Auth0</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={auth0SyncEnabled}
                    onChange={(e) => {
                      setAuth0SyncEnabled(e.target.checked);
                      dataService.updateSetting('auth0AutoSyncEnabled', e.target.checked);
                      if (e.target.checked) {
                        success('Auth0 auto-sync enabled');
                      } else {
                        success('Auth0 auto-sync disabled');
                      }
                    }}
                    className="w-5 h-5 rounded accent-primary"
                    disabled={isSyncingToAuth0}
                  />
                </label>
                
                {/* Manual Auth0 Sync Button */}
                <button
                  onClick={handleAuth0Sync}
                  disabled={isSyncingToAuth0 || !profile}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-surface-border',
                    'hover:bg-gray-50 dark:hover:bg-surface-dark-light transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {isSyncingToAuth0 ? (
                      <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
                    ) : (
                      <RefreshCw className="w-5 h-5 text-slate-400" />
                    )}
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {isSyncingToAuth0 ? 'Syncing to Auth0...' : 'Sync to Auth0 Now'}
                    </span>
                  </div>
                  {isSyncingToAuth0 ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                
                {/* Auth0 Sync Info */}
                <div className="flex items-start gap-2 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                  <Cloud className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-purple-800 dark:text-purple-300 font-medium mb-1">
                      Auth0 Profile Sync
                    </p>
                    <p className="text-xs text-purple-700 dark:text-purple-400">
                      Sync your profile information (name, email, picture, and fitness data) directly to your Auth0 account. This keeps your Auth0 profile up to date with your FitTrackAI profile.
                    </p>
                  </div>
                </div>
              </>
            )}
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
                'w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-surface-border',
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
                'w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-surface-border',
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
                  // Validate and preview file
                  await dataExport.validateExportFile(file);
                  const preview = await dataExport.previewImport(file);
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
                
                // Refresh data
                window.location.reload();
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

        {/* Import Progress Modal */}
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

        {/* Notification Settings */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold tracking-tight px-1">Notifications</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-surface-border">
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
            <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-surface-border">
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
            <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-surface-border">
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
                className="w-full p-3 rounded-xl bg-primary hover:bg-[#0be060] text-black font-semibold transition-colors"
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
                <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-surface-border">
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
                  <label className="block p-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-surface-border">
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className="w-5 h-5 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Reminder Time</span>
                    </div>
                    <select
                      value={settings.workoutReminderMinutes ?? 30}
                      onChange={(e) => setWorkoutReminderMinutes(parseInt(e.target.value))}
                      className="w-full rounded-lg border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-dark px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    >
                      <option value={15}>15 minutes before</option>
                      <option value={30}>30 minutes before</option>
                      <option value={60}>1 hour before</option>
                      <option value={120}>2 hours before</option>
                    </select>
                  </label>
                )}

                <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-surface-border">
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
              'w-full rounded-xl bg-primary hover:bg-[#0be060] text-black font-bold text-lg py-4',
              'shadow-[0_4px_14px_0_rgba(13,242,105,0.39)] transition-all active:scale-[0.98]',
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

