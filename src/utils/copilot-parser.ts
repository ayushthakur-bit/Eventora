import { EventData, EventTask, EventExpense, EventVendor, EventGuest } from '../types';

export type CopilotPersona =
  | 'general'
  | 'budget'
  | 'vendor'
  | 'timeline'
  | 'creative';

export interface ProposedCopilotAction {
  id: string;
  type: 'add_task' | 'add_expense' | 'add_vendor' | 'add_schedule';
  label: string;
  description: string;
  payload: Record<string, unknown>;
  applied?: boolean;
}

export interface ParsedCopilotResponse {
  cleanContent: string;
  suggestions: string[];
  proposedActions: ProposedCopilotAction[];
}

/**
 * Extracts [SUGGESTIONS: "item1", "item2"] from raw assistant text
 * and cleans up any trailing metadata tags so markdown renders cleanly.
 */
export function parseCopilotMessage(rawText: string): ParsedCopilotResponse {
  if (!rawText || typeof rawText !== 'string') {
    return {
      cleanContent: '',
      suggestions: [],
      proposedActions: [],
    };
  }

  let workingText = rawText;
  const suggestions: string[] = [];
  const proposedActions: ProposedCopilotAction[] = [];

  // 1. Extract [SUGGESTIONS: ...] block
  const suggestionRegex = /\[SUGGESTIONS:\s*([^\]]+)\]/gi;
  let match: RegExpExecArray | null;

  while ((match = suggestionRegex.exec(rawText)) !== null) {
    const inner = match[1];
    const quotedRegex = /"([^"]+)"|'([^']+)'/g;
    let qMatch: RegExpExecArray | null;
    while ((qMatch = quotedRegex.exec(inner)) !== null) {
      const val = (qMatch[1] || qMatch[2] || '').trim();
      if (val && !suggestions.includes(val)) {
        suggestions.push(val);
      }
    }
    // If no quotes were used, split by comma
    if (suggestions.length === 0) {
      inner
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((s) => {
          if (!suggestions.includes(s)) suggestions.push(s);
        });
    }
  }

  workingText = workingText.replace(suggestionRegex, '').trim();

  // 2. Extract optional [ACTION: {...}] JSON blocks if present
  const actionRegex = /\[ACTION:\s*(\{[\s\S]*?\})\s*\]/gi;
  let aMatch: RegExpExecArray | null;
  let actionIdx = 0;

  while ((aMatch = actionRegex.exec(rawText)) !== null) {
    try {
      const parsed = JSON.parse(aMatch[1]);
      if (parsed && parsed.type && parsed.label) {
        proposedActions.push({
          id: parsed.id || `act_${Date.now()}_${actionIdx++}`,
          type: parsed.type,
          label: parsed.label,
          description: parsed.description || '',
          payload: parsed.payload || {},
        });
      }
    } catch {
      // Ignore malformed JSON action tag
    }
  }

  workingText = workingText.replace(actionRegex, '').trim();

  return {
    cleanContent: workingText,
    suggestions: suggestions.slice(0, 4),
    proposedActions,
  };
}

/**
 * Builds a concise operational context summary of an event for grounding the chatbot
 */
export function buildEventContextDigest(
  event: EventData,
  tasks: EventTask[] = [],
  expenses: EventExpense[] = [],
  vendors: EventVendor[] = [],
  guests: EventGuest[] = []
) {
  const totalSpent = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const remainingBudget = Math.max(0, (event.totalBudget || 0) - totalSpent);
  const utilizationPct =
    event.totalBudget > 0 ? Math.round((totalSpent / event.totalBudget) * 1000) / 10 : 0;

  const completedTasks = tasks.filter((t) => t.status === 'Completed').length;
  const pendingTasks = tasks.filter((t) => t.status !== 'Completed');
  const highPriorityPending = pendingTasks.filter((t) => t.priority === 'High');

  const confirmedGuests = guests
    .filter((g) => g.rsvpStatus === 'Attending')
    .reduce((sum, g) => sum + (Number(g.attendanceCount) || 1), 0);

  const bookedVendors = vendors.filter(
    (v) => v.bookingStatus === 'Advance Paid' || v.bookingStatus === 'Fully Paid'
  );

  return {
    totalSpent,
    remainingBudget,
    utilizationPct,
    completedTasks,
    totalTasks: tasks.length,
    pendingTasksCount: pendingTasks.length,
    highPriorityPendingCount: highPriorityPending.length,
    confirmedGuests,
    totalInvitedRecords: guests.length,
    bookedVendorsCount: bookedVendors.length,
    totalVendorsCount: vendors.length,
  };
}

/**
 * Generates contextual proposed 1-click actions based on user message and event state
 */
