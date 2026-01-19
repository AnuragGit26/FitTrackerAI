import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { userContextManager } from '@/services/userContextManager';

export function SignUp() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { signUp, signInWithGoogle, signInWithApple } = useAuth();
  const navigate = useNavigate();

  const handleEmailSignUp = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password || !displayName) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password should be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Clear user context before signup
      userContextManager.clear();

      await signUp({ email, password, displayName });
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignUp = async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    setError(null);

    try {
      // Clear user context before signup
      userContextManager.clear();

      if (provider === 'google') {
        await signInWithGoogle();
      } else {
        await signInWithApple();
      }
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up with social provider');
    } finally {
      setIsLoading(false);
    }
  };

  const displayError = error;

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display min-h-screen flex flex-col antialiased overflow-x-hidden selection:bg-primary selection:text-background-dark">
      {/* Top Navigation */}
      <div className="flex items-center justify-between p-4 sticky top-0 z-10 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md">
        <Link
          to="/login"
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-2xl leading-none">arrow_back</span>
        </Link>
        <h2 className="text-lg font-bold leading-tight tracking-tight">Sign Up</h2>
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col px-4 pt-2 pb-8 max-w-md mx-auto w-full">
        {/* Hero Section */}
        <div className="flex flex-col items-center mb-8 mt-2">
          {/* Logo Placeholder / Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(255,153,51,0.3)]">
            <span
              className="material-symbols-outlined text-background-dark text-4xl leading-none"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}
            >
              fitness_center
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-center leading-tight mb-3">
            Unlock Your <span className="text-primary">Potential</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-center text-base font-normal leading-relaxed max-w-[320px]">
            Track workouts, visualize gains, and train smarter with AI insights.
          </p>
        </div>

        {/* Form Section */}
        <div className="flex flex-col gap-5 w-full">
          {displayError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-sm"
            >
              {displayError}
            </motion.div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleEmailSignUp} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="displayName"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
              >
                Full Name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="John Doe"
                disabled={isLoading}
                className="w-full h-12 px-4 rounded-lg border border-slate-200 dark:border-purple-900/50 bg-white dark:bg-surface-dark text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                required
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={isLoading}
                className="w-full h-12 px-4 rounded-lg border border-slate-200 dark:border-purple-900/50 bg-white dark:bg-surface-dark text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                disabled={isLoading}
                className="w-full h-12 px-4 rounded-lg border border-slate-200 dark:border-purple-900/50 bg-white dark:bg-surface-dark text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-4 w-full bg-primary hover:bg-primary-dark disabled:bg-primary/50 text-background-dark font-bold text-lg py-4 rounded-xl shadow-[0_4px_20px_rgba(255,153,51,0.25)] hover:shadow-[0_4px_25px_rgba(255,153,51,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined text-xl animate-spin">refresh</span>
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <span className="material-symbols-outlined text-xl leading-none">arrow_forward</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-purple-900/50"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-background-light dark:bg-background-dark text-slate-500">
              Or continue with
            </span>
          </div>
        </div>

        {/* Social Login */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleSocialSignUp('google')}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 bg-white dark:bg-surface-dark border border-slate-200 dark:border-purple-900/50 hover:border-primary/50 dark:hover:border-primary/50 rounded-xl py-3 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
                className="group-hover:opacity-80 transition-opacity"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
                className="group-hover:opacity-80 transition-opacity"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
                className="group-hover:opacity-80 transition-opacity"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
                className="group-hover:opacity-80 transition-opacity"
              />
            </svg>
            <span className="font-medium text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors">
              Google
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleSocialSignUp('apple')}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 bg-white dark:bg-surface-dark border border-slate-200 dark:border-purple-900/50 hover:border-primary/50 dark:hover:border-primary/50 rounded-xl py-3 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <img
              src="https://i.pinimg.com/736x/65/22/5a/65225ab6d965e5804a632b643e317bf4.jpg"
              alt="Apple"
              className="w-5 h-5 object-contain group-hover:opacity-80 transition-opacity"
            />
            <span className="font-medium text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors">
              Apple
            </span>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-8 text-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-primary font-semibold hover:underline decoration-2 underline-offset-4"
            >
              Log In
            </Link>
          </p>
        </div>

        {/* Decorative Background Element */}
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 opacity-20 dark:opacity-10 overflow-hidden">
          {/* Abstract muscle pattern suggestion */}
          <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-primary rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[200px] h-[200px] bg-purple-800 rounded-full blur-[100px]"></div>
        </div>
      </main>
    </div>
  );
}


