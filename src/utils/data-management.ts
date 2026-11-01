import {
  EventData,
  EventExpense,
  EventTask,
  EventVendor,
  EventGuest,
} from '../types';

export interface DatabaseBackup {
  version: string;
  exportedAt: string;
  source: string;
  events: EventData[];
  tasks?: EventTask[];
  expenses?: EventExpense[];
  vendors?: EventVendor[];
  guests?: EventGuest[];
}

export interface DataAuditIssue {
  id: string;
  eventId: string;
  eventName: string;
  severity: 'high' | 'medium' | 'low';
  type: 'budget_mismatch' | 'missing_venue' | 'empty_schedule' | 'unconfirmed_vendors' | 'negative_variance';
  message: string;
  suggestedAction: string;
}

/**
 * Validates whether a parsed object matches the minimum schema of a database backup
 */
export function validateDatabaseBackup(obj: unknown): { isValid: boolean; error?: string } {
  if (!obj || typeof obj !== 'object') {
    return { isValid: false, error: 'Backup data must be a valid JSON object.' };
  }

  const candidate = obj as Record<string, unknown>;

  if (!candidate.events || !Array.isArray(candidate.events)) {
    return { isValid: false, error: 'Backup must contain an "events" array.' };
  }

  for (let i = 0; i < candidate.events.length; i++) {
    const ev = candidate.events[i] as Record<string, unknown>;
    if (!ev || typeof ev !== 'object') {
      return { isValid: false, error: `Event at index ${i} is not a valid object.` };
    }
    if (!ev.id || typeof ev.id !== 'string') {
      return { isValid: false, error: `Event at index ${i} is missing a valid 'id'.` };
    }
    if (!ev.name || typeof ev.name !== 'string') {
      return { isValid: false, error: `Event '${ev.id}' is missing a valid 'name'.` };
    }
    if (typeof ev.totalBudget !== 'number' || isNaN(ev.totalBudget)) {
      return { isValid: false, error: `Event '${ev.name}' must have a numeric totalBudget.` };
    }
  }

  return { isValid: true };
}

/**
 * Performs a comprehensive audit scan on event records to detect operational and financial discrepancies
 */
export function auditEventData(
  events: EventData[],
  expenses: EventExpense[] = [],
  vendors: EventVendor[] = []
): DataAuditIssue[] {
  const issues: DataAuditIssue[] = [];

  events.forEach((ev) => {
    // 1. Check for missing venue
    if (!ev.venuePreference || ev.venuePreference.trim().length === 0) {
      issues.push({
        id: `issue_venue_${ev.id}`,
        eventId: ev.id,
        eventName: ev.name,
        severity: 'medium',
        type: 'missing_venue',
        message: 'No venue or venue preference has been specified for this event.',
        suggestedAction: 'Assign a venue name or preferred location.',
      });
    }

    // 2. Budget vs Expense variance
    const eventExpenses = expenses.filter((e) => e.eventId === ev.id);
    const totalSpent = eventExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    if (totalSpent > ev.totalBudget) {
      const overBy = totalSpent - ev.totalBudget;
      issues.push({
        id: `issue_overspend_${ev.id}`,
        eventId: ev.id,
        eventName: ev.name,
        severity: 'high',
        type: 'negative_variance',
        message: `Total recorded expenses exceed budget limit by ${overBy.toLocaleString()}.`,
        suggestedAction: 'Increase total budget or run What-If cost reallocations.',
      });
    }

    // 3. Allocated budget vs Total Budget mismatch in plan
    if (ev.plan?.budgetBreakdown && ev.plan.budgetBreakdown.length > 0) {
      const allocatedSum = ev.plan.budgetBreakdown.reduce((sum, b) => sum + (b.amount || 0), 0);
      const diff = Math.abs(allocatedSum - ev.totalBudget);
      // Allow minor rounding difference of 10
      if (diff > 10) {
        issues.push({
          id: `issue_alloc_diff_${ev.id}`,
          eventId: ev.id,
          eventName: ev.name,
          severity: 'medium',
          type: 'budget_mismatch',
          message: `Budget allocations sum (${allocatedSum.toLocaleString()}) does not match Total Budget (${ev.totalBudget.toLocaleString()}).`,
          suggestedAction: 'Rebalance allocations to match total target budget.',
        });
      }
    }

    // 4. Missing schedule in plan
    if (
      !ev.plan?.timeline?.eventDaySchedule ||
      ev.plan.timeline.eventDaySchedule.length === 0
    ) {
      issues.push({
        id: `issue_schedule_${ev.id}`,
        eventId: ev.id,
        eventName: ev.name,
        severity: 'low',
        type: 'empty_schedule',
        message: 'Event day timeline schedule is currently empty.',
        suggestedAction: 'Add master run-sheet schedule blocks or generate via AI plan.',
      });
    }

    // 5. Unconfirmed critical vendors
    const eventVendors = vendors.filter((v) => v.eventId === ev.id);
    const evaluatingVendors = eventVendors.filter((v) => v.bookingStatus === 'Evaluating');
    if (evaluatingVendors.length >= 2 && ev.status === 'Confirmed') {
      issues.push({
        id: `issue_vendors_${ev.id}`,
        eventId: ev.id,
        eventName: ev.name,
        severity: 'medium',
        type: 'unconfirmed_vendors',
        message: `${evaluatingVendors.length} vendors are still in 'Evaluating' status while event is marked Confirmed.`,
        suggestedAction: 'Finalize quotes and advance payments for vendors.',
      });
    }
  });

  return issues;
}

