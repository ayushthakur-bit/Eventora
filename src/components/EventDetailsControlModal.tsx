import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Calendar,
  MapPin,
  Users,
  Wallet,
  Palette,
  CheckCircle2,
  SlidersHorizontal,
  Shield,
  Building,
} from 'lucide-react';
import { useEvents } from '../context/EventContext';
import {
  EventData,
  EventType,
  ThemeType,
  BudgetFlexibility,
  VenueType,
  CurrencyCode,
} from '../types';
import { formatCurrency } from '../utils/budgetCalculations';

interface EventDetailsControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId?: string | null;
}

const EVENT_TYPES: EventType[] = [
  'Wedding',
  'Birthday',
  'Anniversary',
  'College Event',
  'Community Event',
  'Corporate Event',
  'Custom',
];

const THEME_OPTIONS: ThemeType[] = [
  'Elegant',
  'Traditional',
  'Minimal',
  'Luxury',
  'Rustic',
  'Colorful',
  'Cultural',
  'Custom',
];

const CURRENCIES: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: 'INR', label: 'INR — Indian Rupee', symbol: '₹' },
  { code: 'USD', label: 'USD — US Dollar', symbol: '$' },
  { code: 'EUR', label: 'EUR — Euro', symbol: '€' },
  { code: 'GBP', label: 'GBP — British Pound', symbol: '£' },
  { code: 'AED', label: 'AED — UAE Dirham', symbol: 'AED' },
];

const SPENDING_CATEGORIES = [
  'Venue',
  'Food and catering',
  'Decoration',
  'Photography and videography',
  'Entertainment',
  'Invitations and stationery',
  'Transportation',
  'Accommodation',
  'Emergency contingency',
];

const PRESET_COLOR_PALETTES = [
  { name: 'Royal Gold & Navy', colors: ['#c5a059', '#1e293b', '#f8fafc'] },
  { name: 'Burgundy & Blush', colors: ['#881337', '#f43f5e', '#fff1f2'] },
  { name: 'Emerald & Champagne', colors: ['#065f46', '#d97706', '#fef3c7'] },
  { name: 'Lavender & Violet', colors: ['#7c3aed', '#c4b5fd', '#f5f3ff'] },
  { name: 'Rustic Terracotta & Sage', colors: ['#9a3412', '#65a30d', '#fefce8'] },
  { name: 'Pastel Rose & Sky', colors: ['#f472b6', '#38bdf8', '#f0f9ff'] },
];

const COMMON_FOOD_OPTIONS = [
  'Multi-cuisine buffet',
  'Plated fine dining',
  'Traditional vegetarian feast',
  'Live food counters & street food',
  'Cocktail appetizers & finger foods',
  'Jain & vegan counters',
  'Dessert & mocktail bar',
];

const COMMON_ENTERTAINMENT_OPTIONS = [
  'Live acoustic band',
  'High-energy DJ & dance floor',
  'Cultural folk performance',
  'Interactive Emcee & games',
  'Photo booth & 360 glam cam',
  'Ambient instrumentalist (Sax/Violin)',
  'Celebrity or guest artist performance',
];

type ControlTabId = 'basics' | 'budget' | 'style' | 'advanced';
type EventStatusOption = 'Planning' | 'Confirmed' | 'Archived' | 'Completed';

