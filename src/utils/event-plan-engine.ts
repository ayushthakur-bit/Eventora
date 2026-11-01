import {
  EventData,
  EventPlan,
  EventGuest,
  WhatIfSimulationResult,
  BudgetItemAllocation,
  EventTask,
  EventExpense,
  EventVendor,
} from '../types';
import { normalizeAllocationsToTotal } from './budgetCalculations';

export interface InvitationCardContent {
  headline: string;
  hosts: string;
  mainBody: string;
  itineraryHighlight: string;
  rsvpDetails: string;
  quote: string;
}

const VALID_RSVP_STATUSES: ReadonlySet<EventGuest['rsvpStatus']> = new Set([
  'Attending',
  'Pending',
  'Declined',
]);

const VALID_GUEST_GROUPS: ReadonlySet<EventGuest['group']> = new Set([
  'Family',
  'Friends',
  'VIP',
  'Colleagues',
  'General',
]);

/**
 * Sanitizes untrusted string input by removing control characters, script tags,
 * inline event handlers, and truncating to a safe maximum length.
 */
export function sanitizeTextInput(input: unknown, maxLength = 500): string {
  if (typeof input !== 'string') {
    return '';
  }
  const withoutScripts = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');

  const trimmed = withoutScripts.trim();
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

/**
 * Prevents CSV Formula Injection (CSV Injection) when exporting user data to spreadsheets.
 * Cells starting with =, +, -, @, tab, or CR are prefixed with a single quote.
 */
export function sanitizeCsvCell(value: string | number | undefined | null): string {
  const raw = String(value ?? '').replace(/"/g, '""').trim();
  if (/^[=+\-@\t\r]/.test(raw)) {
    return `'${raw}`;
  }
  return raw;
}

/**
 * Parses CSV guest rows into strongly-typed EventGuest records.
 */
export function parseGuestsFromCsv(
  csvContent: string,
  eventId: string,
  nowTimestamp = Date.now()
): EventGuest[] {
  if (!csvContent || !eventId) return [];
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  const startIndex = lines[0].toLowerCase().includes('name') ? 1 : 0;
  const parsedGuests: EventGuest[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i]
      .split(',')
      .map((p) => p.trim().replace(/^"|"$/g, '').replace(/^'/, ''));

    const guestName = sanitizeTextInput(parts[0], 120);
    if (!guestName) continue;

    const rawRsvp = sanitizeTextInput(parts[2], 30) as EventGuest['rsvpStatus'];
    const rsvpStatus: EventGuest['rsvpStatus'] = VALID_RSVP_STATUSES.has(rawRsvp)
      ? rawRsvp
      : 'Pending';

    const rawGroup = sanitizeTextInput(parts[3], 30) as EventGuest['group'];
    const group: EventGuest['group'] = VALID_GUEST_GROUPS.has(rawGroup)
      ? rawGroup
      : 'General';

    const parsedCount = Number.parseInt(parts[5] || '1', 10);
    const attendanceCount =
      Number.isFinite(parsedCount) && parsedCount > 0 && parsedCount <= 50
        ? parsedCount
        : 1;

    parsedGuests.push({
      id: `gst_${nowTimestamp}_${i}`,
      eventId,
      name: guestName,
      contactInfo: sanitizeTextInput(parts[1], 120),
      rsvpStatus,
      group,
      dietaryRequirements: sanitizeTextInput(parts[4], 160),
      attendanceCount,
    });
  }

  return parsedGuests;
}

/**
 * Formats a list of EventGuest items into a safe, RFC-compliant CSV string.
 */
export function formatGuestsToCsv(guests: EventGuest[]): string {
  const header = ['Name', 'Contact', 'RSVP Status', 'Group', 'Dietary Requirements', 'Count'].join(',');
  const rows = guests.map((g) =>
    [
      `"${sanitizeCsvCell(g.name)}"`,
      `"${sanitizeCsvCell(g.contactInfo || '')}"`,
      `"${sanitizeCsvCell(g.rsvpStatus)}"`,
      `"${sanitizeCsvCell(g.group)}"`,
      `"${sanitizeCsvCell(g.dietaryRequirements || '')}"`,
      sanitizeCsvCell(g.attendanceCount),
    ].join(',')
  );
  return [header, ...rows].join('\n');
}

/**
 * Generates a complete, mathematically balanced EventPlan tailored to the event type,
 * priorities, guest count, and total budget.
 * Guarantees that budgetBreakdown amounts sum to 100% of totalBudget, with Emergency Contingency
 * included inside the total budget.
 */
export function generateSmartFallbackPlan(data: Partial<EventData>): EventPlan {
  const rawBudget = Number(data.totalBudget);
  const budget = Number.isFinite(rawBudget) && rawBudget > 0 ? Math.round(rawBudget) : 500000;
  const guestCount =
    Number.isFinite(Number(data.guestCount)) && Number(data.guestCount) > 0
      ? Math.round(Number(data.guestCount))
      : 150;
  const eventType = sanitizeTextInput(data.eventType || 'Wedding', 60) || 'Wedding';
  const city = sanitizeTextInput(data.city || 'Mumbai', 80) || 'Mumbai';
  const theme = sanitizeTextInput(data.theme || 'Elegant', 60) || 'Elegant';
  const currency = sanitizeTextInput(data.currency || 'INR', 10) || 'INR';
  const venueType = data.venueType || 'Mixed';
  const preferredColors = Array.isArray(data.preferredColors) && data.preferredColors.length > 0
    ? data.preferredColors.map((c) => sanitizeTextInput(c, 40)).filter(Boolean)
    : ['Champagne Gold', 'Royal Indigo'];

  const isWedding = eventType === 'Wedding';
  const isCollege = eventType === 'College Event';
  const isCorporate = eventType === 'Corporate Event';

  let dist: { cat: string; pct: number; reason: string; tip: string }[] = [];

  if (isWedding) {
    dist = [
      { cat: 'Venue', pct: 35, reason: 'Covers ceremonial courtyard and banquet halls.', tip: 'Bundle lodging rooms for group discount.' },
      { cat: 'Food and catering', pct: 30, reason: 'Multi-course regional buffet with live stations.', tip: 'Limit live stations to 3 high-impact concepts.' },
      { cat: 'Decoration', pct: 12, reason: 'Floral mandap, fairy lights, and seating decor.', tip: 'Opt for indigenous marigolds and tuberose.' },
      { cat: 'Photography and videography', pct: 10, reason: 'Candid portraits, traditional coverage, and teaser reel.', tip: 'Book pre-wedding and wedding together.' },
      { cat: 'Entertainment', pct: 5, reason: 'Folk welcome troupe and DJ for reception.', tip: 'Share sound gear across functions.' },
      { cat: 'Transportation', pct: 2, reason: 'Airport transfers for key family members.', tip: 'Organize synchronized mini-bus shuttles.' },
      { cat: 'Invitations and stationery', pct: 1, reason: 'Digital interactive invites and keepsake cards.', tip: 'Use digital RSVP tracking via Eventora.' },
      { cat: 'Emergency contingency', pct: 5, reason: 'Reserve for unexpected guest plate spikes or weather gear.', tip: 'Keep in reserve until post-event reconciliations.' },
    ];
  } else if (isCollege) {
    dist = [
      { cat: 'Venue & Staging', pct: 30, reason: 'Stage construction, audiovisuals, and campus permits.', tip: 'Use campus auditorium to waive venue rental.' },
      { cat: 'Food & Refreshments', pct: 25, reason: 'Boxed lunches, tea, coffee, and energy counters.', tip: 'Partner with student-friendly catering providers.' },
      { cat: 'Guest Speakers & Artists', pct: 25, reason: 'Honorariums, travel, and headline performance.', tip: 'Reach out to notable alumni.' },
      { cat: 'Marketing & Merchandise', pct: 10, reason: 'Badges, branded lanyards, banners, and digital ads.', tip: 'Seek student community brand sponsorships.' },
      { cat: 'Emergency contingency', pct: 10, reason: 'Backup generator and security equipment reserve.', tip: 'Release unspent funds to student welfare.' },
    ];
  } else if (isCorporate) {
    dist = [
      { cat: 'Venue', pct: 35, reason: 'Convention auditorium and executive breakout rooms.', tip: 'Negotiate complimentary Wi-Fi and podium mic in hall package.' },
      { cat: 'Audio Visual & Tech Production', pct: 25, reason: 'LED stage backdrop, lapel microphones, and livestream deck.', tip: 'Use modular stage panels instead of custom carpentry.' },
      { cat: 'Food and catering', pct: 23, reason: 'Executive networking lunch, artisanal coffee bar, and gala dinner.', tip: 'Confirm exact delegate attendance 48 hours prior.' },
      { cat: 'Photography and videography', pct: 9, reason: 'Keynote recording, press photos, and post-event highlight reel.', tip: 'Book a single hybrid photo/video production crew.' },
      { cat: 'Emergency contingency', pct: 8, reason: 'Reserve for backup AV switchers and last-minute VIP badges.', tip: 'Audit tech rider 72 hours before doors open.' },
    ];
  } else {
    dist = [
      { cat: 'Venue', pct: 25, reason: 'Private party hall, rooftop, or outdoor garden rental.', tip: 'Book weekday or Sunday afternoon slots.' },
      { cat: 'Food and catering', pct: 40, reason: 'Custom appetizers, signature main course, and dessert buffet.', tip: 'Order signature cake separately from bakery.' },
      { cat: 'Decoration', pct: 15, reason: 'Themed balloon arches, custom backdrop, and table centerpieces.', tip: 'Use reusable LED signage and photo booth props.' },
      { cat: 'Entertainment', pct: 10, reason: 'DJ, emcee games, or live acoustic performer.', tip: 'Create collaborative playlist for cocktail hour.' },
      { cat: 'Invitations and favors', pct: 5, reason: 'Custom return gifts and digital video invites.', tip: 'Curate edible return favors in eco-pouches.' },
      { cat: 'Emergency contingency', pct: 5, reason: 'Safety buffer for sudden guest additions.', tip: 'Unused budget saved directly.' },
    ];
  }

  const rawAllocations: BudgetItemAllocation[] = dist.map((d) => ({
    category: d.cat,
    amount: Math.round((d.pct / 100) * budget),
    percentage: d.pct,
    reason: d.reason,
    costSavingTip: d.tip,
  }));

  const breakdown = normalizeAllocationsToTotal(rawAllocations, budget);

  return {
    overview: {
      summary: `A personalized, high-touch ${eventType} celebration in ${city} tailored for ${guestCount} guests, balancing ${theme} aesthetics with mathematical budget discipline.`,
      recommendedTheme: `${theme} Splendor with ${preferredColors[0] || 'Modern'} Accents`,
      suggestedFormat: 'Welcome reception, followed by signature ceremonial milestones and evening grand celebration.',
      recommendations: [
        'Finalize key venue agreements at least 6 weeks before to lock base rates.',
        'Implement digital RSVP check-ins to control actual per-plate catering expenditure.',
        'Designate a single logistics coordinator for vendor arrivals on event day.',
      ],
      assumptionsAndMissing: [
        `Assumed total attendee count remains within 10% of ${guestCount}.`,
        'Power backup generator availability is assumed to be included in venue booking.',
      ],
    },
    budgetBreakdown: breakdown,
    timeline: {
      preEventTasks: [
        { id: 'fb_t1', title: 'Confirm Venue Contract & Safety Deposits', description: 'Inspect acoustics and electrical points; pay advance.', timing: '8 weeks before', dueDate: '8 weeks before', priority: 'High', category: 'Venue' },
        { id: 'fb_t2', title: 'Curate & Sample Food Tasting Menu', description: 'Lock 5 starters, 4 mains, and live signature stations.', timing: '5 weeks before', dueDate: '5 weeks before', priority: 'High', category: 'Food and catering' },
        { id: 'fb_t3', title: 'Approve Theme & Lighting Mockup', description: 'Sign off on floral and lighting fixtures.', timing: '3 weeks before', dueDate: '3 weeks before', priority: 'Medium', category: 'Decoration' },
        { id: 'fb_t4', title: 'Distribute Digital Invitations & Collect RSVPs', description: 'Monitor attendance count and dietary restrictions.', timing: '2 weeks before', dueDate: '2 weeks before', priority: 'High', category: 'Invitations' },
        { id: 'fb_t5', title: 'Technical Soundcheck & Rehearsal', description: 'Test mics, lighting sequences, and master playlist.', timing: '3 days before', dueDate: '3 days before', priority: 'Medium', category: 'Entertainment' },
      ],
      eventDaySchedule: [
        { time: '11:00 - 13:00', activity: 'Vendor Setup & Site Inspection', notes: 'Check air-conditioning, generator backup, and buffet tables.' },
        { time: '16:00 - 17:30', activity: 'Guest Welcome & Refreshments', notes: 'Ambient background music; welcome desk attendants ready.' },
        { time: '18:00 - 19:30', activity: 'Main Program & Key Milestones', notes: 'Stage lighting active; photographer in primary spot.' },
        { time: '20:00 - 22:30', activity: 'Grand Feast & Interactive Celebrations', notes: 'Buffet open; music transitions to celebratory tempo.' },
      ],
      finalDayChecklist: [
        'Verify emergency contacts for all principal vendors.',
        'Distribute payment milestones for balance vendor settlements.',
        'Inspect stage safety and sound level limits.',
        'Place first aid kit and welcome hampers at reception.',
      ],
    },
    vendorChecklist: [
      { id: 'fb_v1', category: 'Venue', whatToLookFor: 'Capacity compliance, sound curfews, AC and lighting power', questionsToAsk: ['Is there a penalty for extending the event by 1 hour?', 'Are outside vendors permitted?'], estimatedPriceRange: `${currency} ${Math.round(budget * 0.3)}`, bookingDeadline: '6 weeks prior', status: 'To Contact' },
      { id: 'fb_v2', category: 'Catering', whatToLookFor: 'Food safety certifications, live counter experience, staff uniforms', questionsToAsk: ['What is the policy for extra guest plates on the spot?', 'Is tasting complimentary?'], estimatedPriceRange: `${currency} ${Math.round(budget * 0.3)}`, bookingDeadline: '5 weeks prior', status: 'To Contact' },
      { id: 'fb_v3', category: 'Photography', whatToLookFor: 'Low light clarity, turnaround time for teaser video', questionsToAsk: ['Who exactly will shoot on the day?', 'Are raw video archives preserved?'], estimatedPriceRange: `${currency} ${Math.round(budget * 0.1)}`, bookingDeadline: '4 weeks prior', status: 'To Contact' },
    ],
    personalizedIdeas: {
      decorationSuggestions: [
        `Illuminated canopy using fairy lights paired with ${preferredColors[0] || 'Gold'} draped fabrics.`,
        'Custom photo backdrop wall decorated with monogram signage and local flora.',
        'Candle-lit table centerpieces with fresh fragrant blooms and placecards.',
      ],
      themeAndPalette: [
        preferredColors[0] || 'Champagne Gold',
        preferredColors[1] || 'Royal Indigo',
        'Ivory White',
        'Soft Botanical Green',
      ],
      foodAndMenuIdeas: [
        'Signature mocktail bar featuring botanical syrups and smoked spices.',
        'Interactive live gourmet station tailored to guest preferences.',
        'Warm artisanal dessert trio served with custom monogram garnishes.',
      ],
      activitiesAndEntertainment: [
        'Live acoustic ensemble during welcome hours transitioning into high-energy dance set.',
        'Interactive digital guestbook where guests snap instant polaroids with handwritten wishes.',
      ],
      invitationIdeas: [
        'Modern minimalist digital invitation with embedded interactive RSVP link.',
        'Cardstock keepsake invitation with embossed metallic foil monogram.',
      ],
      guestExperienceImprovements: [
        'Personalized welcome drink and warm scented towels upon arrival.',
        'Dedicated charging station and coat/bag check counter.',
      ],
      budgetFriendlyAlternatives: [
        'Opt for high-density local seasonal flowers instead of imported exotic stems.',
        'Utilize ambient architectural up-lighting instead of heavy structural wooden builds.',
      ],
    },
    risksAndRecommendations: {
      commonPlanningProblems: [
        'Guest attendance swelling 15-20% beyond initial RSVPs.',
        'Audio feedback loops in spaces with high ceilings and marble floors.',
      ],
      weatherContingency:
        venueType === 'Outdoor'
          ? 'Mandatory waterproof marquee tent and covered walkway agreement with venue.'
          : 'Indoor climate control and backup power generators reserved.',
      backupVendorsOrVenues: 'Secondary freelance sound engineer on standby with wireless mics.',
      guestCountChangesAdvice: 'Notify caterer with final guaranteed head count exactly 72 hours prior.',
      paymentDeadlinesCaution: 'Never release 100% of payment before final service handover on event night.',
      accessibilityAndSafety: 'Check for step-free wheelchair access from main drop-off to reception hall.',
    },
  };
}

/**
 * Deterministic What-If Scenario Simulator that recalculates budget allocations,
 * shields priority categories, and guarantees that reallocated amounts sum exactly to newBudget.
 */
export function generateSmartWhatIfFallback(
  rawQuery: string,
  currentEvent: Partial<EventData>,
  currentPlan?: Partial<EventPlan>
): WhatIfSimulationResult {
  const query = sanitizeTextInput(rawQuery, 400);
  const currentBudget =
    Number.isFinite(Number(currentEvent?.totalBudget)) && Number(currentEvent?.totalBudget) > 0
      ? Math.round(Number(currentEvent.totalBudget))
      : 500000;
  const currency = currentEvent?.currency || 'INR';
  const lowerQuery = query.toLowerCase();

  let newBudget = currentBudget;
  let summary = '';
  let taskModifications: WhatIfSimulationResult['taskModifications'] = [];

  // Parse explicit target budget numbers in query
  const numbersFound = query.match(/\d[\d,.]*/g);
  if (numbersFound && numbersFound.length >= 2 && lowerQuery.includes('budget')) {
    const rawVal = numbersFound[numbersFound.length - 1].replace(/,/g, '');
    const parsedVal = Number.parseFloat(rawVal);
    if (Number.isFinite(parsedVal) && parsedVal > 1000) {
      newBudget = Math.round(parsedVal);
    }
  } else if (
    lowerQuery.includes('decrease') ||
    lowerQuery.includes('reduce') ||
    lowerQuery.includes('cut') ||
    lowerQuery.includes('drop')
  ) {
    newBudget = Math.round(currentBudget * 0.85);
  } else if (lowerQuery.includes('increase') || lowerQuery.includes('expand')) {
    newBudget = Math.round(currentBudget * 1.2);
  }

  const diff = newBudget - currentBudget;
  const breakdown: BudgetItemAllocation[] =
    Array.isArray(currentPlan?.budgetBreakdown) && currentPlan.budgetBreakdown.length > 0
      ? currentPlan.budgetBreakdown
      : generateSmartFallbackPlan(currentEvent).budgetBreakdown;

  const priorities = Array.isArray(currentEvent?.spendingPriorities)
    ? currentEvent.spendingPriorities
    : ['Venue', 'Food and catering'];

  // Check if query explicitly asks to keep a category unchanged
  const explicitlyProtected = breakdown
    .filter(
      (b) =>
        lowerQuery.includes(b.category.toLowerCase().split(' ')[0]) &&
        (lowerQuery.includes('keep') ||
          lowerQuery.includes('unchanged') ||
          lowerQuery.includes('protect'))
    )
    .map((b) => b.category);

  const preservedPriorities = Array.from(new Set([...explicitlyProtected, ...priorities]));

  if (diff !== 0 && breakdown.length > 0) {
    const factor = newBudget / currentBudget;
    summary = `Simulated a budget adjustment from ${currency} ${currentBudget.toLocaleString()} to ${currency} ${newBudget.toLocaleString()} (${diff < 0 ? 'Cost Optimization' : 'Budget Expansion'}). Protected priority categories (${preservedPriorities.join(', ')}) while mathematically rebalancing discretionary categories.`;

    // Calculate initial scaled amounts while shielding priorities
    const rawScaled = breakdown.map((item) => {
      const isExplicitlyFixed = explicitlyProtected.includes(item.category);
      const isPriority = priorities.some((p) =>
        item.category.toLowerCase().includes(p.toLowerCase())
      );

      let targetAmt = Math.round(item.amount * factor);
      if (isExplicitlyFixed) {
        targetAmt = item.amount;
      } else if (diff < 0 && isPriority) {
        targetAmt = Math.round(item.amount * Math.max(0.95, factor));
      }

      return {
        category: item.category,
        oldAmount: item.amount,
        newAmount: Math.max(0, targetAmt),
        isProtected: isExplicitlyFixed || isPriority,
      };
    });

    // Distribute any rounding or shielding residual across non-protected categories so sum === newBudget
    const currentSum = rawScaled.reduce((acc, r) => acc + r.newAmount, 0);
    const residual = newBudget - currentSum;

    if (residual !== 0) {
      const adjustableIndices = rawScaled
        .map((r, idx) => (!r.isProtected ? idx : -1))
        .filter((idx) => idx >= 0);

      if (adjustableIndices.length > 0) {
        const adjustableTotal = adjustableIndices.reduce(
          (acc, idx) => acc + rawScaled[idx].newAmount,
          0
        );
        let remainingResidual = residual;
        adjustableIndices.forEach((idx, pos) => {
          if (pos === adjustableIndices.length - 1) {
            rawScaled[idx].newAmount = Math.max(0, rawScaled[idx].newAmount + remainingResidual);
          } else if (adjustableTotal > 0) {
            const share = Math.round(
              (rawScaled[idx].newAmount / adjustableTotal) * residual
            );
            rawScaled[idx].newAmount = Math.max(0, rawScaled[idx].newAmount + share);
            remainingResidual -= share;
          }
        });
      } else {
        rawScaled[rawScaled.length - 1].newAmount = Math.max(
          0,
          rawScaled[rawScaled.length - 1].newAmount + residual
        );
      }
    }

    const reallocations = rawScaled.map((item) => ({
      category: item.category,
      oldAmount: item.oldAmount,
      newAmount: item.newAmount,
      changeReason: item.isProtected
        ? 'Shielded priority category per your preferences.'
        : diff < 0
        ? 'Streamlined non-essential decor and rentals to absorb reduction.'
        : 'Allocated portion of surplus for enhanced guest experience.',
    }));

    taskModifications = [
      {
        action: 'modify',
        taskTitle: 'Renegotiate Vendor Quotations',
        details: `Request updated quotation packages aligned with revised ${currency} ${newBudget.toLocaleString()} target.`,
      },
      {
        action: 'add',
        taskTitle: 'Audit Catering Menu & Decor Specs',
        details: 'Streamline live dessert and floral selections to maintain high quality at optimized price.',
      },
    ];

    return {
      query,
      impactSummary: summary,
      preservedPriorities,
      budgetAdjustments: {
        previousBudget: currentBudget,
        newBudget,
        difference: diff,
        reallocations,
      },
      taskModifications,
      recommendations: [
        'Lock revised parameters with vendors via written addendum.',
        'Check if any advances already paid need to be credited against revised milestone deliverables.',
        'Review task checklist to ensure team is aligned with the new targets.',
      ],
    };
  }

  if (lowerQuery.includes('guest') || lowerQuery.includes('people')) {
    summary =
      'Simulated an updated guest count scenario. Food & catering, seating arrangements, and favors scaled within the existing budget while fixed costs (photography, sound) remain stable.';
    taskModifications = [
      {
        action: 'modify',
        taskTitle: 'Update Caterer with Revised Headcount',
        details: 'Provide revised table count and seating buffer.',
      },
    ];
  } else if (lowerQuery.includes('indoor') || lowerQuery.includes('outdoor')) {
    summary =
      'Simulated venue transition scenario. Outdoor tenting and generator reserves have been reallocated into indoor ambient lighting, acoustics, and climate control verification.';
    taskModifications = [
      {
        action: 'add',
        taskTitle: 'Confirm Banquet Hall Sound Curfew',
        details: 'Check decibel limits and cutoff timings with banquet manager.',
      },
      {
        action: 'remove',
        taskTitle: 'Weather Tenting Standby',
        details: 'No longer required for indoor venue.',
      },
    ];
  } else {
    summary = `Analyzed scenario query: "${query}". Impact assessed on logistics, timeline, and vendor deliverables while protecting core event priorities.`;
    taskModifications = [
      {
        action: 'modify',
        taskTitle: 'Review Schedule Milestones',
        details: 'Aligned planning deadlines with requested adjustments.',
      },
    ];
  }

  return {
    query,
    impactSummary: summary,
    preservedPriorities,
    budgetAdjustments: {
      previousBudget: currentBudget,
      newBudget: currentBudget,
      difference: 0,
      reallocations: breakdown.map((item) => ({
        category: item.category,
        oldAmount: item.amount,
        newAmount: item.amount,
        changeReason: item.category.toLowerCase().includes('food')
          ? 'Re-evaluated per-plate portions within fixed cap'
          : 'Protected allocation within total budget',
      })),
    },
    taskModifications,
    recommendations: [
      'Lock revised parameters with vendors via written addendum.',
      'Check if any advances already paid need to be credited against revised milestone deliverables.',
      'Review task checklist to ensure team is aligned with the new targets.',
    ],
  };
}

/**
 * Generates a grounded, persona-aware Copilot response using live event metrics.
 */
export function generateSmartCopilotResponse(
  rawMessage: string,
  currentEvent?: Partial<EventData> | null,
  _currentPlan?: Partial<EventPlan> | null,
  persona = 'general',
  tasks: EventTask[] = [],
  expenses: EventExpense[] = [],
  vendors: EventVendor[] = []
): string {
  const message = sanitizeTextInput(rawMessage, 500);
  const m = message.toLowerCase();
  const currency = currentEvent?.currency || '₹';
  const name = currentEvent?.name || 'your event';
  const budget = Number(currentEvent?.totalBudget) || 500000;
  const guestsCount = Number(currentEvent?.guestCount) || 150;
  const city = currentEvent?.city || 'your city';
  const theme = currentEvent?.theme || 'Elegant';
  const spent = Array.isArray(expenses)
    ? expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
    : 0;
  const remaining = Math.max(0, budget - spent);
  const perGuestBudget = Math.round(budget / Math.max(1, guestsCount));

  if (
    m.includes('reduce') ||
    m.includes('budget') ||
    m.includes('save') ||
    m.includes('spending') ||
    m.includes('audit') ||
    m.includes('cost')
  ) {
    const targetSave = Math.round(budget * 0.15);
    return `### Financial Audit & Cost Optimization for "${name}"

Based on your **${currency} ${budget.toLocaleString()}** total budget (${currency} ${perGuestBudget.toLocaleString()}/guest across **${guestsCount} guests** in **${city}**), you have spent **${currency} ${spent.toLocaleString()}** with **${currency} ${remaining.toLocaleString()}** remaining.

Here is how to unlock **${currency} ${targetSave.toLocaleString()} (15%)** in immediate savings while protecting your **${(currentEvent?.spendingPriorities || ['Venue', 'Catering']).join(' & ')}** priorities:

1. **Consolidate Live Catering Stations**: Cap interactive stations at **3 high-impact counters** instead of 6+. For ${guestsCount} guests, this reduces kitchen staffing and wastage by **~18%**.
2. **Indigenous ${theme} Flora**: Replace imported cold-chain stems with seasonal regional blooms and warm architectural LED uplighting in ${city} — saving **${currency} ${Math.round(budget * 0.04).toLocaleString()}**.
3. **Off-Peak Vendor Load-In**: Negotiate a unified sound & lighting package from a single production house rather than separate DJ and stage vendors.
4. **Lock a 5% Contingency Hold**: Keep **${currency} ${Math.round(budget * 0.05).toLocaleString()}** untouched until final settlement night.

[SUGGESTIONS: "Draft a vendor discount negotiation script", "What should I do this week?", "Questions to ask my caterer"]`;
  }

  if (m.includes('cater') || m.includes('food') || m.includes('menu') || m.includes('plate') || m.includes('drink')) {
    const cateringRecommended = Math.round(budget * 0.28);
    const maxPerPlate = Math.round(cateringRecommended / Math.max(1, guestsCount));
    return `### Catering & Menu Strategy for "${name}"

To stay within your optimal **${currency} ${cateringRecommended.toLocaleString()}** food allocation for **${guestsCount} guests**, aim for an all-inclusive per-plate cap of **${currency} ${maxPerPlate.toLocaleString()}**.

- **5 Essential Questions for Your Caterer**:
  1. **Guaranteed vs. Buffer Plates**: *"If we guarantee ${guestsCount} plates, will you hold a 10% buffer (${Math.round(guestsCount * 0.1)} extra plates) at the same base rate?"*
  2. **Service Staff Ratio**: *"Can you confirm 1 uniformed steward per 12 guests and dedicated attendants at live stations?"*
  3. **Dietary Segregation**: *"How will Jain, Vegan, and allergy-sensitive counters be separated in the kitchen and buffet line?"*
  4. **Leftover & Packaging Policy**: *"Are food-grade takeaway containers included for surplus desserts and mithai?"*
  5. **Power & Water Corkage**: *"Are there any hidden generator diesel or kitchen water charges from the venue?"*

[SUGGESTIONS: "Suggest unique decoration ideas", "Draft a vendor negotiation script", "Review my actual spending"]`;
  }

  if (m.includes('vendor') || m.includes('negotiate') || m.includes('contract') || m.includes('script') || m.includes('quote')) {
    return `### Vendor Negotiation Script & Contract Safeguards

You currently have **${vendors.length} shortlisted vendors** for **${name}**. Use this word-for-word script when finalizing quotes in **${city}**:

- **Word-for-Word Negotiation Script**:
  > *"We love your portfolio for our ${currentEvent?.startDate || 'upcoming'} ${currentEvent?.eventType || 'event'} at ${currentEvent?.venuePreference || city}. We are finalizing bookings in the next 48 hours with a strict ceiling of ${currency} ${Math.round(budget * 0.25).toLocaleString()} for this category. If you can include complimentary early setup and waive the overtime surcharge for the first 45 minutes, we are ready to transfer the booking token today."*

- **3 Mandatory Contract Clauses**:
  1. **Milestone Payment Split**: Never pay more than **25% advance** on signing, **50% one week prior**, and **25% after event completion**.
  2. **Named Lead Professional**: Specify the exact lead photographer/coordinator by name so a junior substitute isn't sent on event day.
  3. **Force Majeure & Date Transfer**: Ensure 100% of advances transfer to a rescheduled date if weather or civic restrictions occur.

[SUGGESTIONS: "Questions to ask my caterer", "Reduce my budget by 15%", "Weather contingency checklist"]`;
  }

  if (m.includes('decor') || m.includes('theme') || m.includes('idea') || m.includes('color') || m.includes('light')) {
    const colors = (currentEvent?.preferredColors || ['Champagne Gold', 'Royal Indigo']).join(' & ');
    return `### Creative & ${theme} Decor Concepts for "${name}"

Designed around your **${theme}** aesthetic and **${colors}** palette at **${currentEvent?.venuePreference || city}**:

1. **Architectural Entry Tunnel**: Frame the arrival walkway with draped raw silk in **${colors}**, accented by warm micro-fairy canopies and brass lanterns for an unforgettable first impression.
2. **Layered Focal Stage / Mandap**: Instead of heavy foam structures, use asymmetrical botanical arches paired with programmable warm-white pin-spots so photography skin tones remain crisp.
3. **Interactive Guest Touchpoint**: Set up an audio-visual "Wishes & Polaroid Wall" where guests clip instant prints alongside handwritten notes for the hosts.
4. **Table Scaping**: Low-profile floral runners (under 10 inches tall) so guests can converse effortlessly across dining tables.

[SUGGESTIONS: "How much should I allocate to decoration?", "Suggest entertainment ideas", "What should I do this week?"]`;
  }

  if (m.includes('weather') || m.includes('rain') || m.includes('contingency') || m.includes('backup') || m.includes('risk')) {
    return `### Weather & Operational Contingency Protocol

Because **${name}** in **${city}** uses a **${currentEvent?.venueType || 'Mixed'}** venue layout, keep these 4 safeguards ready:

- **72-Hour Weather Trigger**: Lock a standby agreement for clear-span waterproof marquee tenting or an indoor ballroom hold if rain probability exceeds **35%**.
- **Acoustic & Generator Redundancy**: Require **2x silent DG power generators** with automatic changeover (ATS) wired separately for stage sound and catering warmers.
- **Guest Arrival Valet & Canopy**: Position 25 oversized golf umbrellas and non-slip coir matting along the main drop-off porch.
- **Medical & Safety Kit**: Keep a dedicated first-aid station, fire extinguishers near live cooking counters, and wheelchair-accessible ramps verified by noon on event day.

[SUGGESTIONS: "Add this to my event-day run-sheet", "Review my actual spending", "What should I do this week?"]`;
  }

  if (m.includes('timeline') || m.includes('this week') || m.includes('schedule') || m.includes('tasks') || m.includes('checklist')) {
    const pendingCount = Array.isArray(tasks) ? tasks.filter((t) => t.status !== 'Completed').length : 3;
    return `### Priority Execution Roadmap (${pendingCount} Tasks Pending)

For **${name}** (${currentEvent?.startDate || 'upcoming'}), focus on these high-impact milestones this week:

1. **Lock Venue & Technical Floorplan**: Confirm electrical load (kVA), sound curfew timings, and green-room readiness at **${currentEvent?.venuePreference || city}**.
2. **Catering Headcount & Tasting Sign-Off**: Freeze your base plate guarantee for **${guestsCount} guests** and verify Jain/Vegan station placement.
3. **Vendor Advance Reconciliation**: Log all paid token amounts in **Budget & Expenses** so your **${currency} ${remaining.toLocaleString()}** remaining balance stays 100% accurate.
4. **Master Run-Sheet Distribution**: Share the hour-by-hour cue sheet with your photographer, emcee, and banquet captain 5 days prior.

[SUGGESTIONS: "Questions to ask my caterer", "Weather contingency checklist", "Reduce my budget by 15%"]`;
  }

  return `### Strategic Copilot Analysis for "${name}"

Regarding your request (*"${message}"*) in **${persona.toUpperCase()}** mode:

- **Live Financial Snapshot**: Out of your **${currency} ${budget.toLocaleString()}** budget (${currency} ${perGuestBudget.toLocaleString()}/guest for **${guestsCount} guests**), **${currency} ${spent.toLocaleString()}** is committed and **${currency} ${remaining.toLocaleString()}** is available.
- **Execution Recommendation**: Protect your top priorities (**${(currentEvent?.spendingPriorities || ['Venue', 'Food and catering']).join(', ')}**) by locking written deliverable SLAs before releasing second-tranche vendor payments.
- **Guest Experience**: Add a 30-minute hospitality buffer between arrival refreshments and the main program at **${currentEvent?.venuePreference || city}** to absorb traffic delays.

Use the **1-Click Action Card** below to apply this directly to your event plan, or ask a follow-up question!

[SUGGESTIONS: "Reduce my budget by 15%", "Draft a vendor negotiation script", "What should I do this week?"]`;
}

/**
 * Generates multi-lingual (English, Hindi, Gujarati) invitation copy for an event.
 */
export function generateSmartInvitationFallback(
  currentEvent: Partial<EventData>,
  tone = 'Warm & Celebratory',
  language = 'English'
): InvitationCardContent {
  const eventName = sanitizeTextInput(currentEvent?.name || 'Grand Celebration', 120);
  const city = sanitizeTextInput(currentEvent?.city || 'Mumbai', 80);
  const venue = sanitizeTextInput(currentEvent?.venuePreference || 'The Grand Ballroom', 120);
  const startDate = sanitizeTextInput(currentEvent?.startDate || '2026-12-15', 40);
  const theme = sanitizeTextInput(currentEvent?.theme || 'Festive', 60);

  if (language === 'Hindi') {
    return {
      headline: '|| श्री गणेशाय नमः ||',
      hosts: 'सम्मानित परिवार',
      mainBody: `अत्यंत हर्ष और आनंद के साथ हम आपको ${eventName} के शुभ अवसर पर सपरिवार आमंत्रित करते हैं। आपकी गरिमामयी उपस्थिति हमारे उत्सव की शोभा बढ़ाएगी।`,
      itineraryHighlight: `दिनांक: ${startDate} | स्थान: ${venue}, ${city}`,
      rsvpDetails: 'दर्शनाभिलाषी एवं स्वागतकर्ता - समस्त परिवार',
      quote: 'मंगलम् भगवान विष्णुः, मंगलम् गरुड़ध्वजः। मंगलम् पुण्डरीकाक्षः, मंगलाय तनो हरिः॥',
    };
  }

  if (language === 'Gujarati') {
    return {
      headline: '|| શ્રી ગણેશાય નમઃ ||',
      hosts: 'સ્નેહી પરિવાર',
      mainBody: `અત્યંત આનંદ સાથે જણાવવાનું કે ${eventName} ના શુભ પ્રસંગે આપશ્રીને પરિવાર સાથે પધારવા અમારું ભાવભર્યું આમંત્રણ છે.`,
      itineraryHighlight: `તારીખ: ${startDate} | સ્થળ: ${venue}, ${city}`,
      rsvpDetails: 'આપના આગમનની રાહમાં - સમસ્ત પરિવાર',
      quote: 'સ્નેહ, સંસ્કાર અને ઉમંગનો અનેરો સંગમ.',
    };
  }

  return {
    headline: 'Together With Our Families',
    hosts: 'Cordially Invite You To Celebrate',
    mainBody: `With joyful hearts and warm wishes, we invite you to join us for ${eventName}. Come celebrate an unforgettable ${tone.toLowerCase()} evening filled with laughter, music, and cherished memories.`,
    itineraryHighlight: `Date: ${startDate} • Venue: ${venue}, ${city} • Dress Code: ${theme} Attire`,
    rsvpDetails: 'Kindly RSVP at your earliest convenience • Warmest Compliments from the Hosts',
    quote: 'Every great celebration begins with the warmth of those we hold dear.',
  };
}