/**
 * Filter events based on multi-criteria search
 */
export function filterEvents(
  events: EventData[],
  searchQuery: string,
  typeFilter: string,
  statusFilter: string
): EventData[] {
  const query = searchQuery.trim().toLowerCase();

  return events.filter((ev) => {
    // Search query match
    if (query) {
      const matchName = ev.name.toLowerCase().includes(query);
      const matchCity = ev.city.toLowerCase().includes(query);
      const matchVenue = (ev.venuePreference || '').toLowerCase().includes(query);
      const matchType = ev.eventType.toLowerCase().includes(query);
      if (!matchName && !matchCity && !matchVenue && !matchType) {
        return false;
      }
    }

    // Type match
    if (typeFilter && typeFilter !== 'All') {
      if (ev.eventType !== typeFilter) {
        return false;
      }
    }

    // Status match
    if (statusFilter && statusFilter !== 'All') {
      if (ev.status !== statusFilter) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sanitizes a CSV cell value to prevent CSV Formula Injection (DDE / spreadsheet execution)
 * and properly escapes embedded double quotes.
 */
export function sanitizeCsvCell(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '""';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '0';
  }
  const trimmed = String(value);
  const formulaSafe = /^[=+\-@\t\r]/.test(trimmed) ? `'${trimmed}` : trimmed;
  return `"${formulaSafe.replace(/"/g, '""')}"`;
}

/**
 * Safely parses untrusted JSON while stripping dangerous prototype-pollution keys
 */
export function safeJsonParse<T = unknown>(
  raw: string
): { ok: true; data: T } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'string') {
    return { ok: false, error: 'JSON input must be a non-empty string.' };
  }
  try {
    const parsed = JSON.parse(raw, (key, value) => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return undefined;
      }
      return value;
    }) as T;
    return { ok: true, data: parsed };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Invalid JSON syntax.',
    };
  }
}

/**
 * Computes attendee headcount and dietary metrics for a guest roster
 */
export function computeGuestMetrics(guests: EventGuest[]): {
  totalGuests: number;
  attendingHeads: number;
  pendingHeads: number;
  declinedHeads: number;
  specialDietCount: number;
} {
  let attendingHeads = 0;
  let pendingHeads = 0;
  let declinedHeads = 0;
  let specialDietCount = 0;

  guests.forEach((g) => {
    const heads = Math.max(0, Number(g.attendanceCount) || 0);
    if (g.rsvpStatus === 'Attending') attendingHeads += heads;
    else if (g.rsvpStatus === 'Declined') declinedHeads += heads;
    else pendingHeads += heads;

    if (g.dietaryRequirements && g.dietaryRequirements.trim().length > 0) {
      specialDietCount += 1;
    }
  });

  return {
    totalGuests: guests.length,
    attendingHeads,
    pendingHeads,
    declinedHeads,
    specialDietCount,
  };
}

/**
 * Computes financial summary across an event's vendor contracts
 */
export function computeVendorFinancialSummary(vendors: EventVendor[]): {
  totalQuoted: number;
  totalAdvancePaid: number;
  remainingBalance: number;
  bookedCount: number;
} {
  const totalQuoted = vendors.reduce((sum, v) => sum + (Number(v.quotedAmount) || 0), 0);
  const totalAdvancePaid = vendors.reduce((sum, v) => sum + (Number(v.advancePayment) || 0), 0);
  const remainingBalance = Math.max(0, totalQuoted - totalAdvancePaid);
  const bookedCount = vendors.filter(
    (v) => v.bookingStatus === 'Advance Paid' || v.bookingStatus === 'Fully Paid'
  ).length;

  return {
    totalQuoted,
    totalAdvancePaid,
    remainingBalance,
    bookedCount,
  };
}

/**
 * Export selected events or all events to CSV string
 */
export function exportEventsToCsv(events: EventData[]): string {
  const headers = [
    'Event ID',
    'Event Name',
    'Type',
    'Status',
    'Start Date',
    'City',
    'Venue',
    'Guest Count',
    'Total Budget',
    'Currency',
    'Flexibility',
    'Theme',
    'Created At',
  ];

  const rows = events.map((ev) => [
    sanitizeCsvCell(ev.id),
    sanitizeCsvCell(ev.name),
    sanitizeCsvCell(ev.eventType),
    sanitizeCsvCell(ev.status),
    sanitizeCsvCell(ev.startDate),
    sanitizeCsvCell(ev.city),
    sanitizeCsvCell(ev.venuePreference || ''),
    sanitizeCsvCell(ev.guestCount),
    sanitizeCsvCell(ev.totalBudget),
    sanitizeCsvCell(ev.currency),
    sanitizeCsvCell(ev.budgetFlexibility),
    sanitizeCsvCell(ev.theme),
    sanitizeCsvCell(ev.createdAt),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
