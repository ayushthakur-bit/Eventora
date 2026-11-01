import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { validateEmail, evaluatePasswordStrength } from '../../utils/auth-validation';

interface EmailAuthFormProps {
  mode: 'login' | 'signup';
  onSuccess?: () => void;
  onError?: (err: string) => void;
  onSwitchMode: (newMode: 'login' | 'signup') => void;
}

export const EmailAuthForm: React.FC<EmailAuthFormProps> = ({
  mode,
  onSuccess,
  onError,
  onSwitchMode,
}) => {
  const { login, signup, resetPassword, isLoading } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Forgot password flow state
  const [isResetView, setIsResetView] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  // Email blur validation
  const [emailTouched, setEmailTouched] = useState(false);
  const emailValidation = validateEmail(email);

  // Live password strength calculation
  const strength = evaluatePasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'signup' && (!name || name.trim().length < 2)) {
      onError?.('Please provide your full name (at least 2 characters).');
      return;
    }

    if (!emailValidation.isValid) {
      onError?.(emailValidation.error || 'Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      onError?.('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'login') {
      const res = await login(email, password);
      if (res.success) {
        onSuccess?.();
      } else {
        onError?.(res.error || 'Invalid email or password.');
      }
    } else {
      const res = await signup(name, email, password);
      if (res.success) {
        onSuccess?.();
      } else {
        onError?.(res.error || 'Could not create account.');
      }
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(null);

    const check = validateEmail(email);
    if (!check.isValid) {
      setResetError(check.error || 'Please enter your registered email address.');
      return;
    }

    const res = await resetPassword(email);
    if (res.success) {
      setResetSuccess(`Password reset instructions sent to ${email}. Check your inbox!`);
    } else {
      setResetError(res.error || 'Failed to send password reset link.');
    }
  };

  const fillDemoCredentials = () => {
    setEmail('priya.events@eventora.ai');
    setPassword('Eventora@2026');
    if (mode === 'signup') {
      setName('Priya Sharma');
    }
  };

  if (isResetView) {
    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20 text-xs text-indigo-700 dark:text-indigo-300">
          Enter your registered email address and we'll send you a secure link to reset your account credentials.
        </div>

        {resetError && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{resetError}</span>
          </div>
        )}

        {resetSuccess && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-600 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{resetSuccess}</span>
          </div>
        )}

        <form onSubmit={handleResetSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="auth-reset-email"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                id="auth-reset-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? 'Sending Link...' : 'Send Recovery Link'}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsResetView(false);
              setResetSuccess(null);
              setResetError(null);
            }}
            className="w-full py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            ← Back to Sign In
          </button>
        </form>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Sign Up Name Field */}
      {mode === 'signup' && (
        <div className="space-y-1">
          <label
            htmlFor="auth-full-name"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Full Name
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              id="auth-full-name"
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>
      )}

      {/* Email Address Field */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label
            htmlFor="auth-email-input"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Email Address
          </label>
          <button
            type="button"
            onClick={fillDemoCredentials}
            className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3 h-3" /> Auto-fill Demo
          </button>
        </div>
        <div className="relative">
          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            id="auth-email-input"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setEmailTouched(true)}
            placeholder="name@example.com"
            aria-invalid={Boolean(emailTouched && !emailValidation.isValid && email.length > 0)}
            aria-describedby={emailTouched && !emailValidation.isValid && email.length > 0 ? 'auth-email-error' : undefined}
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
              emailTouched && !emailValidation.isValid && email.length > 0
                ? 'border-rose-400 focus:ring-rose-500'
                : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500'
            }`}
          />
        </div>
        {emailTouched && !emailValidation.isValid && email.length > 0 && (
          <p id="auth-email-error" role="alert" className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            {emailValidation.error}
          </p>
        )}
      </div>

      {/* Password Field */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label
            htmlFor="auth-password-input"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Password
          </label>
          {mode === 'login' && (
            <button
              type="button"
              onClick={() => setIsResetView(true)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
            >
              Forgot password?
            </button>
          )}
        </div>
        <div className="relative">
          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            id="auth-password-input"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono tracking-wider"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Password Strength Indicator for Sign Up */}
      {mode === 'signup' && password.length > 0 && (
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Password Strength:</span>
            <span
              className={`font-semibold ${
                strength.score >= 3
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : strength.score === 2
                  ? 'text-amber-500'
                  : 'text-rose-500'
              }`}
            >
              {strength.label}
            </span>
          </div>

          {/* 4-step progress bars */}
          <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-full rounded-full transition-all duration-300 ${
                  strength.score >= step ? strength.color : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>

          {/* Requirements Checklist */}
          <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1">
            <div
              className={`flex items-center gap-1.5 ${
                strength.requirements.minLength
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-400'
              }`}
            >
              <Check className="w-3 h-3" /> 8+ Characters
            </div>
            <div
              className={`flex items-center gap-1.5 ${
                strength.requirements.hasUppercase
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-400'
              }`}
            >
              <Check className="w-3 h-3" /> Uppercase (A-Z)
            </div>
            <div
              className={`flex items-center gap-1.5 ${
                strength.requirements.hasNumber
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-400'
              }`}
            >
              <Check className="w-3 h-3" /> Number (0-9)
            </div>
            <div
              className={`flex items-center gap-1.5 ${
                strength.requirements.hasSpecial
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-400'
              }`}
            >
              <Check className="w-3 h-3" /> Special Symbol (!@#)
            </div>
          </div>
        </div>
      )}

      {/* Remember me & Security badge */}
      <div className="flex items-center justify-between text-xs pt-1">
        <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 dark:text-slate-400">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>Remember this device</span>
        </label>
        <span className="text-[11px] text-slate-400 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" /> End-to-end encrypted
        </span>
      </div>

      {/* Action Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full relative group overflow-hidden py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-indigo-600/30 hover:shadow-lg hover:shadow-indigo-600/40 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Authenticating...
          </span>
        ) : (
          <>
            <span>{mode === 'login' ? 'Sign In with Email' : 'Create Free Account'}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </button>

      {/* Toggle mode helper prompt */}
      <div className="text-center pt-2 text-xs text-slate-500 dark:text-slate-400">
        {mode === 'login' ? (
          <p>
            Don't have an account yet?{' '}
            <button
              type="button"
              onClick={() => onSwitchMode('signup')}
              className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Sign up free
            </button>
          </p>
        ) : (
          <p>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => onSwitchMode('login')}
              className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Sign in here
            </button>
          </p>
        )}
      </div>
    </form>
  );
};
