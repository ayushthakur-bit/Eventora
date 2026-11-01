import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeEmail,
  normalizePhone,
  deriveCanonicalUserId,
  DEMO_USER_ID,
  DEMO_USER_EMAIL,
  loadUserWorkspace,
  saveUserWorkspace,
  upsertRegisteredAccount,
  findRegisteredAccount,
  StorageLike,
} from './user-workspace';
import { EventData } from '../types';

class MemoryStorage implements StorageLike {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

const sampleEventForUser = (id: string, userId: string, name: string): EventData => ({
  id,
  userId,
  name,
  eventType: 'Wedding',
  startDate: '2026-12-10',
  city: 'Mumbai',
  venuePreference: 'Taj Mahal Palace',
  venueType: 'Indoor',
  guestCount: 150,
  totalBudget: 1200000,
  currency: 'INR',
  budgetFlexibility: 'Moderate',
  spendingPriorities: ['Venue'],
  costSavingCategories: [],
  theme: 'Elegant',
  preferredColors: ['Gold'],
  foodPreferences: ['Indian'],
  entertainmentPreferences: ['DJ'],
  status: 'Planning',
  createdAt: '2026-10-31T00:00:00.000Z',
  updatedAt: '2026-10-31T00:00:00.000Z',
});

test('deriveCanonicalUserId produces identical ID for same email regardless of case or spaces', () => {
  const id1 = deriveCanonicalUserId({ email: 'Priya.Sharma@Example.com' });
  const id2 = deriveCanonicalUserId({ email: '  priya.sharma@example.com  ' });
  assert.equal(id1, id2);
  assert.equal(id1, 'usr_email_priya.sharma@example.com');
});

test('deriveCanonicalUserId maps default demo email to DEMO_USER_ID', () => {
  assert.equal(
    deriveCanonicalUserId({ email: DEMO_USER_EMAIL.toUpperCase() }),
    DEMO_USER_ID
  );
});

test('deriveCanonicalUserId normalizes phone numbers across formatting variations', () => {
  const p1 = deriveCanonicalUserId({ phoneNumber: '+91 98765 43210' });
  const p2 = deriveCanonicalUserId({ phoneNumber: '+91-9876543210' });
  const p3 = deriveCanonicalUserId({ phoneNumber: '9876543210' });
  assert.equal(p1, p2);
  assert.equal(p2, p3);
  assert.equal(p1, 'usr_phone_9876543210');
});

test('normalizeEmail and normalizePhone clean inputs properly', () => {
  assert.equal(normalizeEmail('  Hello@World.COM '), 'hello@world.com');
  assert.equal(normalizePhone('+91 (987) 654-3210'), '9876543210');
});

test('user workspace isolates events per userId and restores saved events on re-login', () => {
  const storage = new MemoryStorage();

  const userA = deriveCanonicalUserId({ phoneNumber: '+91 9876543210' });
  const userB = deriveCanonicalUserId({ email: 'rahul.verma@example.com' });

  // User A logs in for the first time -> empty workspace
  const initialWorkspaceA = loadUserWorkspace(storage, userA);
  assert.equal(initialWorkspaceA.events.length, 0);
  assert.equal(initialWorkspaceA.activeEventId, null);

  // User A creates an event and task
  const eventA = sampleEventForUser('evt_a1', userA, 'Priya Sangeet Night');
  saveUserWorkspace(storage, userA, {
    events: [eventA],
    activeEventId: eventA.id,
    tasks: [
      {
        id: 'tsk_a1',
        eventId: eventA.id,
        title: 'Book Sangeet Choreographer',
        dueDate: '2026-11-15',
        priority: 'High',
        status: 'Not Started',
        category: 'Entertainment',
      },
    ],
    expenses: [],
    vendors: [],
    guests: [],
    invitations: {},
  });

  // User B logs in with a different email -> all previous events are erased (empty workspace)
  const workspaceB = loadUserWorkspace(storage, userB);
  assert.equal(workspaceB.events.length, 0);
  assert.equal(workspaceB.tasks.length, 0);
  assert.equal(workspaceB.activeEventId, null);

  // User B creates their own event
  const eventB = sampleEventForUser('evt_b1', userB, 'Rahul Corporate Gala');
  saveUserWorkspace(storage, userB, {
    events: [eventB],
    activeEventId: eventB.id,
    tasks: [],
    expenses: [],
    vendors: [],
    guests: [],
    invitations: {},
  });

  // User A logs back in with the same phone number -> User A's events & tasks are all visible!
  const reloginUserA = deriveCanonicalUserId({ phoneNumber: '9876543210' });
  const restoredA = loadUserWorkspace(storage, reloginUserA);
  assert.equal(restoredA.events.length, 1);
  assert.equal(restoredA.events[0].name, 'Priya Sangeet Night');
  assert.equal(restoredA.tasks.length, 1);
  assert.equal(restoredA.tasks[0].title, 'Book Sangeet Choreographer');
  assert.equal(restoredA.activeEventId, 'evt_a1');

  // And User B's event is still preserved under User B
  const restoredB = loadUserWorkspace(storage, userB);
  assert.equal(restoredB.events.length, 1);
  assert.equal(restoredB.events[0].name, 'Rahul Corporate Gala');
});

test('upsertRegisteredAccount and findRegisteredAccount persist user profile across logins', () => {
  const storage = new MemoryStorage();

  upsertRegisteredAccount(storage, {
    id: '',
    name: 'Ananya Mehta',
    email: 'ananya@example.com',
    phoneNumber: '+91 9123456789',
    authProvider: 'phone',
    preferences: { defaultCurrency: 'USD', theme: 'dark' },
  });

  // Lookup by phone number with different formatting
  const foundByPhone = findRegisteredAccount(storage, { phoneNumber: '9123456789' });
  assert.ok(foundByPhone);
  assert.equal(foundByPhone.name, 'Ananya Mehta');
  assert.equal(foundByPhone.preferences?.defaultCurrency, 'USD');
});
