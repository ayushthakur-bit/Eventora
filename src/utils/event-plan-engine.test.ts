import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeTextInput,
  sanitizeCsvCell,
  parseGuestsFromCsv,
  formatGuestsToCsv,
  generateSmartFallbackPlan,
  generateSmartWhatIfFallback,
  generateSmartCopilotResponse,
  generateSmartInvitationFallback,
} from './event-plan-engine';

test('sanitizeTextInput removes script tags, HTML elements, and enforces maxLength', () => {
  const malicious = '<script>alert("xss")</script><b>Royal Wedding</b> javascript:void(0)';
  const cleaned = sanitizeTextInput(malicious, 100);
  assert.equal(cleaned.includes('<script>'), false);
  assert.equal(cleaned.includes('<b>'), false);
  assert.equal(cleaned.includes('javascript:'), false);
  assert.ok(cleaned.includes('Royal Wedding'));

  const truncated = sanitizeTextInput('A'.repeat(200), 50);
  assert.equal(truncated.length, 50);
  assert.equal(sanitizeTextInput(null), '');
});

test('sanitizeCsvCell neutralizes spreadsheet formula injection prefixes', () => {
  assert.equal(sanitizeCsvCell('=SUM(A1:A10)'), "'=SUM(A1:A10)");
  assert.equal(sanitizeCsvCell('+cmd|"/c calc"!A0'), "'+cmd|\"\"/c calc\"\"!A0");
  assert.equal(sanitizeCsvCell('-2+3'), "'-2+3");
  assert.equal(sanitizeCsvCell('@import'), "'@import");
  assert.equal(sanitizeCsvCell('Aarav Sharma'), 'Aarav Sharma');
});

test('parseGuestsFromCsv and formatGuestsToCsv support clean round-trip and validate enums', () => {
  const csv = [
    'Name,Contact,RSVP Status,Group,Dietary Requirements,Count',
    '"Riya Kapoor","riya@example.com","Attending","VIP","Jain",2',
    '"Vikram Singh","9876543210","InvalidStatus","UnknownGroup","Vegan",4',
  ].join('\n');

  const guests = parseGuestsFromCsv(csv, 'evt_1', 1000);
  assert.equal(guests.length, 2);
  assert.equal(guests[0].name, 'Riya Kapoor');
  assert.equal(guests[0].rsvpStatus, 'Attending');
  assert.equal(guests[0].group, 'VIP');
  assert.equal(guests[0].attendanceCount, 2);

  // Invalid enums fall back to Pending / General safely
  assert.equal(guests[1].rsvpStatus, 'Pending');
  assert.equal(guests[1].group, 'General');
  assert.equal(guests[1].attendanceCount, 4);

  const exported = formatGuestsToCsv(guests);
  assert.ok(exported.includes('"Riya Kapoor"'));
  assert.ok(exported.includes('"Jain"'));
});

test('generateSmartFallbackPlan balances budgetBreakdown to exact 100% of totalBudget across event types', () => {
  for (const eventType of ['Wedding', 'College Event', 'Corporate Event', 'Birthday'] as const) {
    const totalBudget = 1357900;
    const plan = generateSmartFallbackPlan({
      name: `Test ${eventType}`,
      eventType,
      city: 'Jaipur',
      guestCount: 220,
      totalBudget,
      currency: 'INR',
      theme: 'Luxury',
      venueType: 'Outdoor',
    });

    const sum = plan.budgetBreakdown.reduce((acc, item) => acc + item.amount, 0);
    assert.equal(sum, totalBudget, `Expected budget sum for ${eventType} to equal ${totalBudget}`);
    assert.ok(
      plan.budgetBreakdown.some((b) => b.category.toLowerCase().includes('contingency')),
      'Emergency contingency must be included inside the budget breakdown'
    );
    assert.ok(plan.timeline.preEventTasks.length >= 4);
    assert.ok(plan.vendorChecklist.length >= 3);
    assert.ok(plan.risksAndRecommendations.weatherContingency.includes('marquee'));
  }
});

