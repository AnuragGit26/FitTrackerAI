import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSignIn } from '@clerk/clerk-react';
import { motion } from 'framer-motion';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn, setActive } = useSignIn();
  const navigate = useNavigate();
  const isCreatingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Prevent duplicate calls
    if (isCreatingRef.current || isLoading) {
      return;
    }

    setIsLoading(true);
    isCreatingRef.current = true;

    try {
      const result = await signIn?.create({
        identifier: email,
        password,
      });

      if (result?.status === 'complete') {
        if (setActive && result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
        }
        navigate('/');
      } else {
        setError('Please check your email for verification.');
      }
    } catch (err: unknown) {
      const errorObj = err as { errors?: Array<{ message?: string }> };
      setError(errorObj.errors?.[0]?.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
      isCreatingRef.current = false;
    }
  };

  const handleSocialLogin = async (strategy: 'oauth_google' | 'oauth_apple') => {
    try {
      await signIn?.authenticateWithRedirect({
        strategy,
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/',
      });
    } catch (err: unknown) {
      const errorObj = err as { errors?: Array<{ message?: string }> };
      setError(errorObj.errors?.[0]?.message || 'Failed to sign in with social provider.');
    }
  };

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
        <h1 className="text-gray-900 dark:text-white tracking-tight text-[32px] font-bold leading-tight text-left">
          Welcome Back
        </h1>
        <p className="text-gray-600 dark:text-secondary-text text-base font-normal leading-normal pt-2 text-left">
          Log in to continue your streak and track your gains.
        </p>
      </div>

      {/* Form Area */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 pb-4 w-full max-w-[480px] mx-auto">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}

        {/* Email Field */}
        <label className="flex flex-col flex-1">
          <p className="text-gray-900 dark:text-white text-base font-medium leading-normal pb-2">
            Email Address
          </p>
          <div className="relative">
            <input
              className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 dark:border-border-dark bg-white dark:bg-surface-dark focus:border-primary h-14 placeholder:text-gray-400 dark:placeholder:text-secondary-text/60 p-[15px] text-base font-normal leading-normal transition-colors"
              placeholder="Enter your email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-secondary-text pointer-events-none flex items-center">
              <span className="material-symbols-outlined text-xl">mail</span>
            </div>
          </div>
        </label>

        {/* Password Field */}
        <label className="flex flex-col flex-1">
          <div className="flex justify-between items-center pb-2">
            <p className="text-gray-900 dark:text-white text-base font-medium leading-normal">Password</p>
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Forgot Password?
            </Link>
          </div>
          <div className="flex w-full flex-1 items-stretch rounded-lg group">
            <input
              className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg rounded-r-none text-gray-900 dark:text-white focus:outline-0 focus:ring-0 border border-gray-300 dark:border-border-dark border-r-0 bg-white dark:bg-surface-dark focus:border-primary h-14 placeholder:text-gray-400 dark:placeholder:text-secondary-text/60 p-[15px] text-base font-normal leading-normal z-10"
              placeholder="Enter your password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="flex items-center justify-center px-4 rounded-r-lg border border-l-0 border-gray-300 dark:border-border-dark bg-white dark:bg-surface-dark text-gray-400 dark:text-secondary-text hover:text-primary transition-colors focus:border-primary group-focus-within:border-primary"
            >
              <span className="material-symbols-outlined text-xl">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </label>

        {/* Login Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary/90 text-background-dark font-bold text-lg h-14 rounded-full transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(13,242,105,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Logging in...' : 'Log In'}
            <span className="material-symbols-outlined text-xl">arrow_forward</span>
          </button>
        </div>

        {/* Social Login Divider */}
        <div className="relative py-4 flex items-center">
          <div className="flex-grow border-t border-gray-300 dark:border-border-dark"></div>
          <span className="flex-shrink-0 mx-4 text-gray-500 dark:text-secondary-text text-sm">
            Or continue with
          </span>
          <div className="flex-grow border-t border-gray-300 dark:border-border-dark"></div>
        </div>

        {/* Social Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleSocialLogin('oauth_google')}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 h-12 rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-surface-dark hover:bg-gray-50 dark:hover:bg-surface-dark/80 text-gray-900 dark:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
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
            onClick={() => handleSocialLogin('oauth_apple')}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 h-12 rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-surface-dark hover:bg-gray-50 dark:hover:bg-surface-dark/80 text-gray-900 dark:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <svg
              className="w-5 h-5 text-gray-900 dark:text-white group-hover:text-primary transition-colors"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.96-3.24-.96-1.23 0-2.08.5-3.41.96-1.41.62-2.75 1.05-4.23.4C1.44 20.28.5 18.5.5 16.5c0-2.05.5-3.5 1.5-4.5.98-.98 2.5-1.5 4.5-1.5 1.23 0 2.08.5 3.41.96 1.41.62 2.75 1.05 4.23.4 1.33-.5 2.1-1.05 3.08-2.05.98-.98 1.5-2.5 1.5-4.5 0-2.05-.5-3.5-1.5-4.5-.98-.98-2.5-1.5-4.5-1.5-1.23 0-2.08.5-3.41.96-1.41.62-2.75 1.05-4.23.4C1.44 3.72.5 1.94.5 0c0-2.05.5-3.5 1.5-4.5.98-.98 2.5-1.5 4.5-1.5 1.23 0 2.08.5 3.41.96 1.41.62 2.75 1.05 4.23.4 1.33-.5 2.1-1.05 3.08-2.05.98-.98 1.5-2.5 1.5-4.5 0-2.05-.5-3.5-1.5-4.5z" />
            </svg>
            <span className="text-sm font-medium">Apple</span>
          </button>
        </div>
      </form>

      {/* Footer / Sign Up Link */}
      <div className="mt-auto py-8 text-center">
        <p className="text-gray-600 dark:text-secondary-text">
<<<<<<< HEAD
          Don&apos;t have an account?{' '}
=======
          Don't have an account?{' '}
>>>>>>> ee369b24fdc7224128bbae3cb927419803f1da73
          <Link to="/signup" className="text-primary font-bold hover:underline ml-1">
            Sign Up
          </Link>
        </p>
      </div>
      <div className="h-5"></div>
    </div>
  );
}

