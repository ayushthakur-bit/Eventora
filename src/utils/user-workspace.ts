import {
  EventData,
  EventTask,
  EventExpense,
  EventVendor,
  EventGuest,
  UserProfile,
} from '../types';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SavedInvitationState {
  cardTitle: string;
  templateStyle: string;
  emblem: string;
  tone: string;
  language: 'English' | 'Hindi' | 'Gujarati';
  invitationData: {
    headline: string;
    hosts: string;
    mainBody: string;
    itineraryHighlight: string;
    rsvpDetails: string;
    quote: string;
  };
  updatedAt: string;
}

export interface UserWorkspaceData {
  userId: string;
  events: EventData[];
  activeEventId: string | null;
  tasks: EventTask[];
  expenses: EventExpense[];
  vendors: EventVendor[];
  guests: EventGuest[];
  invitations: Record<string, SavedInvitationState>;
  updatedAt: string;
}

export const DEMO_USER_ID = 'usr_demo_898495';
export const DEMO_USER_EMAIL = 'priya.events@eventora.ai';
export const ACCOUNTS_REGISTRY_KEY = 'eventora_accounts_registry_v2';
export const WORKSPACE_KEY_PREFIX = 'eventease_workspace_v3_';

/**
 * Normalizes an email address for deterministic account lookup.
 */
export function normalizeEmail(email: string): string {
  return (email || '').trim().toLowerCase();
}

/**
 * Normalizes a phone number into a canonical digit string so that
 * "+91 98765 43210", "+91-9876543210", and "9876543210" resolve to the same ID.
 */
export function normalizePhone(phone: string): string {
  const digitsOnly = (phone || '').replace(/[^0-9]/g, '');
  if (!digitsOnly) return '';
  // If 12 digits starting with 91 (India default dial code), use the 10-digit subscriber number for canonical matching
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return digitsOnly.slice(2);
  }
  // If 11 digits starting with 0, strip leading 0
  if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    return digitsOnly.slice(1);
  }
  return digitsOnly;
}

/**
 * Derives a deterministic canonical user ID from an email address or phone number.
 * Ensuring the same email or phone number always maps to the exact same userId.
 */
export function deriveCanonicalUserId(identifier: {
  email?: string;
  phoneNumber?: string;
}): string {
  if (identifier.phoneNumber && identifier.phoneNumber.trim().length > 0) {
    const normPhone = normalizePhone(identifier.phoneNumber);
    if (normPhone) {
      return `usr_phone_${normPhone}`;
    }
  }

  if (identifier.email && identifier.email.trim().length > 0) {
    const normEmail = normalizeEmail(identifier.email);
    if (normEmail === DEMO_USER_EMAIL) {
      return DEMO_USER_ID;
    }
    if (normEmail.endsWith('@phone.eventease.ai')) {
      const localDigits = normalizePhone(normEmail.split('@')[0]);
      if (localDigits) {
        return `usr_phone_${localDigits}`;
      }
    }
    return `usr_email_${normEmail}`;
  }

  return DEMO_USER_ID;
}

/**
 * Returns the localStorage key for a given user's isolated workspace.
 */
export function getWorkspaceStorageKey(userId: string): string {
  const cleanId = (userId || DEMO_USER_ID).trim();
  return `${WORKSPACE_KEY_PREFIX}${cleanId}`;
}

/**
 * Loads all registered user profiles from storage.
 */
