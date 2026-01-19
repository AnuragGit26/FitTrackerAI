import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signInWithGoogle, signInWithApple } = useAuth();
  const navigate = useNavigate();

  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await signIn({ email, password });
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    setError(null);

    try {
      if (provider === 'google') {
        await signInWithGoogle();
      } else {
        await signInWithApple();
      }
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with social provider');
    } finally {
      setIsLoading(false);
    }
  };

  const displayError = error;

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark font-display">
      {/* Header Image Area */}
      <div className="@container">
        <div className="@[480px]:px-4 @[480px]:py-3 pt-4">
          <div
            className="w-full bg-center bg-no-repeat bg-cover flex flex-col justify-end overflow-hidden @[480px]:rounded-lg h-[240px] relative"
            style={{
              backgroundImage:
                'linear-gradient(to bottom, rgba(16,34,23,0) 0%, rgba(16,34,23,1) 100%), url("https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80")',
            }}
          >
            <div className="absolute inset-0 bg-background-dark/30 mix-blend-multiply"></div>
          </div>
        </div>
      </div>

      {/* Headline Area */}
      <div className="px-6 pt-2 pb-6">
        <h1 className="text-slate-900 dark:text-white tracking-tight text-[32px] font-bold leading-tight text-left">
          Welcome Back
        </h1>
        <p className="text-slate-500 dark:text-secondary-text text-base font-normal leading-normal pt-2 text-left">
          Log in to continue your streak and track your gains.
        </p>
      </div>

      {/* Form Area */}
      <div className="flex flex-col gap-5 px-6 pb-4 w-full max-w-[480px] mx-auto">
        {displayError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-sm"
          >
            {displayError}
          </motion.div>
        )}

        {/* Login Form */}
        <form onSubmit={handleEmailLogin} className="flex flex-col gap-4 pt-2">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2"
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
              className="w-full h-12 px-4 rounded-lg border border-gray-100 dark:border-border-dark bg-white dark:bg-surface-dark text-slate-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
              className="w-full h-12 px-4 rounded-lg border border-gray-100 dark:border-border-dark bg-white dark:bg-surface-dark text-slate-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-background-dark font-bold text-lg h-14 rounded-full transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,153,51,0.2)] disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined text-xl animate-spin">refresh</span>
                Signing in...
              </>
            ) : (
              <>
                Log In
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        {/* Social Login Divider */}
        <div className="relative py-4 flex items-center">
          <div className="flex-grow border-t border-gray-100 dark:border-border-dark"></div>
          <span className="flex-shrink-0 mx-4 text-slate-500 dark:text-secondary-text text-sm">
            Or continue with
          </span>
          <div className="flex-grow border-t border-gray-100 dark:border-border-dark"></div>
        </div>

        {/* Social Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleSocialLogin('google')}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 h-12 rounded-lg border border-gray-100 dark:border-border-dark bg-white dark:bg-surface-dark hover:bg-gray-50 dark:hover:bg-surface-dark/80 text-slate-900 dark:text-white transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
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
            <span className="text-sm font-medium">Google</span>
          </button>
          <button
            type="button"
            onClick={() => handleSocialLogin('apple')}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 h-12 rounded-lg border border-gray-100 dark:border-border-dark bg-white dark:bg-surface-dark hover:bg-gray-50 dark:hover:bg-surface-dark/80 text-slate-900 dark:text-white transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <img
              src="https://i.pinimg.com/736x/65/22/5a/65225ab6d965e5804a632b643e317bf4.jpg"
              alt="Apple"
              className="w-5 h-5 object-contain group-hover:opacity-80 transition-opacity"
            />
            <span className="text-sm font-medium">Apple</span>
          </button>
        </div>
      </div>

      {/* Footer / Sign Up Link */}
      <div className="mt-auto py-8 text-center">
        <p className="text-slate-500 dark:text-secondary-text">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="text-primary font-bold hover:underline ml-1">
            Sign Up
          </Link>
        </p>
      </div>
      <div className="h-5"></div>
    </div>
  );
}

