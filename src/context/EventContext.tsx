import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  EventData,
  EventPlan,
  EventTask,
  EventExpense,
  EventVendor,
  EventGuest,
  WhatIfSimulationResult,
  BudgetItemAllocation,
  TimelineScheduleItem,
} from '../types';
import { validateDatabaseBackup, DatabaseBackup } from '../utils/data-management';
import { parseGuestsFromCsv, formatGuestsToCsv } from '../utils/event-plan-engine';
import {
  INITIAL_EVENTS,
  INITIAL_TASKS,
  INITIAL_EXPENSES,
  INITIAL_VENDORS,
  INITIAL_GUESTS,
} from '../data/seedData';
import {
  UserWorkspaceData,
  SavedInvitationState,
  loadUserWorkspace,
  saveUserWorkspace,
  DEMO_USER_ID,
} from '../utils/user-workspace';
import { useAuth } from './AuthContext';

export interface PlanBackupSnapshot {
  event: EventData;
  plan: EventPlan;
}

interface EventContextType {
  events: EventData[];
  activeEventId: string | null;
  activeEvent: EventData | null;
  tasks: EventTask[];
  expenses: EventExpense[];
  vendors: EventVendor[];
  guests: EventGuest[];
  setActiveEventId: (id: string | null) => void;
  createEvent: (data: Partial<EventData>) => Promise<EventData>;
  updateEvent: (id: string, updates: Partial<EventData>) => void;
  deleteEvent: (id: string) => void;
  duplicateEvent: (id: string) => void;
  archiveEvent: (id: string) => void;
  // Tasks
  addTask: (task: Omit<EventTask, 'id' | 'eventId'>) => void;
  updateTask: (id: string, updates: Partial<EventTask>) => void;
  deleteTask: (id: string) => void;
  toggleTaskStatus: (id: string) => void;
  // Expenses
  addExpense: (expense: Omit<EventExpense, 'id' | 'eventId'>) => void;
  updateExpense: (id: string, updates: Partial<EventExpense>) => void;
  deleteExpense: (id: string) => void;
  // Vendors
  addVendor: (vendor: Omit<EventVendor, 'id' | 'eventId'>) => void;
  updateVendor: (id: string, updates: Partial<EventVendor>) => void;
  deleteVendor: (id: string) => void;
  // Guests
  addGuest: (guest: Omit<EventGuest, 'id' | 'eventId'>) => void;
  updateGuest: (id: string, updates: Partial<EventGuest>) => void;
  deleteGuest: (id: string) => void;
  importGuestsFromCsv: (csvContent: string) => number;
  exportGuestsToCsv: () => string;
  // Invitations per event
  getSavedInvitation: (eventId: string) => SavedInvitationState | null;
  saveEventInvitation: (eventId: string, state: SavedInvitationState) => void;
  // Complete lists across all events of the active user
  allTasks: EventTask[];
  allExpenses: EventExpense[];
  allVendors: EventVendor[];
  allGuests: EventGuest[];
  // Data management operations
  importFullDatabase: (backupData: unknown) => { success: boolean; count: number; error?: string };
  exportFullDatabase: () => string;
  resetDatabaseToDefaults: () => void;
  seedSampleBlueprint: (presetKey: 'wedding' | 'corporate' | 'anniversary' | 'birthday') => EventData;
  bulkDeleteEvents: (ids: string[]) => void;
  bulkUpdateEventStatus: (ids: string[], status: EventData['status']) => void;
  updateEventRawJson: (id: string, jsonString: string) => { success: boolean; error?: string };
  updateBudgetAllocations: (eventId: string, allocations: BudgetItemAllocation[]) => void;
  updateEventDaySchedule: (eventId: string, schedule: TimelineScheduleItem[]) => void;
  // What-If
  applyWhatIfResult: (result: WhatIfSimulationResult) => void;
  undoPlanChange: () => void;
  previousPlanBackup: PlanBackupSnapshot | null;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

const DEFAULT_DEMO_SEED = {
  events: INITIAL_EVENTS,
  tasks: INITIAL_TASKS,
  expenses: INITIAL_EXPENSES,
  vendors: INITIAL_VENDORS,
  guests: INITIAL_GUESTS,
};

export const EventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const activeUserId = currentUser?.id || 'usr_guest';

  const [workspace, setWorkspace] = useState<UserWorkspaceData>(() =>
    loadUserWorkspace(localStorage, activeUserId, DEFAULT_DEMO_SEED)
  );

  const [previousPlanBackup, setPreviousPlanBackup] = useState<PlanBackupSnapshot | null>(null);

  // When currentUser changes (login, signup, switch account, logout), load that user's isolated workspace
  useEffect(() => {
    const loaded = loadUserWorkspace(localStorage, activeUserId, DEFAULT_DEMO_SEED);
    setWorkspace(loaded);
    setPreviousPlanBackup(null);
  }, [activeUserId]);

