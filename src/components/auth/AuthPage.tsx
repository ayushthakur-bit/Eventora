import React, { useState } from 'react';
import {
  Sparkles,
  ArrowLeft,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  ArrowRight,
  Zap,
  TrendingUp,
  Layers,
  HeartHandshake,
  Lock,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { BackgroundAnimation } from './BackgroundAnimation';
import { SocialAuth } from './SocialAuth';
import { EmailAuthForm } from './EmailAuthForm';
import { PhoneAuthForm } from './PhoneAuthForm';

interface AuthPageProps {
  initialMode?: 'login' | 'signup';
  initialMethod?: 'google' | 'email' | 'phone';
  onNavigateHome: () => void;
  onNavigateDashboard: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'login',
  initialMethod = 'email',
  onNavigateHome,
  onNavigateDashboard,
  darkMode,
  setDarkMode,
}) => {
  const { currentUser, savedAccounts, isAuthenticated, switchAccount, logout } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [method, setMethod] = useState<'google' | 'email' | 'phone'>(initialMethod);
  const [error, setError] = useState<string | null>(null);
  const [justAuthenticated, setJustAuthenticated] = useState<boolean>(false);

  const handleAuthSuccess = () => {
    setError(null);
    setJustAuthenticated(true);

    // Fire celebratory confetti bursts
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#a855f7', '#ec4899', '#3b82f6'],
      });
    } catch {
      // safe fallback if confetti fails in test environment
    }

    // Navigate directly to user's workspace dashboard
    onNavigateDashboard();
  };

  const getProviderIcon = (provider?: string) => {
    if (provider === 'google') {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-800">
          Google Account
        </span>
      );
    }
    if (provider === 'phone') {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800">
          Phone Verified (SMS OTP)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-200 dark:border-indigo-800">
        Email & Password
      </span>
    );
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-between overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Dynamic Animated Ambient Background */}
      <BackgroundAnimation />

      {/* Top Bar inside Auth Page */}
      <div className="relative z-20 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2 flex items-center justify-between">
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white px-3 py-1.5 rounded-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 transition-all cursor-pointer shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Homepage</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60 shadow-2xs">
            ✨ Per-Account Isolated Workspace
          </span>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex-1 flex items-center justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 w-full max-w-5xl items-center">
          
          {/* Left Column: Visual Storytelling & Features (Desktop) */}
          <div className="hidden lg:flex lg:col-span-6 flex-col justify-center space-y-6 pr-4">
            {/* Tagline Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-semibold backdrop-blur-xs w-fit">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
              <span>Next-Generation AI Event Operating System</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
                Plan Extraordinary Events{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-400">
                  Without The Stress.
                </span>
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-md">
                Every email address and phone number gets its own dedicated, private event workspace. Everything you build is automatically saved to your ID and restored whenever you sign back in.
              </p>
            </div>

            {/* Interactive Feature Highlights */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md shadow-2xs hover:border-indigo-400 transition-all">
                <div className="p-2.5 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Dedicated Per-Account Event Storage
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Sign in with the same email or phone number anytime to see all your saved events, or sign in with a new ID to start fresh.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md shadow-2xs hover:border-indigo-400 transition-all">
                <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    AI What-If Budget Simulator
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Test budget cuts, guest surges, and monsoon contingencies in seconds with real-time recalculations.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md shadow-2xs hover:border-indigo-400 transition-all">
                <div className="p-2.5 rounded-xl bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 shrink-0">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Zero Surprise Vendor Costs
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Track advance deposits, milestone payments, and contract compliance with bank-grade security.
                  </p>
                </div>
              </div>
            </div>

            {/* Micro Social Proof */}
            <div className="flex items-center gap-3 pt-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex -space-x-2">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80"
                  alt="Planner"
                  className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-900 object-cover"
                />
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80"
                  alt="Planner"
                  className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-900 object-cover"
                />
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80"
                  alt="Planner"
                  className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-900 object-cover"
                />
              </div>
              <span>
                Trusted by <strong className="font-semibold text-slate-800 dark:text-slate-200">12,000+</strong> event hosts and wedding planners
              </span>
            </div>
          </div>

          {/* Right Column: Authentication Card */}
          <div className="col-span-1 lg:col-span-6 flex justify-center w-full">
            <div className="w-full max-w-md rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xl p-5 sm:p-8 relative">
              
              {/* Compact Active Session Banner if already signed in */}
              {isAuthenticated && currentUser && !justAuthenticated && (
                <div className="mb-5 p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/70 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'}
                        alt={currentUser.name}
                        className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-500/30 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          Active: {currentUser.name}
                        </div>
                        <div className="text-[11px] text-indigo-600 dark:text-indigo-300 font-mono truncate">
                          {currentUser.phoneNumber || currentUser.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={onNavigateDashboard}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                      >
                        Dashboard
                      </button>
                      <button
                        type="button"
                        onClick={() => logout()}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Sign in below with another email or phone number to switch to that ID's workspace:
                  </p>
                </div>
              )}

              {/* Saved Accounts Quick Switcher (if multiple accounts exist on this browser) */}
              {savedAccounts.length > 1 && !justAuthenticated && (
                <div className="mb-5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Saved Accounts on This Device
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {savedAccounts.map((acc) => {
                      const isCurrent = acc.id === currentUser?.id;
                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => {
                            switchAccount(acc);
                            onNavigateDashboard();
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-indigo-600 text-white font-semibold'
                              : 'bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-slate-700'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <span className="font-bold">{acc.name}</span>{' '}
                            <span className={`font-mono text-[11px] ${isCurrent ? 'text-indigo-100' : 'text-slate-400'}`}>
                              ({acc.phoneNumber || acc.email})
                            </span>
                          </div>
                          <span className="text-[10px] font-bold shrink-0">
                            {isCurrent ? 'Active' : 'Switch →'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Always show the Sign In / Create Account form */}
              {(
                <div className="space-y-6">
                  {/* Card Header & Brand Icon */}
                  <div className="text-center space-y-1.5">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/25 mb-1">
                      <Sparkles className="w-6 h-6 animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                      {mode === 'login' ? 'Sign In to Your Account' : 'Create Free Account'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {mode === 'login'
                        ? 'Enter your email or phone number to load all saved events for that ID'
                        : 'Sign up with a new email or phone number for a clean event workspace'}
                    </p>
                  </div>

                  {/* Mode Slider Toggle: Sign In vs Sign Up */}
                  <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setError(null);
                      }}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        mode === 'login'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup');
                        setError(null);
                      }}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        mode === 'signup'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Create Account
                    </button>
                  </div>

                  {/* Error Notification Alert */}
                  {error && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-between text-xs text-rose-600 dark:text-rose-300 animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                      </div>
                      <button
                        onClick={() => setError(null)}
                        className="text-rose-400 hover:text-rose-600 font-bold ml-2"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  {/* Method Navigation Tabs: Google | Email | Phone */}
                  <div className="flex items-center border-b border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setMethod('google');
                        setError(null);
                      }}
                      className={`flex-1 pb-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                        method === 'google'
                          ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                          : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {/* Mini Google G */}
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Google</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMethod('email');
                        setError(null);
                      }}
                      className={`flex-1 pb-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                        method === 'email'
                          ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                          : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMethod('phone');
                        setError(null);
                      }}
                      className={`flex-1 pb-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                        method === 'phone'
                          ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                          : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Phone OTP</span>
                    </button>
                  </div>

                  {/* Active Form Component */}
                  <div className="pt-1">
                    {method === 'google' && (
                      <SocialAuth
                        mode={mode}
                        onSuccess={handleAuthSuccess}
                        onError={(err) => setError(err)}
                      />
                    )}

                    {method === 'email' && (
                      <EmailAuthForm
                        mode={mode}
                        onSuccess={handleAuthSuccess}
                        onError={(err) => setError(err)}
                        onSwitchMode={(newMode) => setMode(newMode)}
                      />
                    )}

                    {method === 'phone' && (
                      <PhoneAuthForm
                        mode={mode}
                        onSuccess={handleAuthSuccess}
                        onError={(err) => setError(err)}
                        onSwitchMode={(newMode) => setMode(newMode)}
                      />
                    )}
                  </div>

                  {/* Security footer disclaimer */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 text-center">
                    <p className="text-[11px] text-slate-400">
                      Protected by 256-bit SSL encryption. By signing in, you agree to our{' '}
                      <span className="text-slate-600 dark:text-slate-300 underline cursor-pointer">Terms</span> and{' '}
                      <span className="text-slate-600 dark:text-slate-300 underline cursor-pointer">Privacy Policy</span>.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Subtle Footer */}
      <div className="relative z-10 py-4 text-center text-xs text-slate-400 border-t border-slate-200/50 dark:border-slate-800/50">
        © 2026 Eventora — Modern Event Management & Budget Optimization
      </div>
    </div>
  );
};