test('generateSmartWhatIfFallback recalculates budget cuts while shielding priorities and matching newBudget', () => {
  const baseEvent = {
    name: 'Udaipur Wedding',
    eventType: 'Wedding' as const,
    totalBudget: 1000000,
    guestCount: 200,
    currency: 'INR' as const,
    spendingPriorities: ['Photography and videography', 'Venue'],
  };
  const basePlan = generateSmartFallbackPlan(baseEvent);

  const result = generateSmartWhatIfFallback(
    'My wedding budget decreased from 10,00,000 to 8,00,000. Keep photography unchanged.',
    baseEvent,
    basePlan
  );

  assert.equal(result.budgetAdjustments.previousBudget, 1000000);
  assert.equal(result.budgetAdjustments.newBudget, 800000);
  assert.equal(result.budgetAdjustments.difference, -200000);

  const newSum = result.budgetAdjustments.reallocations.reduce((acc, r) => acc + r.newAmount, 0);
  assert.equal(newSum, 800000);

  // Photography was explicitly protected ("Keep photography unchanged")
  const photoRow = result.budgetAdjustments.reallocations.find((r) =>
    r.category.toLowerCase().includes('photography')
  );
  assert.ok(photoRow);
  assert.equal(photoRow.newAmount, photoRow.oldAmount);
});

test('generateSmartWhatIfFallback handles guest surge and indoor transition queries', () => {
  const baseEvent = {
    name: 'Corporate Summit',
    eventType: 'Corporate Event' as const,
    totalBudget: 600000,
    guestCount: 120,
    currency: 'INR' as const,
  };
  const basePlan = generateSmartFallbackPlan(baseEvent);

  const guestSurge = generateSmartWhatIfFallback(
    'I now expect 180 guests instead of 120 people.',
    baseEvent,
    basePlan
  );
  assert.equal(guestSurge.budgetAdjustments.difference, 0);
  assert.ok(guestSurge.impactSummary.toLowerCase().includes('guest count'));

  const indoorMove = generateSmartWhatIfFallback(
    'Move our celebration to an indoor banquet hall.',
    baseEvent,
    basePlan
  );
  assert.ok(indoorMove.impactSummary.toLowerCase().includes('indoor'));
  assert.ok(indoorMove.taskModifications.some((t) => t.action === 'remove'));
});

test('generateSmartCopilotResponse grounds answers in live event metrics and appends suggestions', () => {
  const event = {
    name: 'Meera & Kabir Sangeet',
    eventType: 'Wedding' as const,
    totalBudget: 1200000,
    guestCount: 200,
    city: 'Udaipur',
    currency: 'INR' as const,
    spendingPriorities: ['Venue', 'Food and catering'],
  };

  const budgetReply = generateSmartCopilotResponse('How can I reduce my budget by 15%?', event);
  assert.ok(budgetReply.includes('Meera & Kabir Sangeet'));
  assert.ok(budgetReply.includes('[SUGGESTIONS:'));

  const vendorReply = generateSmartCopilotResponse('Draft a vendor negotiation script', event);
  assert.ok(vendorReply.includes('Word-for-Word Negotiation Script'));

  const weatherReply = generateSmartCopilotResponse('Give me a rain contingency checklist', event);
  assert.ok(weatherReply.includes('72-Hour Weather Trigger'));
});

test('generateSmartInvitationFallback produces English, Hindi, and Gujarati invitations', () => {
  const evt = {
    name: 'Golden Jubilee',
    city: 'Ahmedabad',
    venuePreference: 'Heritage Courtyard',
    startDate: '2026-12-20',
    theme: 'Traditional' as const,
  };

  const en = generateSmartInvitationFallback(evt, 'Royal & Grand', 'English');
  const hi = generateSmartInvitationFallback(evt, 'Warm & Celebratory', 'Hindi');
  const gu = generateSmartInvitationFallback(evt, 'Warm & Celebratory', 'Gujarati');

  assert.ok(en.mainBody.includes('Golden Jubilee'));
  assert.ok(hi.headline.includes('श्री गणेशाय'));
  assert.ok(gu.headline.includes('શ્રી ગણેશાય'));
});
