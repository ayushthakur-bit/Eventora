import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { DEMO_USER } from '../data/seedData';
import { validateEmail, validatePhoneNumber, validateOtpCode } from '../utils/auth-validation';
import {
  deriveCanonicalUserId,
  findRegisteredAccount,
  upsertRegisteredAccount,
  listRegisteredAccounts,
  normalizeEmail,
} from '../utils/user-workspace';

interface OtpSession {
  phoneNumber: string;
  code: string;
  expiresAt: number;
}

interface AuthContextType {
  currentUser: UserProfile | null;
  savedAccounts: UserProfile[];
  isAuthenticated: boolean;
  isLoading: boolean;
  isFirebaseConfigured: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (customAccount?: { name?: string; email?: string; avatarUrl?: string }) => Promise<{ success: boolean; error?: string }>;
  sendPhoneOtp: (phoneNumber: string) => Promise<{ success: boolean; error?: string; demoCode?: string }>;
  verifyPhoneOtp: (
    phoneNumber: string,
    code: string,
    mode: 'login' | 'signup',
    name?: string
  ) => Promise<{ success: boolean; error?: string }>;
  switchAccount: (account: UserProfile) => void;
  logout: () => void;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'eventora_auth_user_v2';
const LEGACY_AUTO_USER_KEY = 'eventease_auth_user';
const LEGACY_AUTO_REGISTRY_KEY = 'eventease_accounts_registry_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      // Remove legacy keys that previously auto-signed in visitors on first load
      localStorage.removeItem(LEGACY_AUTO_USER_KEY);
      localStorage.removeItem(LEGACY_AUTO_REGISTRY_KEY);

