import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { TimeWheelPicker } from '@/components/common/TimeWheelPicker';
import { Modal } from '@/components/common/Modal';
import { dataService } from '@/services/dataService';
import { restTimerService, RestTimerPreset } from '@/services/restTimerService';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/utils/cn';

interface RestTimerSettingsData {
  defaultDuration: number;
  autoStart: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  notificationSound: string;
  lockScreenActivity: boolean;
  countdownOverlay: boolean;
  presets: RestTimerPreset[];
}

export function RestTimerSettings() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [restTimerSettings, setRestTimerSettings] = useState<RestTimerSettingsData>({
    defaultDuration: 90,
    autoStart: true,
    soundEnabled: true,
    vibrationEnabled: true,
    notificationSound: 'boxing-bell',
    lockScreenActivity: false,
    countdownOverlay: false,
    presets: restTimerService.getDefaultPresets(),
  });
  const [isEditingPresets, setIsEditingPresets] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [minutes, setMinutes] = useState(1);
  const [seconds, setSeconds] = useState(30);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await dataService.getSetting('restTimerSettings');
      if (saved && typeof saved === 'object' && 'defaultDuration' in saved) {
        const settings = saved as RestTimerSettingsData;
        setRestTimerSettings(settings);
        const totalSeconds = settings.defaultDuration || 90;
        setMinutes(Math.floor(totalSeconds / 60));
        setSeconds(totalSeconds % 60);
      }
    } catch (error) {
      console.error('Failed to load rest timer settings:', error);
    }
  };

  const saveSettings = async (updates: Partial<RestTimerSettingsData>) => {
    try {
      const updated = { ...restTimerSettings, ...updates };
      await dataService.updateSetting('restTimerSettings', updated);
      setRestTimerSettings(updated);
      success('Settings saved');
    } catch (error) {
      showError('Failed to save settings');
    }
  };

  const handleTimeChange = (mins: number, secs: number) => {
    setMinutes(mins);
    setSeconds(secs);
    const totalSeconds = mins * 60 + secs;
    saveSettings({ defaultDuration: totalSeconds });
  };

  const handleReset = async () => {
    const defaultSettings: RestTimerSettingsData = {
      defaultDuration: 90,
      autoStart: true,
      soundEnabled: true,
      vibrationEnabled: true,
      notificationSound: 'boxing-bell',
      lockScreenActivity: false,
      countdownOverlay: false,
      presets: restTimerService.getDefaultPresets(),
    };
    await saveSettings(defaultSettings);
    setMinutes(1);
    setSeconds(30);
    setShowResetConfirm(false);
    success('Settings reset to defaults');
  };

  const handleToggle = (key: keyof RestTimerSettingsData, value: boolean) => {
    saveSettings({ [key]: value });
  };

  const handleNotificationSoundChange = async () => {
    // TODO: Implement sound selector modal
    success('Sound selection coming soon');
  };

  return (
    <div className="relative flex h-full min-h-screen w-full max-w-md mx-auto flex-col overflow-hidden bg-background-light dark:bg-background-dark shadow-2xl">
      {/* Top App Bar */}
      <div className="sticky top-0 z-50 flex items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md p-4 pb-3 justify-between border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-900 dark:text-white flex size-10 shrink-0 items-center justify-center rounded-full active:bg-gray-200 dark:active:bg-gray-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10">
          Rest Timer
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Global Defaults Section */}
        <div className="pt-2">
          <h3 className="text-slate-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider px-6 pb-2 pt-4">
            Global Defaults
          </h3>

          {/* Time Picker Container */}
          <div className="px-4 py-2">
            <div className="bg-white dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="text-center mb-4">
                <span className="text-sm text-slate-500 dark:text-gray-400 font-medium">
                  Standard Rest Duration
                </span>
              </div>
              <TimeWheelPicker
                minutes={minutes}
                seconds={seconds}
                onChange={handleTimeChange}
              />
            </div>
          </div>

          {/* Auto-start Toggle */}
          <div className="px-4 mt-2">
            <div className="flex items-center bg-white dark:bg-surface-dark px-4 py-3.5 rounded-xl justify-between border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="flex flex-col">
                <p className="text-slate-900 dark:text-white text-base font-medium leading-normal flex-1 truncate">
                  Auto-start Timer
                </p>
                <p className="text-slate-500 dark:text-gray-400 text-xs mt-0.5">
                  Start immediately after logging a set
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={restTimerSettings.autoStart}
                  onChange={(e) => handleToggle('autoStart', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Smart Presets Section */}
        <div className="pt-2">
          <div className="flex items-center justify-between px-6 pb-2 pt-4">
            <h3 className="text-slate-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">
              Smart Presets
            </h3>
            <button
              onClick={() => setIsEditingPresets(!isEditingPresets)}
              className="text-primary text-xs font-bold uppercase tracking-wider hover:text-primary/80"
            >
              {isEditingPresets ? 'Done' : 'Edit'}
            </button>
          </div>
          <div className="px-4 space-y-2">
            {restTimerSettings.presets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center bg-white dark:bg-surface-dark px-4 py-3 rounded-xl justify-between border border-gray-100 dark:border-gray-800 shadow-sm active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-full',
                      preset.color === 'orange' && 'bg-orange-500/10 text-orange-500',
                      preset.color === 'blue' && 'bg-blue-500/10 text-blue-500',
                      preset.color === 'purple' && 'bg-purple-500/10 text-purple-500'
                    )}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {preset.icon}
                    </span>
                  </div>
                  <div>
                    <p className="text-slate-900 dark:text-white text-sm font-medium">
                      {preset.name}
                    </p>
                    <p className="text-slate-500 dark:text-gray-400 text-xs">
                      {preset.description}
                    </p>
                  </div>
                </div>
                <div className="bg-gray-100 dark:bg-surface-darker px-3 py-1 rounded-md">
                  <span className="text-slate-900 dark:text-white text-sm font-bold font-mono">
                    {Math.floor(preset.duration / 60)}:
                    {(preset.duration % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>
            ))}

            {/* Add New */}
            <button className="w-full flex items-center justify-center gap-2 bg-transparent border border-dashed border-gray-300 dark:border-gray-700 p-3 rounded-xl text-slate-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-surface-dark transition-colors">
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Add Custom Preset</span>
            </button>
          </div>
        </div>

        {/* Feedback & Notifications Section */}
        <div className="pt-2">
          <h3 className="text-slate-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider px-6 pb-2 pt-4">
            Feedback & Notifications
          </h3>
          <div className="bg-white dark:bg-surface-dark rounded-xl mx-4 overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm">
            {/* Sound Toggle */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400 dark:text-gray-500">
                  volume_up
                </span>
                <span className="text-slate-900 dark:text-white text-sm font-medium">
                  Play Sound
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={restTimerSettings.soundEnabled}
                  onChange={(e) => handleToggle('soundEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* Vibration Toggle */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400 dark:text-gray-500">
                  vibration
                </span>
                <span className="text-slate-900 dark:text-white text-sm font-medium">
                  Vibration
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={restTimerSettings.vibrationEnabled}
                  onChange={(e) => handleToggle('vibrationEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* Sound Selection */}
            <button
              onClick={handleNotificationSoundChange}
              className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700/50 cursor-pointer active:bg-gray-50 dark:active:bg-surface-darker transition-colors w-full"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400 dark:text-gray-500">
                  music_note
                </span>
                <span className="text-slate-900 dark:text-white text-sm font-medium">
                  Notification Sound
                </span>
              </div>
              <div className="flex items-center gap-1 text-slate-500 dark:text-gray-400">
                <span className="text-sm">Boxing Bell</span>
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </div>
            </button>

            {/* Lock Screen Live Activity */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400 dark:text-gray-500">
                  lock_clock
                </span>
                <div className="flex flex-col">
                  <span className="text-slate-900 dark:text-white text-sm font-medium">
                    Lock Screen Live Activity
                  </span>
                  <span className="text-xs text-slate-500 dark:text-gray-500">
                    Show timer on lock screen
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={restTimerSettings.lockScreenActivity}
                  onChange={(e) => handleToggle('lockScreenActivity', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Visual Settings */}
        <div className="pt-2 pb-6">
          <h3 className="text-slate-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider px-6 pb-2 pt-4">
            Visuals
          </h3>
          <div className="bg-white dark:bg-surface-dark rounded-xl mx-4 overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400 dark:text-gray-500">
                  picture_in_picture_alt
                </span>
                <span className="text-slate-900 dark:text-white text-sm font-medium">
                  Countdown Overlay
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={restTimerSettings.countdownOverlay}
                  onChange={(e) => handleToggle('countdownOverlay', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
          <div className="px-4 mt-6">
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full py-3.5 rounded-xl text-red-500 dark:text-red-400 font-medium text-sm bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
            >
              Reset to Default Settings
            </button>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        title="Reset Settings"
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to reset all rest timer settings to defaults? This action cannot be undone.
          </p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowResetConfirm(false)}
              className="flex-1 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleReset}
              className="flex-1 h-12 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