  // Ensure even on the synchronous render frame of an account switch, we read the active user's workspace
  const currentWorkspace =
    workspace.userId === activeUserId
      ? workspace
      : loadUserWorkspace(localStorage, activeUserId, DEFAULT_DEMO_SEED);

  const updateWorkspace = useCallback(
    (updater: (prev: UserWorkspaceData) => UserWorkspaceData) => {
      setWorkspace((prev) => {
        const base =
          prev.userId === activeUserId
            ? prev
            : loadUserWorkspace(localStorage, activeUserId, DEFAULT_DEMO_SEED);
        const next = updater(base);
        const stamped: UserWorkspaceData = {
          ...next,
          userId: activeUserId,
          updatedAt: new Date().toISOString(),
        };
        saveUserWorkspace(localStorage, activeUserId, stamped);
        return stamped;
      });
    },
    [activeUserId]
  );

  const { events, activeEventId, tasks, expenses, vendors, guests, invitations } = currentWorkspace;

  const setActiveEventId = (id: string | null) => {
    updateWorkspace((prev) => ({
      ...prev,
      activeEventId: id,
    }));
  };

  const activeEvent = events.find((e) => e.id === activeEventId) || null;
  const currentTasks = tasks.filter((t) => t.eventId === activeEventId);
  const currentExpenses = expenses.filter((e) => e.eventId === activeEventId);
  const currentVendors = vendors.filter((v) => v.eventId === activeEventId);
  const currentGuests = guests.filter((g) => g.eventId === activeEventId);