export function deriveContextualActions(
  message: string,
  event: EventData
): ProposedCopilotAction[] {
  const m = message.toLowerCase();
  const actions: ProposedCopilotAction[] = [];
  const currency = event.currency || 'INR';

  if (m.includes('task') || m.includes('checklist') || m.includes('this week') || m.includes('schedule') || m.includes('timeline')) {
    actions.push({
      id: `act_task_${Date.now()}_1`,
      type: 'add_task',
      label: 'Add Task: Finalize Vendor Service SLA & Power Backup',
      description: 'High Priority • Venue & Operations • Due in 7 days',
      payload: {
        title: 'Finalize Vendor Service SLA & Power Backup',
        category: 'Venue',
        dueDate: event.startDate,
        priority: 'High',
        status: 'Not Started',
        notes: `Created by Eventora Copilot for ${event.name}`,
      },
    });
  }

  if (m.includes('cater') || m.includes('food') || m.includes('menu') || m.includes('tasting')) {
    actions.push({
      id: `act_task_cat_${Date.now()}`,
      type: 'add_task',
      label: 'Add Task: Conduct Menu Tasting & Lock Per-Plate Cap',
      description: `High Priority • Food and catering • Target ${event.guestCount} guests`,
      payload: {
        title: `Conduct Menu Tasting & Lock Per-Plate Cap (${event.guestCount} guests)`,
        category: 'Food and catering',
        dueDate: event.startDate,
        priority: 'High',
        status: 'Not Started',
        notes: 'Confirm live counters, Jain/Vegan counters, and 10% buffer plate rate.',
      },
    });
  }

  if (m.includes('budget') || m.includes('reduce') || m.includes('expense') || m.includes('spend') || m.includes('cost')) {
    const reserveAmt = Math.round((event.totalBudget || 500000) * 0.03);
    actions.push({
      id: `act_exp_${Date.now()}`,
      type: 'add_expense',
      label: `Log Contingency Hold (${currency} ${reserveAmt.toLocaleString()})`,
      description: 'Records an earmarked buffer entry under Emergency contingency',
      payload: {
        title: 'Logistics & Weather Buffer Reserve',
        category: 'Emergency contingency',
        amount: reserveAmt,
        vendorName: 'Eventora Treasury Reserve',
        paymentStatus: 'Pending',
        date: new Date().toISOString().split('T')[0],
        notes: 'Recommended buffer locked via Copilot financial audit.',
      },
    });
  }

  if (m.includes('decor') || m.includes('theme') || m.includes('flower') || m.includes('lighting')) {
    actions.push({
      id: `act_vendor_decor_${Date.now()}`,
      type: 'add_vendor',
      label: `Shortlist Vendor: ${event.theme} Floral & Lighting Studio`,
      description: `Decoration • Estimated ${currency} ${Math.round((event.totalBudget || 500000) * 0.1).toLocaleString()}`,
      payload: {
        name: `${event.city} ${event.theme} Bespoke Decor Studio`,
        category: 'Decoration',
        contactPerson: 'Lead Production Designer',
        phone: '+91 98201 44510',
        email: 'studio@bespokedecor.in',
        estimatedCost: Math.round((event.totalBudget || 500000) * 0.1),
        finalCost: Math.round((event.totalBudget || 500000) * 0.09),
        bookingStatus: 'Evaluating',
        notes: `Matches ${event.theme} aesthetic with indigenous blooms and warm LED washes.`,
      },
    });
  }

  if (m.includes('run-sheet') || m.includes('itinerary') || m.includes('cue') || m.includes('weather') || m.includes('rain')) {
    actions.push({
      id: `act_sched_${Date.now()}`,
      type: 'add_schedule',
      label: 'Append Cue: 15:30 Soundcheck & Weather Protocol Briefing',
      description: 'Adds a 30-min technical & contingency cue to the Event Day Master Run-sheet',
      payload: {
        time: '15:30 - 16:00',
        activity: 'All-Vendor Soundcheck & Weather Protocol Briefing',
        notes: 'Verify generator switchover, acoustic levels, and covered walkway readiness.',
      },
    });
  }

  // Always provide at least one helpful action if none matched specifically
  if (actions.length === 0) {
    actions.push({
      id: `act_default_${Date.now()}`,
      type: 'add_task',
      label: `Add Milestone: Follow up on "${message.slice(0, 32)}${message.length > 32 ? '...' : ''}"`,
      description: 'Medium Priority • Action item added to Event Timeline',
      payload: {
        title: `Action Item: ${message.slice(0, 48)}`,
        category: 'Planning',
        dueDate: event.startDate,
        priority: 'Medium',
        status: 'Not Started',
        notes: `Logged from Eventora Copilot conversation.`,
      },
    });
  }

  return actions;
}
