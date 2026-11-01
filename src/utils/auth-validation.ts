/**
 * Authentication and input validation utilities
 */

export interface PasswordStrength {
  score: number; // 0 - 4
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  color: string;
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

export function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email address is required.' };
  }
  const trimmed = email.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Email address cannot be empty.' };
  }
  // Standard RFC-compliant email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid email address (e.g., name@example.com).' };
  }
  return { isValid: true };
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const pwd = password || '';
  const requirements = {
    minLength: pwd.length >= 8,
    hasUppercase: /[A-Z]/.test(pwd),
    hasLowercase: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSpecial: /[^A-Za-z0-9]/.test(pwd),
  };

  const metCount = Object.values(requirements).filter(Boolean).length;

  let score = 0;
  let label: PasswordStrength['label'] = 'Very Weak';
  let color = 'bg-rose-500';

  if (pwd.length === 0) {
    return { score: 0, label: 'Very Weak', color: 'bg-slate-300', requirements };
  }

  if (metCount <= 2) {
    score = 1;
    label = 'Weak';
    color = 'bg-rose-500';
  } else if (metCount === 3) {
    score = 2;
    label = 'Fair';
    color = 'bg-amber-500';
  } else if (metCount === 4) {
    score = 3;
    label = 'Strong';
    color = 'bg-emerald-500';
  } else if (metCount === 5) {
    score = 4;
    label = 'Very Strong';
    color = 'bg-indigo-600';
  }

  return { score, label, color, requirements };
}

export function validatePhoneNumber(rawPhone: string): {
  isValid: boolean;
  sanitized: string;
  error?: string;
} {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { isValid: false, sanitized: '', error: 'Phone number is required.' };
  }
  // Strip out spaces, dashes, parentheses
  const sanitized = rawPhone.replace(/[\s\-()]/g, '');
  // Must contain only digits, optionally prefixed by '+'
  const phoneRegex = /^\+?[0-9]{8,15}$/;
  if (!phoneRegex.test(sanitized)) {
    return {
      isValid: false,
      sanitized,
      error: 'Please enter a valid phone number (8 to 15 digits).',
    };
  }
  return { isValid: true, sanitized };
}

export function validateOtpCode(code: string): { isValid: boolean; error?: string } {
  if (!code || typeof code !== 'string') {
    return { isValid: false, error: 'OTP code is required.' };
  }
  const trimmed = code.trim();
  if (!/^\d{6}$/.test(trimmed)) {
    return { isValid: false, error: 'Verification code must be exactly 6 digits.' };
  }
  return { isValid: true };
}

export interface CountryCode {
  code: string;
  country: string;
  flag: string;
  dialCode: string;
  format: string;
}

export const POPULAR_COUNTRY_CODES: CountryCode[] = [
  { code: 'IN', country: 'India', flag: '🇮🇳', dialCode: '+91', format: '98765 43210' },
  { code: 'US', country: 'United States', flag: '🇺🇸', dialCode: '+1', format: '(555) 012-3456' },
  { code: 'GB', country: 'United Kingdom', flag: '🇬🇧', dialCode: '+44', format: '7911 123456' },
  { code: 'AE', country: 'UAE', flag: '🇦🇪', dialCode: '+971', format: '50 123 4567' },
  { code: 'CA', country: 'Canada', flag: '🇨🇦', dialCode: '+1', format: '(555) 012-3456' },
  { code: 'AU', country: 'Australia', flag: '🇦🇺', dialCode: '+61', format: '412 345 678' },
  { code: 'SG', country: 'Singapore', flag: '🇸🇬', dialCode: '+65', format: '8123 4567' },
  { code: 'DE', country: 'Germany', flag: '🇩🇪', dialCode: '+49', format: '151 23456789' },
  { code: 'FR', country: 'France', flag: '🇫🇷', dialCode: '+33', format: '6 12 34 56 78' },
  { code: 'JP', country: 'Japan', flag: '🇯🇵', dialCode: '+81', format: '90 1234 5678' },
];
