import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateDatabaseBackup,
  auditEventData,
  filterEvents,
  exportEventsToCsv,
  sanitizeCsvCell,
  safeJsonParse,
  computeGuestMetrics,
  computeVendorFinancialSummary,
} from './data-management';
import { EventData, EventExpense, EventGuest, EventVendor } from '../types';

const mockEvent: EventData = {
  id: 'evt_test_1',
  userId: 'usr_1',
  name: 'Royal Lake Wedding',
  eventType: 'Wedding',
  startDate: '2026-11-20',
  city: 'Udaipur',
  venuePreference: 'Taj Lake Palace',
  venueType: 'Mixed',
  guestCount: 200,
  totalBudget: 1500000,
  currency: 'INR',
  budgetFlexibility: 'Moderate',
  spendingPriorities: ['Venue', 'Catering'],
  costSavingCategories: [],
  theme: 'Luxury',
  preferredColors: ['Gold', 'Maroon'],
  foodPreferences: ['North Indian', 'Rajasthani'],
  entertainmentPreferences: ['Folk Dancers'],
  status: 'Planning',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  plan: {
    overview: {
      summary: 'Grand royal wedding',
      recommendedTheme: 'Royal',
      suggestedFormat: '2-Day Celebration',
      recommendations: [],
      assumptionsAndMissing: [],
    },
    budgetBreakdown: [
      { category: 'Venue', amount: 800000, percentage: 53.3, reason: 'Palace booking' },
      { category: 'Catering', amount: 700000, percentage: 46.7, reason: 'Royal feast' },
    ],
    timeline: {
      preEventTasks: [],
      eventDaySchedule: [
        { time: '16:00', activity: 'Baraat Arrival', notes: 'Royal procession' },
      ],
      finalDayChecklist: [],
    },
    vendorChecklist: [],
    personalizedIdeas: {
      decorationSuggestions: [],
      themeAndPalette: [],
      foodAndMenuIdeas: [],
      activitiesAndEntertainment: [],
      invitationIdeas: [],
      guestExperienceImprovements: [],
      budgetFriendlyAlternatives: [],
    },
    risksAndRecommendations: {
      commonPlanningProblems: [],
      weatherContingency: 'Indoor backup halls reserved',
      backupVendorsOrVenues: 'Backup catering vendors on standby',
      guestCountChangesAdvice: 'Buffer of 20 plates',
      paymentDeadlinesCaution: 'All final settlement by checkout',
      accessibilityAndSafety: 'Golf carts for elderly guests',
    },
  },
};

test('validateDatabaseBackup validates compliant backup structure', () => {
  const valid = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    source: 'EventEase AI',
    events: [mockEvent],
  };
  const result = validateDatabaseBackup(valid);
  assert.equal(result.isValid, true);
});

test('validateDatabaseBackup detects malformed backups', () => {
  assert.equal(validateDatabaseBackup(null).isValid, false);
  assert.equal(validateDatabaseBackup({}).isValid, false);
  assert.equal(validateDatabaseBackup({ events: 'not-an-array' }).isValid, false);
  assert.equal(validateDatabaseBackup({ events: [{ id: 123 }] }).isValid, false);
});

test('auditEventData flags missing venue and overspending', () => {
  const eventWithoutVenue: EventData = {
    ...mockEvent,
    id: 'evt_no_venue',
    venuePreference: '',
  };

  const highExpenses: EventExpense[] = [
    {
      id: 'exp_1',
      eventId: 'evt_no_venue',
      category: 'Venue',
      amount: 1600000, // exceeds 1,500,000 budget
      date: '2026-10-15',
      vendorName: 'Palace',
      paymentStatus: 'Paid',
    },
  ];

  const issues = auditEventData([eventWithoutVenue], highExpenses, []);
  assert.ok(issues.some((i) => i.type === 'missing_venue'));
  assert.ok(issues.some((i) => i.type === 'negative_variance'));
});

