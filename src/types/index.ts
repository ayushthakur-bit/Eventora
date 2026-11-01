export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';

export type EventType =
  | 'Wedding'
  | 'Birthday'
  | 'Anniversary'
  | 'College Event'
  | 'Community Event'
  | 'Corporate Event'
  | 'Custom';

export type ThemeType =
  | 'Elegant'
  | 'Traditional'
  | 'Minimal'
  | 'Luxury'
  | 'Rustic'
  | 'Colorful'
  | 'Cultural'
  | 'Custom';

export type BudgetFlexibility = 'Strict' | 'Moderate' | 'Flexible';
export type VenueType = 'Indoor' | 'Outdoor' | 'Mixed';
export type PriorityLevel = 'High' | 'Medium' | 'Low';
export type TaskStatus = 'Not Started' | 'In Progress' | 'Completed';
export type PaymentStatus = 'Paid' | 'Pending' | 'Advance Paid';
export type VendorStatus = 'Evaluating' | 'Advance Paid' | 'Fully Paid' | 'Cancelled';
export type RSVPStatus = 'Attending' | 'Declined' | 'Pending' | 'Tentative';
export type GuestGroup = 'Family' | 'Friends' | 'Colleagues' | 'VIP' | 'General';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  authProvider?: 'google' | 'email' | 'phone';
  lastLoginAt?: string;
  avatarUrl?: string;
  preferences?: {
    defaultCurrency?: CurrencyCode;
    theme?: 'light' | 'dark' | 'system';
    newsletter?: boolean;
  };
}

export interface BudgetItemAllocation {
  category: string;
  amount: number;
  percentage: number;
  reason: string;
  costSavingTip?: string;
}

export interface TimelineScheduleItem {
  time: string;
  activity: string;
  notes: string;
}

export interface PlanTaskItem {
  id: string;
  title: string;
  description: string;
  timing: string;
  dueDate?: string;
  priority: PriorityLevel;
  dependencies?: string[];
  category: string;
}

export interface PlanVendorChecklistItem {
  id: string;
  category: string;
  whatToLookFor: string;
  questionsToAsk: string[];
  estimatedPriceRange: string;
  bookingDeadline: string;
  status: 'To Contact' | 'Evaluating' | 'Booked' | 'Not Needed';
  notes?: string;
}

export interface EventPlan {
  overview: {
    summary: string;
    recommendedTheme: string;
    suggestedFormat: string;
    recommendations: string[];
    assumptionsAndMissing: string[];
  };
  budgetBreakdown: BudgetItemAllocation[];
  timeline: {
    preEventTasks: PlanTaskItem[];
    eventDaySchedule: TimelineScheduleItem[];
    finalDayChecklist: string[];
  };
  vendorChecklist: PlanVendorChecklistItem[];
  personalizedIdeas: {
    decorationSuggestions: string[];
    themeAndPalette: string[];
    foodAndMenuIdeas: string[];
    activitiesAndEntertainment: string[];
    invitationIdeas: string[];
    guestExperienceImprovements: string[];
    budgetFriendlyAlternatives: string[];
  };
  risksAndRecommendations: {
    commonPlanningProblems: string[];
    weatherContingency: string;
    backupVendorsOrVenues: string;
    guestCountChangesAdvice: string;
    paymentDeadlinesCaution: string;
    accessibilityAndSafety: string;
  };
}

export interface EventData {
  id: string;
  userId: string;
  name: string;
  eventType: EventType;
  startDate: string;
  endDate?: string;
  city: string;
  venuePreference: string;
  venueType: VenueType;
  guestCount: number;
  totalBudget: number;
  currency: CurrencyCode;
  budgetFlexibility: BudgetFlexibility;
  spendingPriorities: string[];
  costSavingCategories: string[];
  theme: ThemeType;
  preferredColors: string[];
  foodPreferences: string[];
  entertainmentPreferences: string[];
  accessibilityRequirements?: string;
  culturalPreferences?: string;
  additionalInstructions?: string;
  status: 'Planning' | 'Confirmed' | 'Archived' | 'Completed';
  plan?: EventPlan;
  createdAt: string;
  updatedAt: string;
}

export interface EventTask {
  id: string;
  eventId: string;
  title: string;
  description?: string;
  dueDate: string;
  priority: PriorityLevel;
  status: TaskStatus;
  category: string;
  remindersEnabled?: boolean;
}

export interface EventExpense {
  id: string;
  eventId: string;
  category: string;
  amount: number;
  date: string;
  vendorName: string;
  paymentStatus: PaymentStatus;
  notes?: string;
}

export interface EventVendor {
  id: string;
  eventId: string;
  businessName: string;
  category: string;
  contactInfo: {
    phone?: string;
    email?: string;
    address?: string;
  };
  quotedAmount: number;
  advancePayment: number;
  remainingPayment: number;
  bookingStatus: VendorStatus;
  contractNotes?: string;
  paymentDueDate?: string;
  rating?: number;
}

export interface EventGuest {
  id: string;
  eventId: string;
  name: string;
  contactInfo?: string;
  rsvpStatus: RSVPStatus;
  group: GuestGroup;
  dietaryRequirements?: string;
  attendanceCount: number;
}

export interface WhatIfSimulationResult {
  query: string;
  impactSummary: string;
  preservedPriorities: string[];
  budgetAdjustments: {
    previousBudget: number;
    newBudget: number;
    difference: number;
    reallocations: Array<{
      category: string;
      oldAmount: number;
      newAmount: number;
      changeReason: string;
    }>;
  };
  taskModifications: Array<{
    action: 'add' | 'modify' | 'remove';
    taskTitle: string;
    details: string;
  }>;
  recommendations: string[];
}