export const EventDetailsControlModal: React.FC<EventDetailsControlModalProps> = ({
  isOpen,
  onClose,
  eventId,
}) => {
  const { events, activeEventId, updateEvent } = useEvents();

  // Find target event: explicit valid ID or currently active event or first available event
  const targetId = typeof eventId === 'string' && eventId ? eventId : activeEventId;
  const targetEvent = events.find((e) => e.id === targetId) || events[0] || null;

  // Tab State
  const [activeTab, setActiveTab] = useState<ControlTabId>('basics');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState<EventType>('Wedding');
  const [status, setStatus] = useState<EventStatusOption>('Planning');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [city, setCity] = useState('');
  const [venuePreference, setVenuePreference] = useState('');
  const [venueType, setVenueType] = useState<VenueType>('Mixed');
  const [guestCount, setGuestCount] = useState(100);

  // Financials
  const [totalBudget, setTotalBudget] = useState(500000);
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [budgetFlexibility, setBudgetFlexibility] = useState<BudgetFlexibility>('Moderate');
  const [spendingPriorities, setSpendingPriorities] = useState<string[]>([]);
  const [costSavingCategories, setCostSavingCategories] = useState<string[]>([]);
  const [reproportionPlan, setReproportionPlan] = useState(true);

  // Style & Logistics
  const [theme, setTheme] = useState<ThemeType>('Elegant');
  const [preferredColors, setPreferredColors] = useState<string[]>([]);
  const [customColor, setCustomColor] = useState('');
  const [foodPreferences, setFoodPreferences] = useState<string[]>([]);
  const [customFood, setCustomFood] = useState('');
  const [entertainmentPreferences, setEntertainmentPreferences] = useState<string[]>([]);
  const [customEntertainment, setCustomEntertainment] = useState('');
  const [accessibilityRequirements, setAccessibilityRequirements] = useState('');
  const [culturalPreferences, setCulturalPreferences] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  // Populate state when target event changes or modal opens
  useEffect(() => {
    if (targetEvent) {
      setName(targetEvent.name || '');
      setEventType(targetEvent.eventType || 'Wedding');
      setStatus(targetEvent.status || 'Planning');
      setStartDate(targetEvent.startDate || '');
      setEndDate(targetEvent.endDate || '');
      setCity(targetEvent.city || '');
      setVenuePreference(targetEvent.venuePreference || '');
      setVenueType(targetEvent.venueType || 'Mixed');
      setGuestCount(targetEvent.guestCount || 100);

      setTotalBudget(targetEvent.totalBudget || 500000);
      setCurrency(targetEvent.currency || 'INR');
      setBudgetFlexibility(targetEvent.budgetFlexibility || 'Moderate');
      setSpendingPriorities(targetEvent.spendingPriorities || []);
      setCostSavingCategories(targetEvent.costSavingCategories || []);

      setTheme(targetEvent.theme || 'Elegant');
      setPreferredColors(targetEvent.preferredColors || ['Gold', 'Navy']);
      setFoodPreferences(targetEvent.foodPreferences || ['Multi-cuisine buffet']);
      setEntertainmentPreferences(targetEvent.entertainmentPreferences || ['Live music']);
      setAccessibilityRequirements(targetEvent.accessibilityRequirements || '');
      setCulturalPreferences(targetEvent.culturalPreferences || '');
      setAdditionalInstructions(targetEvent.additionalInstructions || '');
    }
  }, [targetEvent, isOpen]);

  if (!isOpen || !targetEvent) return null;

  // Toggle helper for arrays
  const toggleArrayItem = (list: string[], item: string, setter: (val: string[]) => void) => {
    if (list.includes(item)) {
      setter(list.filter((x) => x !== item));
    } else {
      setter([...list, item]);
    }
  };

  const handleAddCustomColor = () => {
    if (customColor.trim() && !preferredColors.includes(customColor.trim())) {
      setPreferredColors([...preferredColors, customColor.trim()]);
      setCustomColor('');
    }
  };

  const handleAddCustomFood = () => {
    if (customFood.trim() && !foodPreferences.includes(customFood.trim())) {
      setFoodPreferences([...foodPreferences, customFood.trim()]);
      setCustomFood('');
    }
  };

  const handleAddCustomEntertainment = () => {
    if (customEntertainment.trim() && !entertainmentPreferences.includes(customEntertainment.trim())) {
      setEntertainmentPreferences([...entertainmentPreferences, customEntertainment.trim()]);
      setCustomEntertainment('');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const updates: Partial<EventData> = {
      name: name.trim() || 'Untitled Event',
      eventType,
      status,
      startDate,
      endDate: endDate || undefined,
      city: city.trim(),
      venuePreference: venuePreference.trim(),
      venueType,
      guestCount: Math.max(1, Number(guestCount) || 1),
      totalBudget: Math.max(0, Number(totalBudget) || 0),
      currency,
      budgetFlexibility,
      spendingPriorities,
      costSavingCategories,
      theme,
      preferredColors,
      foodPreferences,
      entertainmentPreferences,
      accessibilityRequirements: accessibilityRequirements.trim(),
      culturalPreferences: culturalPreferences.trim(),
      additionalInstructions: additionalInstructions.trim(),
      updatedAt: new Date().toISOString(),
    };

    // If budget changed and user requested reproportioning, scale the plan allocations
    if (reproportionPlan && targetEvent.plan?.budgetBreakdown && targetEvent.totalBudget > 0) {
      const scaleRatio = updates.totalBudget! / targetEvent.totalBudget;
      const updatedBreakdown = targetEvent.plan.budgetBreakdown.map((item) => {
        const newAmt = Math.round(item.amount * scaleRatio);
        return {
          ...item,
          amount: newAmt,
          percentage: updates.totalBudget! > 0 ? Math.round((newAmt / updates.totalBudget!) * 1000) / 10 : 0,
        };
      });
      updates.plan = {
        ...targetEvent.plan,
        budgetBreakdown: updatedBreakdown,
      };
    }

    updateEvent(targetEvent.id, updates);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 900);
  };

  const controlTabs: { id: ControlTabId; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'basics', label: '1. Event & Venue', icon: Calendar },
    { id: 'budget', label: '2. Budget & Priorities', icon: Wallet },
    { id: 'style', label: '3. Theme & Hospitality', icon: Palette },
    { id: 'advanced', label: '4. Status & Notes', icon: Shield },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Control Event Details"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl my-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Control Event Details
                </h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {targetEvent.eventType}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update core parameters, budget limits, venue requirements, and hospitality preferences.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-200 dark:border-slate-800 flex gap-2 overflow-x-auto bg-slate-50/20 dark:bg-slate-900">
          {controlTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {saveSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="font-semibold">Event details updated successfully!</span>
            </div>
          )}

          {/* TAB 1: Basics & Venue */}
          {activeTab === 'basics' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="ctrl-event-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Event Title / Name *
                </label>
                <input
                  id="ctrl-event-name"
                  aria-label="Event Title / Name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Ananya & Rahul's Royal Wedding"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ctrl-event-type" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Event Type
                  </label>
                  <select
                    id="ctrl-event-type"
                    aria-label="Event Type"
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as EventType)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t} value={t} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="ctrl-event-status" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Current Event Status
                  </label>
                  <select
                    id="ctrl-event-status"
                    aria-label="Current Event Status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as EventStatusOption)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Planning" className="bg-white dark:bg-slate-800">Planning (In Design)</option>
                    <option value="Confirmed" className="bg-white dark:bg-slate-800">Confirmed (Date & Venue Locked)</option>
                    <option value="Completed" className="bg-white dark:bg-slate-800">Completed (Event Finished)</option>
                    <option value="Archived" className="bg-white dark:bg-slate-800">Archived</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ctrl-start-date" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date *
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="ctrl-start-date"
                      aria-label="Start Date"
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="ctrl-end-date" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    End Date (Optional for multi-day)
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="ctrl-end-date"
                      aria-label="End Date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="ctrl-city" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    City / Destination *
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="ctrl-city"
                      aria-label="City / Destination"
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Mumbai, Udaipur"
                      className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="ctrl-venue-setting" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Venue Setting
                  </label>
                  <select
                    id="ctrl-venue-setting"
                    aria-label="Venue Setting"
                    value={venueType}
                    onChange={(e) => setVenueType(e.target.value as VenueType)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Indoor" className="bg-white dark:bg-slate-800">Indoor (Banquet / Hall)</option>
                    <option value="Outdoor" className="bg-white dark:bg-slate-800">Outdoor (Lawn / Beach / Garden)</option>
                    <option value="Mixed" className="bg-white dark:bg-slate-800">Mixed (Indoor & Outdoor)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="ctrl-guest-count" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expected Guests *
                  </label>
                  <div className="relative">
                    <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="ctrl-guest-count"
                      aria-label="Expected Guests"
                      type="number"
                      min={1}
                      max={100000}
                      required
                      value={guestCount}
                      onChange={(e) => setGuestCount(Number(e.target.value))}
                      className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="ctrl-venue-pref" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Specific Venue Preference / Address
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    id="ctrl-venue-pref"
                    aria-label="Specific Venue Preference / Address"
                    type="text"
                    value={venuePreference}
                    onChange={(e) => setVenuePreference(e.target.value)}
                    placeholder="e.g. Taj Lands End Banquet, Bandra or Heritage Palace Lawn"
                    className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Budget & Financial Controls */}
          {activeTab === 'budget' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="ctrl-total-budget" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Total Planned Budget *
                  </label>
                  <div className="relative">
                    <Wallet className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="ctrl-total-budget"
                      aria-label="Total Planned Budget"
                      type="number"
                      min={1000}
                      step={1000}
                      required
                      value={totalBudget}
                      onChange={(e) => setTotalBudget(Number(e.target.value))}
                      className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Display: {formatCurrency(totalBudget, currency)}
                  </p>
                </div>

                <div>
                  <label htmlFor="ctrl-currency" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Currency
                  </label>
                  <select
                    id="ctrl-currency"
                    aria-label="Currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code} className="bg-white dark:bg-slate-800">
                        {c.code} ({c.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Budget Flexibility
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(['Strict', 'Moderate', 'Flexible'] as BudgetFlexibility[]).map((flex) => (
                    <button
                      key={flex}
                      type="button"
                      onClick={() => setBudgetFlexibility(flex)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                        budgetFlexibility === flex
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {flex}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reproportion plan toggle */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="reproportion"
                  aria-label="Auto-rebalance AI Plan Budget Allocations"
                  checked={reproportionPlan}
                  onChange={(e) => setReproportionPlan(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="reproportion" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <span className="font-semibold block text-indigo-900 dark:text-indigo-300">
                    Auto-rebalance AI Plan Budget Allocations
                  </span>
                  Proportionally adjust existing category allocations (Venue, Catering, Decor, etc.) if the total budget is modified.
                </label>
              </div>

              {/* Spending Priorities */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Top Spending Priorities (Protected from cuts)
                </label>
                <div className="flex flex-wrap gap-2">
                  {SPENDING_CATEGORIES.map((cat) => {
                    const isSelected = spendingPriorities.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleArrayItem(spendingPriorities, cat, setSpendingPriorities)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '} {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cost Saving Categories */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Target Categories to Save Money / Cut Costs
                </label>
                <div className="flex flex-wrap gap-2">
                  {SPENDING_CATEGORIES.map((cat) => {
                    const isSelected = costSavingCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleArrayItem(costSavingCategories, cat, setCostSavingCategories)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {isSelected ? '✓ Save on ' : '+ '} {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Theme, Colors & Hospitality */}
          {activeTab === 'style' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Event Theme & Aesthetics
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {THEME_OPTIONS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTheme(t)}
                      className={`p-2 rounded-xl border text-xs font-medium text-center transition-all ${
                        theme === t
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Palettes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Preset Color Palettes
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PRESET_COLOR_PALETTES.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setPreferredColors(preset.colors)}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 text-left transition-all flex items-center justify-between"
                    >
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                        {preset.name}
                      </span>
                      <div className="flex -space-x-1 shrink-0">
                        {preset.colors.map((c, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 rounded-full border border-white dark:border-slate-900 shadow-xs"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <input
                    id="ctrl-custom-color"
                    aria-label="Add custom color"
                    type="text"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    placeholder="Add custom color (e.g. Sage Green or #4b5563)"
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomColor}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Add
                  </button>
                </div>

                {preferredColors.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-[11px] text-slate-400">Active Colors:</span>
                    {preferredColors.map((col, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-slate-300"
                          style={{ backgroundColor: col.startsWith('#') ? col : undefined }}
                        />
                        {col}
                        <button
                          type="button"
                          aria-label={`Remove color ${col}`}
                          onClick={() => setPreferredColors(preferredColors.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-red-500 ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Food & Catering */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Food & Catering Style
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {COMMON_FOOD_OPTIONS.map((opt) => {
                    const isSelected = foodPreferences.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleArrayItem(foodPreferences, opt, setFoodPreferences)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '} {opt}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="ctrl-custom-food"
                    aria-label="Add custom dietary requirement or dish"
                    type="text"
                    value={customFood}
                    onChange={(e) => setCustomFood(e.target.value)}
                    placeholder="Add custom dietary requirement or dish"
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomFood}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Entertainment */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Entertainment & Engagement
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {COMMON_ENTERTAINMENT_OPTIONS.map((opt) => {
                    const isSelected = entertainmentPreferences.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleArrayItem(entertainmentPreferences, opt, setEntertainmentPreferences)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                          isSelected
                            ? 'bg-violet-600 border-violet-600 text-white'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '} {opt}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="ctrl-custom-entertainment"
                    aria-label="Add custom performance or activity"
                    type="text"
                    value={customEntertainment}
                    onChange={(e) => setCustomEntertainment(e.target.value)}
                    placeholder="Add custom performance or activity"
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomEntertainment}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Status, Accessibility & Advanced Notes */}
          {activeTab === 'advanced' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="ctrl-accessibility" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Accessibility & Guest Comfort Requirements
                </label>
                <textarea
                  id="ctrl-accessibility"
                  aria-label="Accessibility & Guest Comfort Requirements"
                  rows={2}
                  value={accessibilityRequirements}
                  onChange={(e) => setAccessibilityRequirements(e.target.value)}
                  placeholder="e.g. Wheelchair ramps for stage, dedicated senior citizen lounge, quiet nursery room."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="ctrl-cultural" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cultural, Religious or Regional Traditions
                </label>
                <textarea
                  id="ctrl-cultural"
                  aria-label="Cultural, Religious or Regional Traditions"
                  rows={2}
                  value={culturalPreferences}
                  onChange={(e) => setCulturalPreferences(e.target.value)}
                  placeholder="e.g. Traditional Gujarati Garba evening, Haldi ceremony floral decor, Tea ceremony."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="ctrl-additional-notes" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Additional Notes & Operational Instructions
                </label>
                <textarea
                  id="ctrl-additional-notes"
                  aria-label="Additional Notes & Operational Instructions"
                  rows={3}
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  placeholder="Any specific vendor contact details, gate pass rules, surprise elements, or curfew limits."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/25 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Save className="w-4 h-4" />
              <span>Save & Update Event</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
