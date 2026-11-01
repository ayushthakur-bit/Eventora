import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCopilotMessage,
  buildEventContextDigest,
  deriveContextualActions,
} from './copilot-parser';
import { EventData } from '../types';

const sampleEvent: EventData = {
  id: 'evt_copilot_1',
  userId: 'usr_1',
  name: 'Aarav & Meera Royal Wedding',
  eventType: 'Wedding',
  startDate: '2026-11-28',
  city: 'Udaipur',
  venuePreference: 'Lakeside Courtyard',
  venueType: 'Mixed',
  guestCount: 220,
  totalBudget: 1500000,
  currency: 'INR',
  budgetFlexibility: 'Moderate',
  spendingPriorities: ['Venue', 'Food and catering'],
  costSavingCategories: ['Invitations and stationery'],
  theme: 'Luxury',
  preferredColors: ['Gold', 'Maroon'],
  foodPreferences: ['Rajasthani'],
  entertainmentPreferences: ['Folk Ensemble'],
  status: 'Planning',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

test('parseCopilotMessage extracts suggestions and removes metadata tags from content', () => {
  const raw = `### Strategic Budget Optimization
Here are 3 steps to optimize your budget:
1. Reduce live counters
2. Use local flowers

[SUGGESTIONS: "Simulate 15% cut", "Questions for caterer", "Review timeline"]`;

  const parsed = parseCopilotMessage(raw);
  assert.equal(parsed.suggestions.length, 3);
  assert.equal(parsed.suggestions[0], 'Simulate 15% cut');
  assert.equal(parsed.suggestions[1], 'Questions for caterer');
  assert.ok(!parsed.cleanContent.includes('[SUGGESTIONS:'));
  assert.ok(parsed.cleanContent.includes('### Strategic Budget Optimization'));
});

test('parseCopilotMessage extracts inline [ACTION: {...}] payloads', () => {
  const raw = `I have prepared a task for your venue inspection.
[ACTION: {"id":"act_1","type":"add_task","label":"Inspect Banquet Power","description":"High Priority","payload":{"title":"Inspect Banquet Power","priority":"High"}}]
[SUGGESTIONS: "What next?"]`;

  const parsed = parseCopilotMessage(raw);
  assert.equal(parsed.proposedActions.length, 1);
  assert.equal(parsed.proposedActions[0].type, 'add_task');
  assert.equal(parsed.proposedActions[0].label, 'Inspect Banquet Power');
  assert.equal(parsed.suggestions[0], 'What next?');
  assert.ok(!parsed.cleanContent.includes('[ACTION:'));
});

test('buildEventContextDigest computes accurate financial and operational metrics', () => {
  const digest = buildEventContextDigest(
    sampleEvent,
    [
      {
        id: 't1',
        eventId: 'evt_copilot_1',
        title: 'Lock Venue',
        category: 'Venue',
        dueDate: '2026-11-01',
        priority: 'High',
        status: 'Completed',
      },
      {
        id: 't2',
        eventId: 'evt_copilot_1',
        title: 'Menu Tasting',
        category: 'Catering',
        dueDate: '2026-11-10',
        priority: 'High',
        status: 'Not Started',
      },
    ],
    [
      {
        id: 'e1',
        eventId: 'evt_copilot_1',
        category: 'Venue',
        amount: 300000,
        vendorName: 'Palace Courtyard',
        paymentStatus: 'Advance Paid',
        date: '2026-10-05',
      },
    ],
    [],
    [
      {
        id: 'g1',
        eventId: 'evt_copilot_1',
        name: 'Rohan Sharma',
        group: 'Family',
        rsvpStatus: 'Attending',
        attendanceCount: 3,
      },
    ]
  );

  assert.equal(digest.totalSpent, 300000);
  assert.equal(digest.remainingBudget, 1200000);
  assert.equal(digest.utilizationPct, 20);
  assert.equal(digest.completedTasks, 1);
  assert.equal(digest.pendingTasksCount, 1);
  assert.equal(digest.confirmedGuests, 3);
});

test('deriveContextualActions returns relevant 1-click actions for catering and budget queries', () => {
  const cateringActions = deriveContextualActions('Questions to ask my caterer about food tasting', sampleEvent);
  assert.ok(cateringActions.some((a) => a.type === 'add_task' && a.label.includes('Menu Tasting')));

  const budgetActions = deriveContextualActions('Reduce my budget by 15% and save cost', sampleEvent);
  assert.ok(budgetActions.some((a) => a.type === 'add_expense'));
});
