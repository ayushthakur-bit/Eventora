import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  User,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  RefreshCw,
  Edit2,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  POPULAR_COUNTRY_CODES,
  CountryCode,
  validatePhoneNumber,
  validateOtpCode,
} from '../../utils/auth-validation';

interface PhoneAuthFormProps {
  mode: 'login' | 'signup';
  onSuccess?: () => void;
  onError?: (err: string) => void;
  onSwitchMode: (newMode: 'login' | 'signup') => void;
}

export const PhoneAuthForm: React.FC<PhoneAuthFormProps> = ({
  mode,
  onSuccess,
  onError,
  onSwitchMode,
}) => {
  const { sendPhoneOtp, verifyPhoneOtp, isLoading } = useAuth();

  // Step 1: 'phone', Step 2: 'otp'
  const [step, setStep] = useState<'phone' | 'otp'>('phone');

  // Input states
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(POPULAR_COUNTRY_CODES[0]); // +91 default
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [name, setName] = useState('');

  // 6-digit OTP input states
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer for OTP resend
  const [countdown, setCountdown] = useState(30);
  const [isResendActive, setIsResendActive] = useState(false);
  const [demoCodeHint, setDemoCodeHint] = useState<string>('123456');

  // Countdown timer tick
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'otp' && countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    } else if (countdown === 0) {
      setIsResendActive(true);
    }
    return () => clearTimeout(timer);
  }, [step, countdown]);

  const fullFormattedPhone = `${selectedCountry.dialCode} ${phoneNumber}`;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'signup' && (!name || name.trim().length < 2)) {
      onError?.('Please provide your full name (at least 2 characters).');
      return;
    }

    const val = validatePhoneNumber(`${selectedCountry.dialCode}${phoneNumber}`);
    if (!val.isValid) {
      onError?.(val.error || 'Please enter a valid phone number.');
      return;
    }

    const res = await sendPhoneOtp(`${selectedCountry.dialCode}${phoneNumber}`);
    if (res.success) {
      setDemoCodeHint(res.demoCode || '123456');
      setStep('otp');
      setCountdown(30);
      setIsResendActive(false);
      // Focus first OTP input on transition
      setTimeout(() => {
        digitInputRefs.current[0]?.focus();
      }, 150);
    } else {
      onError?.(res.error || 'Failed to send OTP code.');
    }
  };

  const handleResendOtp = async () => {
    if (!isResendActive) return;
    const res = await sendPhoneOtp(`${selectedCountry.dialCode}${phoneNumber}`);
    if (res.success) {
      setCountdown(30);
      setIsResendActive(false);
      setOtpDigits(['', '', '', '', '', '']);
      digitInputRefs.current[0]?.focus();
    } else {
      onError?.(res.error || 'Failed to resend code.');
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    // Only accept numeric digit
    const cleaned = value.replace(/[^0-9]/g, '');
    const newDigits = [...otpDigits];

    if (cleaned.length > 1) {
      // User pasted multiple characters
      const chars = cleaned.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newDigits[i] = chars[i] || '';
      }
      setOtpDigits(newDigits);
      const nextIndex = Math.min(chars.length, 5);
      digitInputRefs.current[nextIndex]?.focus();
      return;
    }

    newDigits[index] = cleaned;
    setOtpDigits(newDigits);

    // Auto focus next box if digit entered
    if (cleaned && index < 5) {
      digitInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        // Move to previous box on backspace if current is empty
        digitInputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredCode = otpDigits.join('');

    const val = validateOtpCode(enteredCode);
    if (!val.isValid) {
      onError?.(val.error || 'Please enter all 6 digits of the verification code.');
      return;
    }

    const res = await verifyPhoneOtp(
      `${selectedCountry.dialCode}${phoneNumber}`,
      enteredCode,
      mode,
      mode === 'signup' ? name : undefined
    );

    if (res.success) {
      onSuccess?.();
    } else {
      onError?.(res.error || 'Invalid OTP code. Please try again.');
    }
  };

  const autoFillDemoPhone = () => {
    setSelectedCountry(POPULAR_COUNTRY_CODES[0]);
    setPhoneNumber('9876543210');
    if (mode === 'signup') {
      setName('Priya Sharma');
    }
  };

  const autoFillOtp = () => {
    const code = demoCodeHint.split('');
    setOtpDigits(code);
  };

  return (
    <div>
      {step === 'phone' ? (
        <form onSubmit={handleSendOtp} className="space-y-4 animate-in fade-in duration-200">
          {/* Sign Up Name Field */}
          {mode === 'signup' && (
            <div className="space-y-1">
              <label
                htmlFor="phone-auth-name"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="phone-auth-name"
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

          {/* Phone Number Field with Country Selector */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="phone-auth-number"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Phone Number
              </label>
              <button
                type="button"
                onClick={autoFillDemoPhone}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" /> Auto-fill Demo
              </button>
            </div>

            <div className="flex gap-2">
              {/* Country Code Picker Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                  className="h-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                  aria-label="Select country code"
                  aria-expanded={isCountryDropdownOpen}
                >
                  <span className="text-base">{selectedCountry.flag}</span>
                  <span className="text-xs font-semibold">{selectedCountry.dialCode}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {isCountryDropdownOpen && (
                  <div
                    className="absolute left-0 mt-2 w-64 max-h-60 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-1"
                    onMouseLeave={() => setIsCountryDropdownOpen(false)}
                  >
                    <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Popular Country Codes
                    </div>
                    {POPULAR_COUNTRY_CODES.map((c) => (
                      <button
                        key={`${c.code}-${c.dialCode}`}
                        type="button"
                        onClick={() => {
                          setSelectedCountry(c);
                          setIsCountryDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors ${
                          c.code === selectedCountry.code
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                            : 'text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{c.flag}</span>
                          <span>{c.country}</span>
                        </div>
                        <span className="text-slate-400 font-mono text-[11px]">{c.dialCode}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Number Input */}
              <div className="relative flex-1">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="phone-auth-number"
                  type="tel"
                  required
                  autoComplete="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder={selectedCountry.format}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
              We'll send a 6-digit one-time passcode (OTP) via SMS to verify your device.
            </p>
          </div>

          {/* Submit Button to Request OTP */}
          <button
            type="submit"
            disabled={isLoading || phoneNumber.length < 6}
            className="w-full relative group overflow-hidden py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-indigo-600/30 hover:shadow-lg hover:shadow-indigo-600/40 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Dispatching SMS Code...
              </span>
            ) : (
              <>
                <span>{mode === 'login' ? 'Send Login OTP' : 'Send Sign Up OTP'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          {/* Switch Mode Prompt */}
          <div className="text-center pt-2 text-xs text-slate-500 dark:text-slate-400">
            {mode === 'login' ? (
              <p>
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => onSwitchMode('signup')}
                  className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Sign up with Phone
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
                  Sign in with Phone
                </button>
              </p>
            )}
          </div>
        </form>
      ) : (
        /* Step 2: 6-Digit OTP Verification Screen */
        <form onSubmit={handleVerifyOtp} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
          {/* Header indicator */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  SMS Code Sent to
                </div>
                <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                  {fullFormattedPhone}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setOtpDigits(['', '', '', '', '', '']);
              }}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              <Edit2 className="w-3 h-3" /> Change
            </button>
          </div>

          {/* Demo OTP Helper Pill */}
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                Demo OTP Code: <strong className="font-mono text-emerald-800 dark:text-emerald-200">{demoCodeHint}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={autoFillOtp}
              className="text-[11px] font-bold underline cursor-pointer hover:opacity-80"
            >
              Fill Code
            </button>
          </div>

          {/* 6 Digit Inputs */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 text-center">
              Enter 6-Digit Verification Code
            </label>
            <div className="flex justify-center gap-2 sm:gap-3">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-digit-${idx + 1}`}
                  aria-label={`Digit ${idx + 1}`}
                  ref={(el) => {
                    digitInputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="w-11 h-13 sm:w-12 sm:h-14 text-center font-mono text-xl font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs transition-all"
                />
              ))}
            </div>
          </div>

          {/* Resend Timer */}
          <div className="text-center text-xs">
            {countdown > 0 ? (
              <span className="text-slate-400">
                Resend verification code in{' '}
                <strong className="font-mono text-slate-600 dark:text-slate-300">{countdown}s</strong>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Resend SMS Code
              </button>
            )}
          </div>

          {/* Verify & Enter Button */}
          <button
            type="submit"
            disabled={isLoading || otpDigits.some((d) => !d)}
            className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-indigo-600/30 hover:shadow-lg hover:shadow-indigo-600/40 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Verifying Passcode...
              </span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {mode === 'login' ? 'Verify & Sign In' : 'Verify & Create Account'}
                </span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
