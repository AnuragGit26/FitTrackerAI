import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSignUp, useAuth } from '@clerk/clerk-react';
import { motion } from 'framer-motion';

export function SignUp() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const { signUp, setActive } = useSignUp();
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();
  const formSubmitTimeRef = useRef<number | null>(null);
  const isUpdatingRef = useRef(false);
  const isCreatingRef = useRef(false);
  const hasPreparedVerificationRef = useRef(false);

  // Pre-fill email from OAuth signup if available
  // Only run when signUp.emailAddress changes, not on every email state change
  useEffect(() => {
    // Pre-fill email if available from OAuth signup
    if (signUp?.emailAddress && email !== signUp.emailAddress) {
      setEmail(signUp.emailAddress);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signUp?.emailAddress]); // Only depend on signUp.emailAddress, not email state (intentional)

  // Check if email verification is needed (only check status, don't auto-prepare)
  useEffect(() => {
    const emailVerification = signUp?.verifications?.emailAddress;
    const needsVerification = signUp?.unverifiedFields?.includes('email_address') && 
                              emailVerification?.status !== 'verified';
    setNeedsEmailVerification(needsVerification || false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signUp?.unverifiedFields, signUp?.verifications?.emailAddress?.status]); // emailVerification object reference changes, but we only need status

  const handleVerifyEmail = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await signUp?.attemptEmailAddressVerification({
        code: verificationCode,
      });

      if (signUp?.status === 'complete' && signUp.createdSessionId && setActive) {
        await setActive({ session: signUp.createdSessionId });
        navigate('/');
        return;
      }

      // If still needs verification, show error
      if (signUp?.unverifiedFields?.includes('email_address')) {
        setError('Invalid verification code. Please try again.');
      } else {
        setNeedsEmailVerification(false);
      }
    } catch (err: unknown) {
      const errorObj = err as { errors?: Array<{ message?: string }> };
      const errorMessage = errorObj.errors?.[0]?.message || 'Invalid verification code. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    formSubmitTimeRef.current = Date.now();

    // Prevent duplicate calls
    if (isUpdatingRef.current || isCreatingRef.current || isLoading) {
      return;
    }

    // Reset verification preparation flag for new submission
    hasPreparedVerificationRef.current = false;

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      // Check if signUp is already in progress from OAuth (missing_requirements status)
      if (signUp?.status === 'missing_requirements') {
        // Try to update the existing signUp with email/password
        // Use the email from signUp if available (from OAuth), otherwise use form email
        const emailToUse = signUp.emailAddress || email;
        try {
          // Prevent duplicate update calls
          if (isUpdatingRef.current) {
            return;
          }
          isUpdatingRef.current = true;

          await signUp.update({
            emailAddress: emailToUse,
            password,
            username: username || undefined, // Include username if provided
          });

          // If email is unverified, try to verify it
          if (signUp.unverifiedFields?.includes('email_address')) {
            try {
              // Prevent duplicate prepareEmailAddressVerification calls
              if (hasPreparedVerificationRef.current) {
                return;
              }
              hasPreparedVerificationRef.current = true;
              
              // Prepare email verification
              await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });

              // For OAuth emails, try to attempt verification immediately (if Clerk supports it)
              // If email came from OAuth, it might already be verified on the provider side
              // Wait a bit for Clerk to process
              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (verifyError) {
              // Error handled silently - user will see verification UI
            }
          }

          // Check if signup is now complete (re-check signUp to get updated status)
          // Use a type assertion to allow TypeScript to check the updated status
          const updatedSignUp = signUp;
          const currentSignUpStatus = updatedSignUp.status as string;
          if (currentSignUpStatus === 'complete' && updatedSignUp.createdSessionId && setActive) {
            await setActive({ session: updatedSignUp.createdSessionId });
            
            // Wait for auth state to propagate (check both isSignedIn and isLoaded)
            let waitAttempts = 0;
            const maxWaitAttempts = 30; // Wait up to 3 seconds
            while (waitAttempts < maxWaitAttempts && (!isSignedIn || !isLoaded)) {
              await new Promise(resolve => setTimeout(resolve, 100));
              waitAttempts++;
            }
            
            navigate('/');
            return;
          }

          // If still missing requirements, check what's needed
          if (currentSignUpStatus === 'missing_requirements') {
            // If only username is missing, we can't auto-complete that - user needs to provide it
            // If email is still unverified, we need to show verification UI
            // For now, fall through to show error or continue with normal flow
          }
        } catch (updateError) {
          isUpdatingRef.current = false; // Reset on error
          // Fall through to create new signup
        } finally {
          isUpdatingRef.current = false; // Reset after update completes
        }
      }

      // Prevent duplicate create calls
      if (isCreatingRef.current) {
        setIsLoading(false);
        return;
      }
      isCreatingRef.current = true;

      const result = await signUp?.create({
        emailAddress: email,
        password,
        username: username || undefined, // Include username if provided
      });

      if (result?.status === 'complete') {
        if (setActive) {
          await setActive({ session: result.createdSessionId });
          
          // Wait for auth state to propagate (check both isSignedIn and isLoaded)
          let waitAttempts = 0;
          const maxWaitAttempts = 30; // Wait up to 3 seconds
          while (waitAttempts < maxWaitAttempts && (!isSignedIn || !isLoaded)) {
            await new Promise(resolve => setTimeout(resolve, 100));
            waitAttempts++;
          }
        }
        navigate('/');
      } else {
        // Email verification required
        setError('Please check your email for verification.');
      }
    } catch (err: unknown) {
      const errorObj = err as { errors?: Array<{ message?: string; code?: string; longMessage?: string }> };
      const errorMessage = errorObj.errors?.[0]?.message || 'Failed to create account. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      isUpdatingRef.current = false;
      isCreatingRef.current = false;
    }
  };

  const handleSocialLogin = async (strategy: 'oauth_google' | 'oauth_apple') => {
    try {
      await signUp?.authenticateWithRedirect({
        strategy,
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/',
      });
    } catch (err: unknown) {
      const errorObj = err as { errors?: Array<{ message?: string }> };
      setError(errorObj.errors?.[0]?.message || 'Failed to sign up with social provider.');
    }
  };

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
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-emerald-700 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(13,242,105,0.3)]">
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
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
          <div className="space-y-2">
            <label className="text-sm font-medium ml-1 text-slate-700 dark:text-slate-300">
              Email Address
            </label>
            <div className="relative flex items-center group">
              <input
                className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-emerald-900/50 rounded-xl px-4 py-3.5 pr-12 text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-400 dark:placeholder:text-emerald-800/60 dark:text-white"
                placeholder="name@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
              <div className="absolute right-4 text-slate-400 dark:text-emerald-700 pointer-events-none flex items-center">
                <span className="material-symbols-outlined text-xl">mail</span>
              </div>
            </div>
          </div>

          {/* Username Field - Required for SSO logins */}
          <div className="space-y-2">
            <label className="text-sm font-medium ml-1 text-slate-700 dark:text-slate-300">
              Username <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center group">
              <input
                className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-emerald-900/50 rounded-xl px-4 py-3.5 pr-12 text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-400 dark:placeholder:text-emerald-800/60 dark:text-white"
                placeholder="Choose a username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
              />
              <div className="absolute right-4 text-slate-400 dark:text-emerald-700 pointer-events-none flex items-center">
                <span className="material-symbols-outlined text-xl">person</span>
              </div>
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium ml-1 text-slate-700 dark:text-slate-300">Password</label>
            <div className="relative flex items-center group">
              <input
                className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-emerald-900/50 rounded-xl px-4 py-3.5 pr-12 text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-400 dark:placeholder:text-emerald-800/60 dark:text-white"
                placeholder="Create a password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 text-slate-400 dark:text-emerald-700 hover:text-primary transition-colors flex items-center"
              >
                <span className="material-symbols-outlined text-xl">
                  {showPassword ? 'visibility' : 'visibility_off'}
                </span>
              </button>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium ml-1 text-slate-700 dark:text-slate-300">
              Confirm Password
            </label>
            <div className="relative flex items-center group">
              <input
                className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-emerald-900/50 rounded-xl px-4 py-3.5 pr-12 text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-400 dark:placeholder:text-emerald-800/60 dark:text-white"
                placeholder="Repeat password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 text-slate-400 dark:text-emerald-700 hover:text-primary transition-colors flex items-center"
              >
                <span className="material-symbols-outlined text-xl">
                  {showConfirmPassword ? 'visibility' : 'visibility_off'}
                </span>
              </button>
            </div>
          </div>

          {/* Email Verification Code Field - Show when email verification is needed */}
          {needsEmailVerification && (
            <div className="space-y-2">
              <label className="text-sm font-medium ml-1 text-slate-700 dark:text-slate-300">
                Verification Code <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center group">
                <input
                  className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-emerald-900/50 rounded-xl px-4 py-3.5 pr-12 text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-400 dark:placeholder:text-emerald-800/60 dark:text-white"
                  placeholder="Enter 6-digit code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  required={needsEmailVerification}
                  disabled={isLoading}
                />
                <div className="absolute right-4 text-slate-400 dark:text-emerald-700 pointer-events-none flex items-center">
                  <span className="material-symbols-outlined text-xl">verified</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                We sent a verification code to {email || signUp?.emailAddress}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type={needsEmailVerification ? "button" : "submit"}
            onClick={needsEmailVerification ? handleVerifyEmail : undefined}
            disabled={isLoading}
            className="mt-4 w-full bg-primary hover:bg-green-400 text-background-dark font-bold text-lg py-4 rounded-xl shadow-[0_4px_20px_rgba(13,242,105,0.25)] hover:shadow-[0_4px_25px_rgba(13,242,105,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading 
              ? (needsEmailVerification ? 'Verifying...' : 'Creating Account...') 
              : (needsEmailVerification ? 'Verify Email' : 'Create Account')}
            <span className="material-symbols-outlined text-xl leading-none">
              {needsEmailVerification ? 'verified' : 'arrow_forward'}
            </span>
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-emerald-900/50"></div>
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
            onClick={() => handleSocialLogin('oauth_google')}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 bg-white dark:bg-surface-dark border border-slate-200 dark:border-emerald-900/50 hover:border-primary/50 dark:hover:border-primary/50 rounded-xl py-3 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
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
            onClick={() => handleSocialLogin('oauth_apple')}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 bg-white dark:bg-surface-dark border border-slate-200 dark:border-emerald-900/50 hover:border-primary/50 dark:hover:border-primary/50 rounded-xl py-3 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="absolute bottom-[-10%] left-[-10%] w-[200px] h-[200px] bg-emerald-800 rounded-full blur-[100px]"></div>
        </div>
      </main>
    </div>
  );
}


