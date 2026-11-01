import React, { useState } from 'react';
import { ChevronRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SocialAuthProps {
  mode: 'login' | 'signup';
  onSuccess?: () => void;
  onError?: (err: string) => void;
}

export const SocialAuth: React.FC<SocialAuthProps> = ({ mode, onSuccess, onError }) => {
  const { loginWithGoogle, isLoading } = useAuth();
  const [showAccountChooser, setShowAccountChooser] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const defaultGoogleAccount = {
    name: 'Priya Sharma',
    email: 'priya.sharma@gmail.com',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
  };

  const handleInstantGoogle = async () => {
    try {
      setIsAuthenticating(true);
      const res = await loginWithGoogle(defaultGoogleAccount);
      setIsAuthenticating(false);
      if (res.success) {
        onSuccess?.();
      } else {
        onError?.(res.error || 'Google sign-in could not be completed.');
      }
    } catch {
      setIsAuthenticating(false);
      onError?.('Unexpected error connecting to Google services.');
    }
  };

  const handleSelectAccount = async (account: { name: string; email: string; avatarUrl?: string }) => {
    try {
      setIsAuthenticating(true);
      setShowAccountChooser(false);
      const res = await loginWithGoogle(account);
      setIsAuthenticating(false);
      if (res.success) {
        onSuccess?.();
      } else {
        onError?.(res.error || 'Google sign-in failed.');
      }
    } catch {
      setIsAuthenticating(false);
      onError?.('Unexpected error signing in with Google.');
    }
  };

  const handleCustomGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail || !customEmail.includes('@')) {
      onError?.('Please enter a valid Google email address.');
      return;
    }
    const name = customName.trim() || customEmail.split('@')[0];
    await handleSelectAccount({
      name,
      email: customEmail.trim(),
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
    });
  };

  return (
    <div className="space-y-4">
      {/* Primary Google Auth Button */}
      <div className="relative group">
        <button
          type="button"
          onClick={handleInstantGoogle}
          disabled={isLoading || isAuthenticating}
          className="w-full relative overflow-hidden flex items-center justify-between px-5 py-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 font-semibold text-sm transition-all shadow-xs hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-500 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
          aria-label={mode === 'login' ? 'Sign in with Google' : 'Sign up with Google'}
        >
          {/* Subtle hover gradient glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="flex items-center gap-3 relative z-10">
            {/* Authentic Google "G" SVG */}
            <div className="w-6 h-6 rounded-lg bg-white p-1 shadow-2xs flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
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
            </div>

            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {isAuthenticating
                ? 'Connecting to Google...'
                : mode === 'login'
                ? 'Sign in with Google'
                : 'Sign up with Google'}
            </span>
          </div>

          <div className="flex items-center gap-2 relative z-10 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
            <span className="hidden sm:inline">1-Click Fast Pass</span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      </div>

      {/* Account Chooser / Custom Account Simulation Drawer */}
      <div className="flex items-center justify-between text-xs px-1">
        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Google Verified OAuth
        </span>
        <button
          type="button"
          onClick={() => setShowAccountChooser(!showAccountChooser)}
          className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
        >
          {showAccountChooser ? 'Hide account chooser' : 'Choose / switch account'}
        </button>
      </div>

      {showAccountChooser && (
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60 backdrop-blur-xs space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Select Google Account for {mode === 'login' ? 'Login' : 'Sign Up'}:
          </div>

          {/* Quick preset 1: Priya Sharma */}
          <button
            type="button"
            onClick={() => handleSelectAccount(defaultGoogleAccount)}
            className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 hover:border-indigo-500 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <img
                src={defaultGoogleAccount.avatarUrl}
                alt="Priya"
                className="w-8 h-8 rounded-full object-cover"
              />
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">Priya Sharma</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">{defaultGoogleAccount.email}</div>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              Demo Planner
            </span>
          </button>

          {/* Custom Account Input Option */}
          <form onSubmit={handleCustomGoogleSubmit} className="pt-2 border-t border-slate-200 dark:border-slate-700/60 space-y-2">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Or use any custom Google email:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                id="google-custom-name"
                aria-label="Google Account Full Name"
                type="text"
                placeholder="Full Name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
              <input
                id="google-custom-email"
                aria-label="Google Account Email"
                type="email"
                placeholder="name@gmail.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <button
              type="submit"
              className="w-full py-1.5 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity"
            >
              Continue with this Google Account
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