      const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as UserProfile;
        if (parsed && (parsed.email || parsed.phoneNumber)) {
          const canonicalId = deriveCanonicalUserId({
            email: parsed.email,
            phoneNumber: parsed.phoneNumber,
          });
          const normalizedUser: UserProfile = {
            ...parsed,
            id: canonicalId,
          };
          return upsertRegisteredAccount(localStorage, normalizedUser);
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved user:', e);
    }
    // Visitors start unauthenticated and must sign in
    return null;
  });

  const [savedAccounts, setSavedAccounts] = useState<UserProfile[]>(() => {
    try {
      return listRegisteredAccounts(localStorage);
    } catch {
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isFirebaseConfigured] = useState<boolean>(false);
  const [otpSession, setOtpSession] = useState<OtpSession | null>(null);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    }
    try {
      setSavedAccounts(listRegisteredAccounts(localStorage));
    } catch {
      // ignore
    }
  }, [currentUser]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 400));

    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) {
      setIsLoading(false);
      return { success: false, error: emailCheck.error || 'Please enter a valid email address.' };
    }

    if (!password || password.length < 6) {
      setIsLoading(false);
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const cleanEmail = normalizeEmail(email);
    const canonicalId = deriveCanonicalUserId({ email: cleanEmail });
    const existing = findRegisteredAccount(localStorage, { email: cleanEmail });

    const fallbackName = cleanEmail
      .split('@')[0]
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const displayName = existing?.name || fallbackName || 'Event Planner';

    const user: UserProfile = upsertRegisteredAccount(localStorage, {
      id: canonicalId,
      name: displayName,
      email: cleanEmail,
      phoneNumber: existing?.phoneNumber,
      avatarUrl:
        existing?.avatarUrl ||
        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`,
      authProvider: 'email',
      lastLoginAt: new Date().toISOString(),
      preferences: existing?.preferences || { defaultCurrency: 'INR', theme: 'light' },
    });

    setCurrentUser(user);
    setIsLoading(false);
    return { success: true };
  };

  const signup = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 450));

    if (!name || name.trim().length < 2) {
      setIsLoading(false);
      return { success: false, error: 'Full name is required (minimum 2 characters).' };
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) {
      setIsLoading(false);
      return { success: false, error: emailCheck.error || 'Please enter a valid email address.' };
    }

    if (!password || password.length < 6) {
      setIsLoading(false);
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const trimmedName = name.trim();
    const cleanEmail = normalizeEmail(email);
    const canonicalId = deriveCanonicalUserId({ email: cleanEmail });
    const existing = findRegisteredAccount(localStorage, { email: cleanEmail });

    const user: UserProfile = upsertRegisteredAccount(localStorage, {
      id: canonicalId,
      name: trimmedName,
      email: cleanEmail,
      phoneNumber: existing?.phoneNumber,
      avatarUrl:
        existing?.avatarUrl ||
        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(trimmedName)}`,
      authProvider: 'email',
      lastLoginAt: new Date().toISOString(),
      preferences: existing?.preferences || { defaultCurrency: 'INR', theme: 'light' },
    });

    setCurrentUser(user);
    setIsLoading(false);
    return { success: true };
  };

  const loginWithGoogle = async (
    customAccount?: { name?: string; email?: string; avatarUrl?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 500));

    const accountEmail = normalizeEmail(customAccount?.email || DEMO_USER.email);
    const canonicalId = deriveCanonicalUserId({ email: accountEmail });
    const existing = findRegisteredAccount(localStorage, { email: accountEmail });

    const accountName = existing?.name || customAccount?.name || DEMO_USER.name;
    const avatar =
      existing?.avatarUrl ||
      customAccount?.avatarUrl ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(accountName)}`;

    const user: UserProfile = upsertRegisteredAccount(localStorage, {
      id: canonicalId,
      name: accountName,
      email: accountEmail,
      phoneNumber: existing?.phoneNumber,
      avatarUrl: avatar,
      authProvider: 'google',
      lastLoginAt: new Date().toISOString(),
      preferences: existing?.preferences || DEMO_USER.preferences,
    });

    setCurrentUser(user);
    setIsLoading(false);
    return { success: true };
  };

  const sendPhoneOtp = async (
    rawPhoneNumber: string
  ): Promise<{ success: boolean; error?: string; demoCode?: string }> => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 400));

    const validation = validatePhoneNumber(rawPhoneNumber);
    if (!validation.isValid) {
      setIsLoading(false);
      return { success: false, error: validation.error || 'Invalid phone number format.' };
    }

    const demoCode = '123456';
    const newSession: OtpSession = {
      phoneNumber: validation.sanitized,
      code: demoCode,
      expiresAt: Date.now() + 300000,
    };
    setOtpSession(newSession);

    setIsLoading(false);
    return { success: true, demoCode };
  };

  const verifyPhoneOtp = async (
    phoneNumber: string,
    code: string,
    mode: 'login' | 'signup',
    name?: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 400));

    const otpCheck = validateOtpCode(code);
    if (!otpCheck.isValid) {
      setIsLoading(false);
      return { success: false, error: otpCheck.error || 'Invalid 6-digit verification code.' };
    }

    const sessionMatch = otpSession && otpSession.phoneNumber === phoneNumber.replace(/[\s\-()]/g, '');
    const isAccepted = code === '123456' || (sessionMatch && otpSession?.code === code) || /^\d{6}$/.test(code);

    if (!isAccepted) {
      setIsLoading(false);
      return { success: false, error: 'Incorrect verification code. Please check your SMS or try 123456.' };
    }

    const cleanPhone = phoneNumber.trim();
    const canonicalId = deriveCanonicalUserId({ phoneNumber: cleanPhone });
    const existing = findRegisteredAccount(localStorage, { phoneNumber: cleanPhone });

    const displayName =
      name && name.trim().length > 1
        ? name.trim()
        : existing?.name || `Member (${cleanPhone.slice(-4)})`;

    const user: UserProfile = upsertRegisteredAccount(localStorage, {
      id: canonicalId,
      name: displayName,
      email: existing?.email || `${cleanPhone.replace(/[^0-9]/g, '')}@phone.eventease.ai`,
      phoneNumber: cleanPhone,
      avatarUrl:
        existing?.avatarUrl ||
        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`,
      authProvider: 'phone',
      lastLoginAt: new Date().toISOString(),
      preferences: existing?.preferences || { defaultCurrency: 'INR', theme: 'light' },
    });

    setCurrentUser(user);
    setOtpSession(null);
    setIsLoading(false);
    return { success: true };
  };

  const switchAccount = (account: UserProfile) => {
    const updated = upsertRegisteredAccount(localStorage, {
      ...account,
      lastLoginAt: new Date().toISOString(),
    });
    setCurrentUser(updated);
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const check = validateEmail(email);
    if (!check.isValid) {
      return { success: false, error: check.error || 'Please provide a valid email address.' };
    }
    await new Promise((r) => setTimeout(r, 400));
    return { success: true };
  };

  const updateUserProfile = (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated = upsertRegisteredAccount(localStorage, {
      ...currentUser,
      ...updates,
    });
    setCurrentUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        savedAccounts,
        isAuthenticated: Boolean(currentUser),
        isLoading,
        isFirebaseConfigured,
        login,
        signup,
        loginWithGoogle,
        sendPhoneOtp,
        verifyPhoneOtp,
        switchAccount,
        logout,
        resetPassword,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
