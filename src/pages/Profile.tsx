import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Scale, Ruler, Moon, Sun, Monitor, Bell, Volume2, Vibrate, Download, Upload, AlertCircle } from 'lucide-react';
import { useUserStore, Gender, UnitSystem, unitHelpers, Goal } from '@/store/userStore';
import { useSettingsStore } from '@/store/settingsStore';
import { ProfilePictureUpload } from '@/components/profile/ProfilePictureUpload';
import { UnitSwitcher } from '@/components/profile/UnitSwitcher';
import { GoalSelection } from '@/components/profile/GoalSelectionCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { dataExport } from '@/services/dataExport';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/utils/cn';

export function Profile() {
  const navigate = useNavigate();
  const { profile, updateProfile, isLoading, setPreferredUnit, setDefaultRestTime } = useUserStore();
  const { settings, setTheme, toggleAutoStartRestTimer, toggleSound, toggleVibration, loadSettings } = useSettingsStore();

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

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setAge(profile.age ?? '');
      setGender(profile.gender || '');
      setProfilePicture(profile.profilePicture);
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
      const updates: any = {
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
      console.error('Failed to save profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
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
          picture={profilePicture}
          onPictureChange={setProfilePicture}
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

        {/* Data Management */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold tracking-tight px-1">Data Management</h3>
          <div className="space-y-3">
            <button
              onClick={async () => {
                if (!profile?.id) return;
                setIsExporting(true);
                try {
                  await dataExport.downloadExport(profile.id);
                  success('Data exported successfully');
                } catch (error) {
                  showError(error instanceof Error ? error.message : 'Failed to export data');
                } finally {
                  setIsExporting(false);
                }
              }}
              disabled={isExporting || !profile?.id}
              className={cn(
                'w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-surface-border',
                'hover:bg-gray-50 dark:hover:bg-surface-dark-light transition-colors',
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
                'hover:bg-gray-50 dark:hover:bg-surface-dark-light transition-colors',
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
              accept=".json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !profile?.id) return;
                
                setIsImporting(true);
                try {
                  const result = await dataExport.importFromFile(profile.id, file);
                  if (result.errors.length > 0) {
                    showError(`Imported ${result.imported} items with ${result.errors.length} errors`);
                  } else {
                    success(`Successfully imported ${result.imported} items`);
                  }
                } catch (error) {
                  showError(error instanceof Error ? error.message : 'Failed to import data');
                } finally {
                  setIsImporting(false);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }
              }}
            />
            <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
              <p className="text-xs text-yellow-800 dark:text-yellow-300">
                Export your data to keep a backup. Import will add data to your existing records.
              </p>
            </div>
          </div>
        </section>

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