test('filterEvents correctly filters by search query and type', () => {
  const events = [
    mockEvent,
    { ...mockEvent, id: 'evt_2', name: 'Annual Tech Summit', eventType: 'Corporate Event' as const, city: 'Bengaluru' },
  ];

  // Search by query
  const searchResult = filterEvents(events, 'tech', 'All', 'All');
  assert.equal(searchResult.length, 1);
  assert.equal(searchResult[0].id, 'evt_2');

  // Filter by event type
  const typeResult = filterEvents(events, '', 'Wedding', 'All');
  assert.equal(typeResult.length, 1);
  assert.equal(typeResult[0].id, 'evt_test_1');
});

test('exportEventsToCsv creates valid CSV header and rows', () => {
  const csv = exportEventsToCsv([mockEvent]);
  assert.ok(csv.includes('Event ID,Event Name,Type'));
  assert.ok(csv.includes('Royal Lake Wedding'));
  assert.ok(csv.includes('1500000'));
});

test('sanitizeCsvCell neutralizes spreadsheet formula injection payloads', () => {
  assert.equal(sanitizeCsvCell('=cmd|" /C calc"!A0'), '"\'=cmd|"" /C calc""!A0"');
  assert.equal(sanitizeCsvCell('+SUM(A1:A10)'), '"\'+SUM(A1:A10)"');
  assert.equal(sanitizeCsvCell('@IMPORTXML()'), '"\'@IMPORTXML()"');
  assert.equal(sanitizeCsvCell(25000), '25000');
});

test('safeJsonParse parses valid JSON and strips prototype pollution keys', () => {
  const malicious = '{"name":"Safe Event","__proto__":{"polluted":true}}';
  const result = safeJsonParse<Record<string, unknown>>(malicious);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.name, 'Safe Event');
    assert.equal(({} as Record<string, unknown>).polluted, undefined);
  }
  assert.equal(safeJsonParse('{invalid').ok, false);
});

test('computeGuestMetrics aggregates headcount by RSVP status and dietary needs', () => {
  const guests: EventGuest[] = [
    { id: 'g1', eventId: 'e1', name: 'Aarav', rsvpStatus: 'Attending', group: 'Family', attendanceCount: 3, dietaryRequirements: 'Jain' },
    { id: 'g2', eventId: 'e1', name: 'Meera', rsvpStatus: 'Pending', group: 'Friends', attendanceCount: 2 },
    { id: 'g3', eventId: 'e1', name: 'Rohan', rsvpStatus: 'Declined', group: 'VIP', attendanceCount: 1 },
  ];
  const stats = computeGuestMetrics(guests);
  assert.equal(stats.totalGuests, 3);
  assert.equal(stats.attendingHeads, 3);
  assert.equal(stats.pendingHeads, 2);
  assert.equal(stats.declinedHeads, 1);
  assert.equal(stats.specialDietCount, 1);
});

test('computeVendorFinancialSummary calculates quoted, advance, and remaining balances', () => {
  const vendors: EventVendor[] = [
    {
      id: 'v1',
      eventId: 'e1',
      category: 'Venue',
      businessName: 'Grand Palace',
      contactInfo: { phone: '9876543210' },
      quotedAmount: 500000,
      advancePayment: 200000,
      remainingPayment: 300000,
      bookingStatus: 'Fully Paid',
    },
    {
      id: 'v2',
      eventId: 'e1',
      category: 'Decor',
      businessName: 'Bloom Studio',
      contactInfo: { phone: '9876543211' },
      quotedAmount: 150000,
      advancePayment: 50000,
      remainingPayment: 100000,
      bookingStatus: 'Evaluating',
    },
  ];
  const summary = computeVendorFinancialSummary(vendors);
  assert.equal(summary.totalQuoted, 650000);
  assert.equal(summary.totalAdvancePaid, 250000);
  assert.equal(summary.remainingBalance, 400000);
  assert.equal(summary.bookedCount, 1);
});