  const createEvent = async (data: Partial<EventData>): Promise<EventData> => {
    const newId = `evt_${Date.now()}`;
    const newEvent: EventData = {
      id: newId,
      userId: activeUserId,
      name: data.name || 'Untitled Celebration',
      eventType: data.eventType || 'Wedding',
      startDate: data.startDate || new Date().toISOString().split('T')[0],
      endDate: data.endDate,
      city: data.city || 'Mumbai',
      venuePreference: data.venuePreference || '',
      venueType: data.venueType || 'Mixed',
      guestCount: data.guestCount || 100,
      totalBudget: data.totalBudget || 500000,
      currency: data.currency || 'INR',
      budgetFlexibility: data.budgetFlexibility || 'Moderate',
      spendingPriorities: data.spendingPriorities || ['Venue', 'Food and catering'],
      costSavingCategories: data.costSavingCategories || [],
      theme: data.theme || 'Elegant',
      preferredColors: data.preferredColors || ['Gold', 'Burgundy'],
      foodPreferences: data.foodPreferences || ['Multi-cuisine buffet'],
      entertainmentPreferences: data.entertainmentPreferences || ['Live music'],
      accessibilityRequirements: data.accessibilityRequirements || '',
      culturalPreferences: data.culturalPreferences || '',
      additionalInstructions: data.additionalInstructions || '',
      status: 'Planning',
      plan: data.plan,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const generatedTasks: EventTask[] = newEvent.plan?.timeline?.preEventTasks
      ? newEvent.plan.timeline.preEventTasks.map((t) => ({
          id: `tsk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          eventId: newId,
          title: t.title,
          description: t.description,
          dueDate: t.dueDate || newEvent.startDate,
          priority: t.priority,
          status: 'Not Started',
          category: t.category,
          remindersEnabled: true,
        }))
      : [];

    updateWorkspace((prev) => ({
      ...prev,
      events: [newEvent, ...prev.events],
      activeEventId: newId,
      tasks: [...prev.tasks, ...generatedTasks],
    }));

    return newEvent;
  };

  const updateEvent = (id: string, updates: Partial<EventData>) => {
    updateWorkspace((prev) => ({
      ...prev,
      events: prev.events.map((evt) =>
        evt.id === id ? { ...evt, ...updates, updatedAt: new Date().toISOString() } : evt
      ),
    }));
  };

  const deleteEvent = (id: string) => {
    updateWorkspace((prev) => {
      const remainingEvents = prev.events.filter((e) => e.id !== id);
      const nextActiveId =
        prev.activeEventId === id ? remainingEvents[0]?.id || null : prev.activeEventId;
      const nextInvitations = { ...prev.invitations };
      delete nextInvitations[id];

      return {
        ...prev,
        events: remainingEvents,
        activeEventId: nextActiveId,
        tasks: prev.tasks.filter((t) => t.eventId !== id),
        expenses: prev.expenses.filter((e) => e.eventId !== id),
        vendors: prev.vendors.filter((v) => v.eventId !== id),
        guests: prev.guests.filter((g) => g.eventId !== id),
        invitations: nextInvitations,
      };
    });
  };

  const duplicateEvent = (id: string) => {
    const target = events.find((e) => e.id === id);
    if (!target) return;
    const dupId = `evt_copy_${Date.now()}`;
    const duplicated: EventData = {
      ...target,
      id: dupId,
      userId: activeUserId,
      name: `${target.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateWorkspace((prev) => ({
      ...prev,
      events: [duplicated, ...prev.events],
      activeEventId: dupId,
    }));
  };

  const archiveEvent = (id: string) => {
    updateEvent(id, { status: 'Archived' });
  };

  // Task actions
  const addTask = (taskData: Omit<EventTask, 'id' | 'eventId'>) => {
    if (!activeEventId) return;
    const newTask: EventTask = {
      ...taskData,
      id: `tsk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      eventId: activeEventId,
    };
    updateWorkspace((prev) => ({
      ...prev,
      tasks: [newTask, ...prev.tasks],
    }));
  };

  const updateTask = (id: string, updates: Partial<EventTask>) => {
    updateWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  };

  const deleteTask = (id: string) => {
    updateWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== id),
    }));
  };

  const toggleTaskStatus = (id: string) => {
    updateWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id !== id) return t;
        const nextStatus = t.status === 'Completed' ? 'Not Started' : 'Completed';
        return { ...t, status: nextStatus };
      }),
    }));
  };

  // Expenses actions
  const addExpense = (expenseData: Omit<EventExpense, 'id' | 'eventId'>) => {
    if (!activeEventId) return;
    const newExpense: EventExpense = {
      ...expenseData,
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      eventId: activeEventId,
    };
    updateWorkspace((prev) => ({
      ...prev,
      expenses: [newExpense, ...prev.expenses],
    }));
  };

  const updateExpense = (id: string, updates: Partial<EventExpense>) => {
    updateWorkspace((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    }));
  };

  const deleteExpense = (id: string) => {
    updateWorkspace((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== id),
    }));
  };

  // Vendor actions
  const addVendor = (vendorData: Omit<EventVendor, 'id' | 'eventId'>) => {
    if (!activeEventId) return;
    const newVendor: EventVendor = {
      ...vendorData,
      id: `vnd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      eventId: activeEventId,
    };
    updateWorkspace((prev) => ({
      ...prev,
      vendors: [newVendor, ...prev.vendors],
    }));
  };

  const updateVendor = (id: string, updates: Partial<EventVendor>) => {
    updateWorkspace((prev) => ({
      ...prev,
      vendors: prev.vendors.map((v) => (v.id === id ? { ...v, ...updates } : v)),
    }));
  };

  const deleteVendor = (id: string) => {
    updateWorkspace((prev) => ({
      ...prev,
      vendors: prev.vendors.filter((v) => v.id !== id),
    }));
  };

  // Guest actions
  const addGuest = (guestData: Omit<EventGuest, 'id' | 'eventId'>) => {
    if (!activeEventId) return;
    const newGuest: EventGuest = {
      ...guestData,
      id: `gst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      eventId: activeEventId,
    };
    updateWorkspace((prev) => ({
      ...prev,
      guests: [newGuest, ...prev.guests],
    }));
  };

  const updateGuest = (id: string, updates: Partial<EventGuest>) => {
    updateWorkspace((prev) => ({
      ...prev,
      guests: prev.guests.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    }));
  };

  const deleteGuest = (id: string) => {
    updateWorkspace((prev) => ({
      ...prev,
      guests: prev.guests.filter((g) => g.id !== id),
    }));
  };

  const importGuestsFromCsv = (csvContent: string): number => {
    if (!activeEventId) return 0;
    const newGuests = parseGuestsFromCsv(csvContent, activeEventId);

    if (newGuests.length > 0) {
      updateWorkspace((prev) => ({
        ...prev,
        guests: [...prev.guests, ...newGuests],
      }));
    }
    return newGuests.length;
  };

  const exportGuestsToCsv = (): string => {
    return formatGuestsToCsv(currentGuests);
  };

  const getSavedInvitation = (eventId: string): SavedInvitationState | null => {
    if (!eventId) return null;
    return invitations?.[eventId] || null;
  };

  const saveEventInvitation = (eventId: string, state: SavedInvitationState) => {
    if (!eventId) return;
    updateWorkspace((prev) => ({
      ...prev,
      invitations: {
        ...(prev.invitations || {}),
        [eventId]: state,
      },
    }));
  };

  // What-If scenario application
  const applyWhatIfResult = (result: WhatIfSimulationResult) => {
    if (!activeEvent || !activeEvent.plan) return;

    setPreviousPlanBackup({
      event: { ...activeEvent },
      plan: JSON.parse(JSON.stringify(activeEvent.plan)),
    });

    const newTotalBudget = result.budgetAdjustments.newBudget || activeEvent.totalBudget;

    const updatedBreakdown = activeEvent.plan.budgetBreakdown.map((item) => {
      const match = result.budgetAdjustments.reallocations.find(
        (r) => r.category.toLowerCase() === item.category.toLowerCase()
      );
      if (match) {
        const percentage = Math.round((match.newAmount / newTotalBudget) * 1000) / 10;
        return {
          ...item,
          amount: match.newAmount,
          percentage,
          reason: match.changeReason || item.reason,
        };
      }
      return item;
    });

    const updatedPlan = {
      ...activeEvent.plan,
      budgetBreakdown: updatedBreakdown,
    };

    const addedTasks: EventTask[] = [];
    if (result.taskModifications && result.taskModifications.length > 0) {
      result.taskModifications.forEach((mod, idx) => {
        if (mod.action === 'add') {
          addedTasks.push({
            id: `tsk_${Date.now()}_${idx}`,
            eventId: activeEvent.id,
            title: mod.taskTitle,
            description: mod.details,
            dueDate: activeEvent.startDate,
            priority: 'High',
            status: 'Not Started',
            category: 'What-If Adjustments',
            remindersEnabled: true,
          });
        }
      });
    }

    updateWorkspace((prev) => ({
      ...prev,
      events: prev.events.map((evt) =>
        evt.id === activeEvent.id
          ? {
              ...evt,
              totalBudget: newTotalBudget,
              plan: updatedPlan,
              updatedAt: new Date().toISOString(),
            }
          : evt
      ),
      tasks: [...addedTasks, ...prev.tasks],
    }));
  };

  const undoPlanChange = () => {
    if (!previousPlanBackup || !activeEvent) return;
    updateEvent(activeEvent.id, {
      totalBudget: previousPlanBackup.event.totalBudget,
      plan: previousPlanBackup.plan,
    });
    setPreviousPlanBackup(null);
  };

  // Data Management System Operations (scoped to current user)
  const importFullDatabase = (
    backupData: unknown
  ): { success: boolean; count: number; error?: string } => {
    const check = validateDatabaseBackup(backupData);
    if (!check.isValid) {
      return { success: false, count: 0, error: check.error || 'Invalid database backup structure' };
    }
    const payload = backupData as DatabaseBackup;
    const stampedEvents = payload.events.map((e) => ({ ...e, userId: activeUserId }));

    updateWorkspace((prev) => ({
      ...prev,
      events: stampedEvents,
      activeEventId: stampedEvents[0]?.id || null,
      tasks: Array.isArray(payload.tasks) ? payload.tasks : prev.tasks,
      expenses: Array.isArray(payload.expenses) ? payload.expenses : prev.expenses,
      vendors: Array.isArray(payload.vendors) ? payload.vendors : prev.vendors,
      guests: Array.isArray(payload.guests) ? payload.guests : prev.guests,
    }));

    return { success: true, count: stampedEvents.length };
  };

  const exportFullDatabase = (): string => {
    const backup: DatabaseBackup = {
      version: '2.4.0',
      exportedAt: new Date().toISOString(),
      source: 'Eventora Data Management System',
      events,
      tasks,
      expenses,
      vendors,
      guests,
    };
    return JSON.stringify(backup, null, 2);
  };

  const resetDatabaseToDefaults = () => {
    if (activeUserId === DEMO_USER_ID) {
      updateWorkspace(() => ({
        userId: activeUserId,
        events: INITIAL_EVENTS,
        activeEventId: INITIAL_EVENTS[0]?.id || null,
        tasks: INITIAL_TASKS,
        expenses: INITIAL_EXPENSES,
        vendors: INITIAL_VENDORS,
        guests: INITIAL_GUESTS,
        invitations: {},
        updatedAt: new Date().toISOString(),
      }));
    } else {
      updateWorkspace(() => ({
        userId: activeUserId,
        events: [],
        activeEventId: null,
        tasks: [],
        expenses: [],
        vendors: [],
        guests: [],
        invitations: {},
        updatedAt: new Date().toISOString(),
      }));
    }
    localStorage.removeItem('eventease_data_snapshots');
  };

  const seedSampleBlueprint = (
    presetKey: 'wedding' | 'corporate' | 'anniversary' | 'birthday'
  ): EventData => {
    const timestamp = Date.now();
    let newEvent: EventData;

    if (presetKey === 'corporate') {
      newEvent = {
        id: `evt_corp_${timestamp}`,
        userId: activeUserId,
        name: 'Nexus 2026: Global Leadership Summit & Gala',
        eventType: 'Corporate Event',
        startDate: '2026-12-15',
        endDate: '2026-12-16',
        city: 'Bengaluru, Karnataka',
        venuePreference: 'Grand Convention Center & Tech Park Ballroom',
        venueType: 'Indoor',
        guestCount: 350,
        totalBudget: 2400000,
        currency: 'INR',
        budgetFlexibility: 'Strict',
        spendingPriorities: ['Venue', 'Audio Visual & Tech Production', 'Food and catering'],
        costSavingCategories: ['Transportation', 'Printed Materials'],
        theme: 'Minimal',
        preferredColors: ['Slate Blue', 'Silver Metallic', 'Obsidian Black'],
        foodPreferences: ['Executive Continental Lunch Buffet', 'Artisanal Coffee Bar', 'Gala Dinner'],
        entertainmentPreferences: ['Keynote Hologram Stage', 'Jazz Quartet', 'Award Ceremony Production'],
        status: 'Planning',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        plan: {
          overview: {
            summary: 'Two-day corporate innovation summit featuring keynote stages, breakout workshops, and an evening recognition gala dinner.',
            recommendedTheme: 'Clean Enterprise Minimal with Architectural LED Lighting',
            suggestedFormat: 'Day 1: Keynotes & Panel Tracks; Day 2: Innovation Expo & Gala Awards Dinner.',
            recommendations: [
              'Confirm low-latency gigabit fiber backup connection for live-stream broadcasts.',
              'Schedule speaker dry runs on Day 0 between 3 PM and 7 PM.',
            ],
            assumptionsAndMissing: ['Keynote speakers will use own presentation laptops with HDMI/Type-C dongles.'],
          },
          budgetBreakdown: [
            { category: 'Venue', amount: 850000, percentage: 35.4, reason: 'Full 2-day auditorium and breakout hall buyout.' },
            { category: 'Audio Visual & Tech Production', amount: 650000, percentage: 27.1, reason: 'P2.6 LED video wall, digital mixing console, wireless lapel mics.' },
            { category: 'Food and catering', amount: 550000, percentage: 22.9, reason: 'High-tea, executive lunch buffet, and 4-course gala dinner for 350 attendees.' },
            { category: 'Photography and videography', amount: 180000, percentage: 7.5, reason: 'Multi-camera 4K recording, highlight reel, and same-day press photos.' },
            { category: 'Emergency contingency', amount: 170000, percentage: 7.1, reason: 'Hardware spare replacements and technical support overtime.' },
          ],
          timeline: {
            preEventTasks: [],
            eventDaySchedule: [
              { time: '08:30 - 09:30', activity: 'Delegate Registration & Networking Breakfast', notes: 'QR badge scan at hospitality kiosk' },
              { time: '09:30 - 10:45', activity: 'Opening Keynote: Future of Enterprise AI', notes: 'Main Stage A with live translation' },
              { time: '13:00 - 14:15', activity: 'Executive Networking Luncheon', notes: 'Banqueting Hall Level 2' },
              { time: '19:00 - 22:00', activity: 'Leadership Gala Dinner & Excellence Awards', notes: 'Ballroom with live acoustic jazz' },
            ],
            finalDayChecklist: ['Confirm AV tech crew arrival', 'Test lapel microphones', 'Distribute run-sheets'],
          },
          vendorChecklist: [],
          personalizedIdeas: {
            decorationSuggestions: ['Custom fabricated matte acrylic stage lectern with glowing backlit logo'],
            themeAndPalette: ['Midnight Navy', 'Cool Grey', 'Cobalt Accent'],
            foodAndMenuIdeas: ['Live Espresso bar with corporate custom foam art'],
            activitiesAndEntertainment: ['Interactive live polling on giant LED screen'],
            invitationIdeas: ['Digital calendar invite with biometric QR pass'],
            guestExperienceImprovements: ['Dedicated quiet work lounge with charging docks'],
            budgetFriendlyAlternatives: ['Reusable modular stage backdrop rentals'],
          },
          risksAndRecommendations: {
            commonPlanningProblems: ['Badge printing bottle-neck during morning rush'],
            weatherContingency: 'All halls are climate controlled with dual HVAC generators.',
            backupVendorsOrVenues: 'Backup AV switchers on site in master control booth.',
            guestCountChangesAdvice: 'Notify banqueting team of +/- 15 headcount 24h prior.',
            paymentDeadlinesCaution: 'All tech rentals paid 50% advance, 50% upon soundcheck sign-off.',
            accessibilityAndSafety: 'Certified EMT on site; emergency exits clearly designated.',
          },
        },
      };
    } else if (presetKey === 'anniversary') {
      newEvent = {
        id: `evt_anniv_${timestamp}`,
        userId: activeUserId,
        name: '50th Golden Jubilee: Shyam & Shashi Celebration',
        eventType: 'Anniversary',
        startDate: '2026-12-28',
        city: 'New Delhi',
        venuePreference: 'The Imperial Lawn & Glass Gazebo',
        venueType: 'Mixed',
        guestCount: 160,
        totalBudget: 950000,
        currency: 'INR',
        budgetFlexibility: 'Moderate',
        spendingPriorities: ['Food and catering', 'Decoration', 'Photography and videography'],
        costSavingCategories: ['Transportation'],
        theme: 'Luxury',
        preferredColors: ['Vintage Gold', 'Ivory Cream', 'Emerald Velvet'],
        foodPreferences: ['Old Delhi Chaat Delicacies', 'Slow-cooked Mughlai Feast', 'Gourmet Dessert Display'],
        entertainmentPreferences: ['Golden Era Ghazal Trio', 'Family Memory Video Documentary'],
        status: 'Confirmed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        plan: {
          overview: {
            summary: 'A golden jubilee tribute celebrating 50 years of love and family legacy with vintage aesthetics, nostalgic music, and heartwarming speeches.',
            recommendedTheme: 'Classic Vintage Gold Elegance',
            suggestedFormat: 'Evening Celebration with Sunset Vow Renewal, Memory Walkway, and Royal Dinner.',
            recommendations: ['Install a nostalgic Photo Tunnel spanning 1976 to 2026.'],
            assumptionsAndMissing: ['Family slideshow video delivered to AV team 48 hours prior.'],
          },
          budgetBreakdown: [
            { category: 'Venue', amount: 320000, percentage: 33.7, reason: 'Heritage lawn and glass banquet gazebo rental.' },
            { category: 'Food and catering', amount: 310000, percentage: 32.6, reason: 'Curated 5-course heritage royal dinner menu for 160 guests.' },
            { category: 'Decoration', amount: 160000, percentage: 16.8, reason: 'Vintage chandeliers, gold sequin table linens, ivory floral canopies.' },
            { category: 'Photography and videography', amount: 100000, percentage: 10.5, reason: 'Generational family portraiture and heirloom keepsake photobook.' },
            { category: 'Entertainment', amount: 60000, percentage: 6.3, reason: 'Renowned Ghazal singer and acoustic tabla accompaniment.' },
          ],
          timeline: {
            preEventTasks: [],
            eventDaySchedule: [
              { time: '17:30 - 18:15', activity: 'Sunset Champagne & Welcome Drinks in Heritage Lawn', notes: 'Ghazal trio plays golden era melodies' },
              { time: '18:15 - 19:00', activity: '50th Vow Renewal & Family Memory Documentary', notes: 'Main stage with soft spotlight' },
              { time: '19:00 - 20:00', activity: 'Toasts, Cake Cutting & Generational Photos', notes: '4-tier gold-dusted celebration cake' },
              { time: '20:00 - 22:30', activity: 'Royal Buffet Dinner & Interactive Sitar Music', notes: 'Warm indoor gazebo dining' },
            ],
            finalDayChecklist: ['Ensure cake arrives at 16:00', 'Check stage lighting for vow renewal'],
          },
          vendorChecklist: [],
          personalizedIdeas: {
            decorationSuggestions: ['Memory Gallery archway featuring photos from their 1976 wedding day'],
            themeAndPalette: ['Antique Gold', 'French Cream', 'Champagne'],
            foodAndMenuIdeas: ['Signature Cocktail named "Golden 1976" with saffron and cardamom notes'],
            activitiesAndEntertainment: ['Trivia quiz for grandchildren about the couple’s first date'],
            invitationIdeas: ['Gold foiled letterpress card with replica of original wedding invitation'],
            guestExperienceImprovements: ['Personalized velvet keepsake boxes for close relatives'],
            budgetFriendlyAlternatives: ['Silk floral elements blended with natural eucalyptus leaves'],
          },
          risksAndRecommendations: {
            commonPlanningProblems: ['Elderly guests requiring ground floor seating'],
            weatherContingency: 'Glass gazebo is fully covered and heated.',
            backupVendorsOrVenues: 'Backup photographer assistant on standby.',
            guestCountChangesAdvice: 'Direct headcount confirmation 72 hours prior.',
            paymentDeadlinesCaution: 'All settled prior to final dinner toast.',
            accessibilityAndSafety: 'Zero-step entrance ramps for all banquet zones.',
          },
        },
      };
    } else if (presetKey === 'birthday') {
      newEvent = {
        id: `evt_bday_${timestamp}`,
        userId: activeUserId,
        name: 'Aanya’s 30th Birthday: Neon Skyline Bash',
        eventType: 'Birthday',
        startDate: '2026-11-14',
        city: 'Mumbai, Maharashtra',
        venuePreference: 'Aer Rooftop Lounge & Sky Deck',
        venueType: 'Outdoor',
        guestCount: 90,
        totalBudget: 480000,
        currency: 'INR',
        budgetFlexibility: 'Flexible',
        spendingPriorities: ['Food and catering', 'Entertainment', 'Decoration'],
        costSavingCategories: ['Transportation', 'Printed Materials'],
        theme: 'Colorful',
        preferredColors: ['Neon Violet', 'Cyber Teal', 'Electric Pink'],
        foodPreferences: ['Gourmet Sliders & Woodfired Pizza', 'Molecular Cocktail Bar', 'Midnight Gelato'],
        entertainmentPreferences: ['Top House & Afrobeat DJ', 'Neon 360-degree Video Booth'],
        status: 'Planning',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        plan: {
          overview: {
            summary: 'High-energy 30th birthday rooftop party overlooking the Mumbai skyline with custom neon lighting, mixology bar, and DJ.',
            recommendedTheme: 'Cyberpunk Neon Glamour',
            suggestedFormat: 'Sunset Cocktails followed by Night DJ Dance Party and Midnight Cake.',
            recommendations: ['Book rooftop wind guards and secure permit for terrace music until 1:30 AM.'],
            assumptionsAndMissing: ['Strict 21+ entry policy for rooftop bar.'],
          },
          budgetBreakdown: [
            { category: 'Venue', amount: 160000, percentage: 33.3, reason: 'Rooftop minimum spend and skyline terrace cover.' },
            { category: 'Food and catering', amount: 150000, percentage: 31.3, reason: 'Live finger-food passes and unlimited artisanal cocktails for 90 guests.' },
            { category: 'Entertainment', amount: 75000, percentage: 15.6, reason: 'Live DJ console, sound engineering, 360-degree photobooth.' },
            { category: 'Decoration', amount: 55000, percentage: 11.5, reason: 'Custom neon light sign "Aanya in Her 30s", LED cocktail tables.' },
            { category: 'Photography and videography', amount: 40000, percentage: 8.3, reason: 'Nightlife flash photographer and Instagram Reels editor.' },
          ],
          timeline: {
            preEventTasks: [],
            eventDaySchedule: [
              { time: '19:30 - 20:30', activity: 'Sunset Welcome Drinks & Skyline Photos', notes: 'Golden hour twilight DJ set' },
              { time: '20:30 - 22:30', activity: 'Live Mixology & Passed Canapes', notes: 'Glow accessories handed to all guests' },
              { time: '22:30 - 23:00', activity: 'Midnight Cake Cutting with Cold Sparklers', notes: 'Custom neon cake stand' },
              { time: '23:00 - 01:30', activity: 'High Energy Rooftop DJ Dance Party', notes: 'Club sound system active' },
            ],
            finalDayChecklist: ['Verify 360 booth delivery', 'Check sound level permits with venue'],
          },
          vendorChecklist: [],
          personalizedIdeas: {
            decorationSuggestions: ['Glowing neon infinity mirror photobooth with customized neon quote'],
            themeAndPalette: ['Neon Magenta', 'Deep Cyan', 'Midnight Charcoal'],
            foodAndMenuIdeas: ['Liquid nitrogen smoking cocktails served in LED glassware'],
            activitiesAndEntertainment: ['Neon glow face-paint artist for guests'],
            invitationIdeas: ['Animated video invite formatted for Instagram Stories'],
            guestExperienceImprovements: ['Personalized hangover rescue kits for departing guests'],
            budgetFriendlyAlternatives: ['Hire independent mixologist rather than full hotel bar package'],
          },
          risksAndRecommendations: {
            commonPlanningProblems: ['High coastal rooftop winds extinguishing candles'],
            weatherContingency: 'Retractable glass awning closes in 60 seconds.',
            backupVendorsOrVenues: 'Indoor lounge area reserved as immediate backup.',
            guestCountChangesAdvice: 'Minimum spend covers up to 100 people.',
            paymentDeadlinesCaution: 'Bar tab audited hourly with banquet captain.',
            accessibilityAndSafety: 'Dedicated express elevator to rooftop terrace.',
          },
        },
      };
    } else {
      newEvent = {
        id: `evt_wed_${timestamp}`,
        userId: activeUserId,
        name: 'Kabir & Rhea’s Grand Lakeside Wedding',
        eventType: 'Wedding',
        startDate: '2026-11-24',
        city: 'Jaipur, Rajasthan',
        venuePreference: 'Fairmont Palace Gardens & Ballrooms',
        venueType: 'Mixed',
        guestCount: 250,
        totalBudget: 1800000,
        currency: 'INR',
        budgetFlexibility: 'Moderate',
        spendingPriorities: ['Venue', 'Food and catering', 'Decoration'],
        costSavingCategories: ['Transportation'],
        theme: 'Traditional',
        preferredColors: ['Marigold Orange', 'Royal Blue', 'Champagne'],
        foodPreferences: ['Authentic Marwari Feast', 'Live Tandoor & Chaat', 'Continental Counters'],
        entertainmentPreferences: ['Folk Drummers', 'Live Sufi Night Band', 'Bollywood Sangeet DJ'],
        status: 'Planning',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    updateWorkspace((prev) => ({
      ...prev,
      events: [newEvent, ...prev.events],
      activeEventId: newEvent.id,
    }));
    return newEvent;
  };

  const bulkDeleteEvents = (ids: string[]) => {
    const idSet = new Set(ids);
    updateWorkspace((prev) => {
      const remaining = prev.events.filter((e) => !idSet.has(e.id));
      const nextActiveId =
        prev.activeEventId && idSet.has(prev.activeEventId)
          ? remaining[0]?.id || null
          : prev.activeEventId;

      return {
        ...prev,
        events: remaining,
        activeEventId: nextActiveId,
        tasks: prev.tasks.filter((t) => !idSet.has(t.eventId)),
        expenses: prev.expenses.filter((e) => !idSet.has(e.eventId)),
        vendors: prev.vendors.filter((v) => !idSet.has(v.eventId)),
        guests: prev.guests.filter((g) => !idSet.has(g.eventId)),
      };
    });
  };

  const bulkUpdateEventStatus = (ids: string[], status: EventData['status']) => {
    const idSet = new Set(ids);
    updateWorkspace((prev) => ({
      ...prev,
      events: prev.events.map((e) =>
        idSet.has(e.id) ? { ...e, status, updatedAt: new Date().toISOString() } : e
      ),
    }));
  };

  const updateEventRawJson = (
    id: string,
    jsonString: string
  ): { success: boolean; error?: string } => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') {
        return { success: false, error: 'Parsed JSON must be an object.' };
      }
      if (!parsed.name || typeof parsed.totalBudget !== 'number') {
        return { success: false, error: 'Event must have a valid name and numeric totalBudget.' };
      }
      updateEvent(id, { ...parsed, id, userId: activeUserId, updatedAt: new Date().toISOString() });
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown parse error';
      return { success: false, error: `Invalid JSON syntax: ${message}` };
    }
  };

  const updateBudgetAllocations = (
    eventId: string,
    allocations: BudgetItemAllocation[]
  ) => {
    updateWorkspace((prev) => ({
      ...prev,
      events: prev.events.map((evt) => {
        if (evt.id !== eventId) return evt;
        const updatedPlan = evt.plan
          ? { ...evt.plan, budgetBreakdown: allocations }
          : undefined;
        return { ...evt, plan: updatedPlan, updatedAt: new Date().toISOString() };
      }),
    }));
  };

  const updateEventDaySchedule = (
    eventId: string,
    schedule: TimelineScheduleItem[]
  ) => {
    updateWorkspace((prev) => ({
      ...prev,
      events: prev.events.map((evt) => {
        if (evt.id !== eventId) return evt;
        const updatedPlan = evt.plan
          ? {
              ...evt.plan,
              timeline: {
                ...(evt.plan.timeline || { preEventTasks: [], finalDayChecklist: [] }),
                eventDaySchedule: schedule,
              },
            }
          : undefined;
        return { ...evt, plan: updatedPlan, updatedAt: new Date().toISOString() };
      }),
    }));
  };

  return (
    <EventContext.Provider
      value={{
        events,
        activeEventId,
        activeEvent,
        tasks: currentTasks,
        expenses: currentExpenses,
        vendors: currentVendors,
        guests: currentGuests,
        allTasks: tasks,
        allExpenses: expenses,
        allVendors: vendors,
        allGuests: guests,
        setActiveEventId,
        createEvent,
        updateEvent,
        deleteEvent,
        duplicateEvent,
        archiveEvent,
        addTask,
        updateTask,
        deleteTask,
        toggleTaskStatus,
        addExpense,
        updateExpense,
        deleteExpense,
        addVendor,
        updateVendor,
        deleteVendor,
        addGuest,
        updateGuest,
        deleteGuest,
        importGuestsFromCsv,
        exportGuestsToCsv,
        getSavedInvitation,
        saveEventInvitation,
        importFullDatabase,
        exportFullDatabase,
        resetDatabaseToDefaults,
        seedSampleBlueprint,
        bulkDeleteEvents,
        bulkUpdateEventStatus,
        updateEventRawJson,
        updateBudgetAllocations,
        updateEventDaySchedule,
        applyWhatIfResult,
        undoPlanChange,
        previousPlanBackup,
      }}
    >
      {children}
    </EventContext.Provider>
  );
};

export const useEvents = () => {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvents must be used within an EventProvider');
  }
  return context;
};
