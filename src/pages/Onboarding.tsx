import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Bell, Check, User, Activity, Brain, BarChart2 } from 'lucide-react';
import { useUserStore, Gender, UnitSystem, unitHelpers, Goal } from '@/store/userStore';
import { useSettingsStore } from '@/store/settingsStore';
import { notificationService } from '@/services/notificationService';
import { ProfilePictureUpload } from '@/components/profile/ProfilePictureUpload';
import { UnitSwitcher } from '@/components/profile/UnitSwitcher';
import { GoalSelection } from '@/components/profile/GoalSelectionCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { cn } from '@/utils/cn';
import { ToastContainer } from '@/components/common/Toast';
import { useToast } from '@/hooks/useToast';

const STEPS = [
  { id: 'intro', title: 'Welcome' },
  { id: 'profile', title: 'Profile' },
  { id: 'details', title: 'Details' },
  { id: 'notifications', title: 'Notifications' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { profile, updateProfile, setHasCompletedOnboarding, setPreferredUnit, setProfilePicture } = useUserStore();
  const { setNotificationPermission, setWorkoutReminderEnabled, setMuscleRecoveryAlertsEnabled } = useSettingsStore();
  const { toasts, removeToast, success, error: showError } = useToast();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [profilePicture, setLocalProfilePicture] = useState<string | undefined>();
  const [age, setAge] = useState<number | ''>('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
  const [weightKg, setWeightKg] = useState<number | ''>('');
  const [heightCm, setHeightCm] = useState<number | ''>('');
  const [selectedGoals, setSelectedGoals] = useState<Goal[]>([]);
  
  // Imperial display values
  const [weightLbs, setWeightLbs] = useState<number | ''>('');
  const [heightFeet, setHeightFeet] = useState<number | ''>('');
  const [heightInches, setHeightInches] = useState<number | ''>('');

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      if (profile.profilePicture) {setLocalProfilePicture(profile.profilePicture);}
      if (profile.age) {
    setAge(profile.age);
  }
      if (profile.gender) {
    setGender(profile.gender);
  }
      if (profile.preferredUnit) {
    setUnitSystem(profile.preferredUnit === 'lbs' ? 'imperial' : 'metric');
  }
      
      // Initialize metrics if present
      if (profile.weight) {
        setWeightKg(profile.weight);
        setWeightLbs(Math.round(unitHelpers.kgToLbs(profile.weight)));
      }
      if (profile.height) {
        setHeightCm(profile.height);
        const { feet, inches } = unitHelpers.cmToFeetInches(profile.height);
        setHeightFeet(feet);
        setHeightInches(inches);
      }
      if (profile.goals) {
    setSelectedGoals(profile.goals);
  }
    }
  }, [profile]);

  // Metric handlers
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

  const handleNext = async () => {
    if (currentStep === STEPS.length - 1) {
      await handleFinish();
    } else {
      // Validation
      if (currentStep === 1 && !name.trim()) {
        showError('Please enter your name');
        return;
      }
      if (currentStep === 2) {
        if (!age || !gender || !weightKg || !heightCm || selectedGoals.length === 0) {
          showError('Please fill in all details');
          return;
        }
      }
      
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleFinish = async () => {
    if (!profile?.id) {
    return;
  }
    setIsSaving(true);
    try {
      const updates = {
        name,
        age: age as number,
        gender: gender as Gender,
        weight: weightKg as number,
        height: heightCm as number,
        goals: selectedGoals,
        preferredUnit: unitSystem === 'imperial' ? 'lbs' : 'kg' as 'kg' | 'lbs',
        hasCompletedOnboarding: true,
        profilePicture: profilePicture,
      };

      await updateProfile(updates);
      await setPreferredUnit(unitSystem === 'imperial' ? 'lbs' : 'kg');
      
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Onboarding save failed:', error);
      showError('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotificationPermission = async () => {
    const permission = await notificationService.requestPermission();
    await setNotificationPermission(permission);
    if (permission === 'granted') {
      await setWorkoutReminderEnabled(true);
      await setMuscleRecoveryAlertsEnabled(true);
      success('Notifications enabled!');
    } else {
      showError('Notifications denied. You can enable them later in settings.');
    }
  };

  const stepVariants = {
    hidden: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    visible: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.3, ease: 'easeOut' },
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -50 : 50,
      opacity: 0,
      transition: { duration: 0.3, ease: 'easeIn' },
    }),
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="px-6 py-6 flex items-center justify-between">
        <div className="flex gap-2">
          {STEPS.map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-1.5 w-8 rounded-full transition-colors duration-300",
                index <= currentStep ? "bg-primary" : "bg-white dark:bg-surface-border"
              )}
            />
          ))}
        </div>
        <button 
          onClick={handleFinish}
          className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-primary transition-colors"
        >
          Skip
        </button>
      </div>

      <div className="flex-1 px-6 pb-24 overflow-y-auto">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={stepVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="h-full flex flex-col"
          >
            {currentStep === 0 && (
              <div className="flex flex-col items-center justify-center flex-1 text-center space-y-8 mt-10">
                <div className="space-y-4">
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                    Welcome to FitTrackAI
                  </h1>
                  <p className="text-slate-600 dark:text-slate-300 max-w-xs mx-auto">
                    Your intelligent companion for strength, recovery, and progress.
                  </p>
                </div>

                <div className="grid gap-4 w-full max-w-sm">
                  <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-gray-100 dark:border-surface-border flex items-center gap-4 text-left shadow-sm">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                      <Activity className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">Track Workouts</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Log sets, reps, and RPE with ease</p>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-gray-100 dark:border-surface-border flex items-center gap-4 text-left shadow-sm">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
                      <Brain className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">AI Coach</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Personalized insights & recommendations</p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-gray-100 dark:border-surface-border flex items-center gap-4 text-left shadow-sm">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                      <BarChart2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">Analytics</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Visualize progress & muscle recovery</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="flex flex-col flex-1 space-y-8 mt-4">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Let&apos;s get to know you</h2>
                  <p className="text-slate-500 dark:text-slate-400">
                    Add a photo and your name to personalize your experience.
                  </p>
                </div>

                <div className="flex-1 flex flex-col items-center gap-8">
                  <ProfilePictureUpload
                    picture={profilePicture}
                    onPictureChange={(url) => {
                        setLocalProfilePicture(url);
                        setProfilePicture(url); // Update store immediately for sync
                    }}
                  />
                  
                  <div className="w-full max-w-sm space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full rounded-xl border border-gray-100 dark:border-surface-border bg-white dark:bg-surface-dark px-4 py-3.5 text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="flex flex-col flex-1 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Your Stats</h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">
                    This helps us calculate calorie burn and recovery.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Gender */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Gender</label>
                    <div className="flex gap-2">
                      {['male', 'female', 'other'].map((g) => (
                        <button
                          key={g}
                          onClick={() => setGender(g as Gender)}
                          className={cn(
                            "flex-1 py-3 rounded-xl border-2 font-medium capitalize transition-all",
                            gender === g
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-gray-100 dark:border-surface-border bg-white dark:bg-surface-dark text-slate-500 hover:border-primary/50"
                          )}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Age */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Age</label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value ? parseInt(e.target.value) : '')}
                      placeholder="25"
                      className="w-full rounded-xl border border-gray-100 dark:border-surface-border bg-white dark:bg-surface-dark px-4 py-3.5 text-slate-900 dark:text-white focus:border-primary outline-none"
                    />
                  </div>

                  {/* Unit & Metrics */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Body Metrics</label>
                      <UnitSwitcher unit={unitSystem} onUnitChange={setUnitSystem} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="relative">
                        <input
                          type="number"
                          value={unitSystem === 'metric' ? weightKg : weightLbs}
                          onChange={(e) => handleWeightChange(e.target.value, unitSystem)}
                          placeholder="Weight"
                          className="w-full rounded-xl border border-gray-100 dark:border-surface-border bg-white dark:bg-surface-dark px-4 py-3.5 text-slate-900 dark:text-white focus:border-primary outline-none"
                        />
                        <span className="absolute right-4 top-3.5 text-slate-400 font-medium text-sm">
                          {unitSystem === 'metric' ? 'kg' : 'lbs'}
                        </span>
                      </div>

                      {unitSystem === 'metric' ? (
                        <div className="relative">
                          <input
                            type="number"
                            value={heightCm}
                            onChange={(e) => handleHeightChange(e.target.value, 'metric')}
                            placeholder="Height"
                            className="w-full rounded-xl border border-gray-100 dark:border-surface-border bg-white dark:bg-surface-dark px-4 py-3.5 text-slate-900 dark:text-white focus:border-primary outline-none"
                          />
                          <span className="absolute right-4 top-3.5 text-slate-400 font-medium text-sm">cm</span>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input
                              type="number"
                              value={heightFeet}
                              onChange={(e) => handleHeightChange(e.target.value, 'imperial', 'feet')}
                              placeholder="ft"
                              className="w-full rounded-xl border border-gray-100 dark:border-surface-border bg-white dark:bg-surface-dark px-3 py-3.5 text-slate-900 dark:text-white focus:border-primary outline-none"
                            />
                            <span className="absolute right-2 top-3.5 text-slate-400 font-medium text-sm">ft</span>
                          </div>
                          <div className="relative flex-1">
                            <input
                              type="number"
                              value={heightInches}
                              onChange={(e) => handleHeightChange(e.target.value, 'imperial', 'inches')}
                              placeholder="in"
                              className="w-full rounded-xl border border-gray-100 dark:border-surface-border bg-white dark:bg-surface-dark px-3 py-3.5 text-slate-900 dark:text-white focus:border-primary outline-none"
                            />
                            <span className="absolute right-2 top-3.5 text-slate-400 font-medium text-sm">in</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Goals */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Primary Goals</label>
                    <GoalSelection selectedGoals={selectedGoals} onGoalsChange={setSelectedGoals} />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="flex flex-col items-center justify-center flex-1 text-center space-y-8 mt-10">
                <div className="bg-primary/10 p-6 rounded-full">
                  <Bell className="w-12 h-12 text-primary" />
                </div>
                
                <div className="space-y-4 max-w-xs">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Stay on Track</h2>
                  <p className="text-slate-600 dark:text-slate-300">
                    Enable notifications to get workout reminders and recovery alerts when your muscles are ready.
                  </p>
                </div>

                <div className="w-full max-w-sm bg-white dark:bg-surface-dark rounded-2xl border border-gray-100 dark:border-surface-border p-4 space-y-4 text-left shadow-sm">
                  <div className="flex gap-3">
                    <div className="mt-1 bg-blue-100 dark:bg-blue-900/30 p-1 rounded-full h-fit">
                      <Check className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white text-sm">Workout Reminders</h4>
                      <p className="text-xs text-slate-500">Never miss a planned session</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="mt-1 bg-blue-100 dark:bg-blue-900/30 p-1 rounded-full h-fit">
                      <Check className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white text-sm">Recovery Alerts</h4>
                      <p className="text-xs text-slate-500">Know exactly when to train again</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleNotificationPermission}
                  className="text-primary font-semibold hover:underline"
                >
                  Enable Notifications
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-t border-gray-100 dark:border-surface-border z-10">
        <div className="flex gap-4 max-w-md mx-auto">
          {currentStep > 0 && (
            <button
              onClick={handleBack}
              className="flex items-center justify-center size-12 rounded-xl border border-gray-100 dark:border-surface-border bg-white dark:bg-surface-dark text-slate-900 dark:text-white hover:bg-gray-50 dark:hover:bg-surface-border transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={isSaving}
            className="flex-1 h-12 bg-primary hover:bg-primary-dark text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
          >
            {isSaving ? (
              <LoadingSpinner size="sm" color="text-black" />
            ) : currentStep === STEPS.length - 1 ? (
              'Get Started'
            ) : (
              <>
                Next Step <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
