import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateDatabaseBackup,
  auditEventData,
  filterEvents,
  exportEventsToCsv,
} from './data-management';
import { EventData, EventExpense } from '../types';

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