export function loadAccountsRegistry(
  storage: StorageLike
): Record<string, UserProfile> {
  try {
    const raw = storage.getItem(ACCOUNTS_REGISTRY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch {
    // ignore corrupted registry
  }
  return {};
}

/**
 * Saves or updates a user profile in the persistent account registry.
 */
export function upsertRegisteredAccount(
  storage: StorageLike,
  profile: UserProfile
): UserProfile {
  const canonicalId =
    profile.id && !/^usr_(p_|g_)?\d+$/.test(profile.id)
      ? profile.id
      : deriveCanonicalUserId({
          email: profile.email,
          phoneNumber: profile.phoneNumber,
        });

  const registry = loadAccountsRegistry(storage);
  const existing = registry[canonicalId];

  const merged: UserProfile = {
    ...existing,
    ...profile,
    id: canonicalId,
    name:
      profile.name && !profile.name.startsWith('Member (')
        ? profile.name
        : existing?.name || profile.name || 'Event Planner',
    email: profile.email || existing?.email || '',
    phoneNumber: profile.phoneNumber || existing?.phoneNumber,
    avatarUrl: profile.avatarUrl || existing?.avatarUrl,
    preferences: {
      defaultCurrency: 'INR',
      theme: 'light',
      ...(existing?.preferences || {}),
      ...(profile.preferences || {}),
    },
    lastLoginAt: profile.lastLoginAt || new Date().toISOString(),
  };

  registry[canonicalId] = merged;
  try {
    storage.setItem(ACCOUNTS_REGISTRY_KEY, JSON.stringify(registry));
  } catch {
    // ignore quota errors
  }
  return merged;
}

/**
 * Looks up a previously registered user profile by email or phone number.
 */
export function findRegisteredAccount(
  storage: StorageLike,
  identifier: { email?: string; phoneNumber?: string }
): UserProfile | null {
  const canonicalId = deriveCanonicalUserId(identifier);
  const registry = loadAccountsRegistry(storage);
  return registry[canonicalId] || null;
}

/**
 * Lists all saved accounts in the registry (sorted by most recent login).
 */
export function listRegisteredAccounts(storage: StorageLike): UserProfile[] {
  const registry = loadAccountsRegistry(storage);
  return Object.values(registry).sort((a, b) => {
    const tA = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
    const tB = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
    return tB - tA;
  });
}

/**
 * Creates a fresh empty workspace for a new user account.
 */
export function createEmptyWorkspace(userId: string): UserWorkspaceData {
  return {
    userId,
    events: [],
    activeEventId: null,
    tasks: [],
    expenses: [],
    vendors: [],
    guests: [],
    invitations: {},
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Loads a user's isolated workspace from storage.
 * - If the user already has a saved workspace under their ID, returns it.
 * - If the user is the default demo user and has no v3 workspace yet, seeds from defaultDemoSeed.
 * - If the user is any other account (new phone number or email), returns an empty workspace
 *   so all previous user events are cleared and they start with a fresh "Create New Event" state.
 */
export function loadUserWorkspace(
  storage: StorageLike,
  userId: string,
  defaultDemoSeed?: {
    events: EventData[];
    tasks: EventTask[];
    expenses: EventExpense[];
    vendors: EventVendor[];
    guests: EventGuest[];
  }
): UserWorkspaceData {
  const effectiveUserId = (userId || DEMO_USER_ID).trim();
  const key = getWorkspaceStorageKey(effectiveUserId);

  try {
    const savedRaw = storage.getItem(key);
    if (savedRaw) {
      const parsed = JSON.parse(savedRaw) as Partial<UserWorkspaceData>;
      const events = Array.isArray(parsed.events) ? parsed.events : [];
      const activeEventId =
        parsed.activeEventId && events.some((e) => e.id === parsed.activeEventId)
          ? parsed.activeEventId
          : events[0]?.id || null;

      return {
        userId: effectiveUserId,
        events,
        activeEventId,
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
        vendors: Array.isArray(parsed.vendors) ? parsed.vendors : [],
        guests: Array.isArray(parsed.guests) ? parsed.guests : [],
        invitations:
          parsed.invitations && typeof parsed.invitations === 'object'
            ? parsed.invitations
            : {},
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
    }
  } catch {
    // fallback below
  }

  // Only seed sample events for the built-in default demo account on first initialization
  if (effectiveUserId === DEMO_USER_ID && defaultDemoSeed) {
    const seeded: UserWorkspaceData = {
      userId: effectiveUserId,
      events: defaultDemoSeed.events.map((e) => ({ ...e, userId: effectiveUserId })),
      activeEventId: defaultDemoSeed.events[0]?.id || null,
      tasks: defaultDemoSeed.tasks,
      expenses: defaultDemoSeed.expenses,
      vendors: defaultDemoSeed.vendors,
      guests: defaultDemoSeed.guests,
      invitations: {},
      updatedAt: new Date().toISOString(),
    };
    saveUserWorkspace(storage, effectiveUserId, seeded);
    return seeded;
  }

  // Every other email or phone login starts with a clean empty workspace until they create events
  const empty = createEmptyWorkspace(effectiveUserId);
  saveUserWorkspace(storage, effectiveUserId, empty);
  return empty;
}

/**
 * Persists a user's workspace state under their isolated user ID key.
 */
export function saveUserWorkspace(
  storage: StorageLike,
  userId: string,
  data: Omit<UserWorkspaceData, 'userId' | 'updatedAt'> & { updatedAt?: string }
): void {
  if (!userId) return;
  const effectiveUserId = userId.trim();
  const key = getWorkspaceStorageKey(effectiveUserId);
  const payload: UserWorkspaceData = {
    userId: effectiveUserId,
    events: data.events,
    activeEventId: data.activeEventId,
    tasks: data.tasks,
    expenses: data.expenses,
    vendors: data.vendors,
    guests: data.guests,
    invitations: data.invitations || {},
    updatedAt: data.updatedAt || new Date().toISOString(),
  };

  try {
    storage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.warn('Failed to persist user workspace:', e);
  }
}
