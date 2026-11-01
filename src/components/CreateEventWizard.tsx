import React, { useState } from 'react';
import {
  X,
  Sparkles,
  AlertCircle,
  Cake,
  Heart,
  Briefcase,
  GraduationCap,
  Users,
  Wand2,
  CalendarHeart,
} from 'lucide-react';
import { EventType, ThemeType, VenueType, BudgetFlexibility, CurrencyCode, EventData } from '../types';
import { useEvents } from '../context/EventContext';

interface CreateEventWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: (event: EventData) => void;
}

interface AutoEventPreset {
  city: string;
  venuePreference: string;
  venueType: VenueType;
  guestCount: number;
  totalBudget: number;
  theme: ThemeType;
  preferredColors: string[];
  foodPreferences: string[];
  entertainmentPreferences: string[];
  spendingPriorities: string[];
  costSavingCategories: string[];
}

const EVENT_PRESETS: Record<EventType, AutoEventPreset> = {
  Wedding: {
    city: 'Udaipur',
    venuePreference: 'Heritage Palace Lawn & Grand Ballroom',
    venueType: 'Mixed',
    guestCount: 250,
    totalBudget: 1500000,
    theme: 'Traditional',
    preferredColors: ['Royal Burgundy', 'Champagne Gold', 'Ivory'],
    foodPreferences: ['Multi-cuisine royal buffet', 'Live chaat & artisanal dessert studio'],
    entertainmentPreferences: ['Live Sufi & folk ensemble', 'Sangeet DJ & choreography'],
    spendingPriorities: ['Venue', 'Food and catering', 'Decoration', 'Photography and videography'],
    costSavingCategories: ['Invitations and stationery'],
  },
  Birthday: {
    city: 'Mumbai',
    venuePreference: 'Rooftop Lounge & Garden Deck',
    venueType: 'Mixed',
    guestCount: 80,
    totalBudget: 200000,
    theme: 'Colorful',
    preferredColors: ['Electric Violet', 'Warm Gold', 'Midnight Blue'],
    foodPreferences: ['Gourmet finger food', 'Custom celebration cake & mocktail bar'],
    entertainmentPreferences: ['Live DJ', 'Interactive photo booth & games'],
    spendingPriorities: ['Food and catering', 'Entertainment', 'Decoration'],
    costSavingCategories: ['Transportation', 'Invitations and stationery'],
  },
  Anniversary: {
    city: 'Jaipur',
    venuePreference: 'Boutique Courtyard & Candlelit Banquet',
    venueType: 'Indoor',
    guestCount: 100,
    totalBudget: 400000,
    theme: 'Elegant',
    preferredColors: ['Emerald Green', 'Champagne Gold', 'Pearl White'],
    foodPreferences: ['Curated sit-down dinner', 'Signature desserts & mocktails'],
    entertainmentPreferences: ['Acoustic live band', 'Memory lane visual projection'],
    spendingPriorities: ['Venue', 'Food and catering', 'Photography and videography'],
    costSavingCategories: ['Transportation'],
  },
  'Corporate Event': {
    city: 'Bengaluru',
    venuePreference: 'Convention Center & Executive Networking Hall',
    venueType: 'Indoor',
    guestCount: 200,
    totalBudget: 650000,
    theme: 'Minimal',
    preferredColors: ['Slate Navy', 'Electric Indigo', 'Crisp White'],
    foodPreferences: ['Executive networking lunch', 'Artisanal coffee & high-tea station'],
    entertainmentPreferences: ['Keynote AV production', 'Evening networking jazz trio'],
    spendingPriorities: ['Venue', 'Food and catering', 'Entertainment'],
    costSavingCategories: ['Decoration'],
  },
  'College Event': {
    city: 'Pune',
    venuePreference: 'Open-Air Amphitheater & Campus Grounds',
    venueType: 'Outdoor',
    guestCount: 400,
    totalBudget: 350000,
    theme: 'Colorful',
    preferredColors: ['Neon Coral', 'Cyber Cyan', 'Deep Violet'],
    foodPreferences: ['Street food festival stalls', 'Energy drinks & quick bites'],
    entertainmentPreferences: ['Battle of bands stage', 'Headliner DJ & concert lighting'],
    spendingPriorities: ['Entertainment', 'Venue', 'Decoration'],
    costSavingCategories: ['Invitations and stationery', 'Transportation'],
  },
  'Community Event': {
    city: 'Delhi NCR',
    venuePreference: 'Cultural Center & Community Lawn',
    venueType: 'Outdoor',
    guestCount: 300,
    totalBudget: 300000,
    theme: 'Cultural',
    preferredColors: ['Marigold Orange', 'Festive Red', 'Warm Cream'],
    foodPreferences: ['Traditional festive feast', 'Refreshment & sweet counters'],
    entertainmentPreferences: ['Cultural dance performances', 'Community games & live emcee'],
    spendingPriorities: ['Food and catering', 'Decoration', 'Entertainment'],
    costSavingCategories: ['Invitations and stationery'],
  },
  Custom: {
    city: 'Mumbai',
    venuePreference: 'Bespoke Studio & Garden Venue',
    venueType: 'Mixed',
    guestCount: 120,
    totalBudget: 450000,
    theme: 'Elegant',
    preferredColors: ['Indigo', 'Champagne', 'Ivory'],
    foodPreferences: ['Chef-curated tasting menu', 'Live beverage bar'],
    entertainmentPreferences: ['Curated live music', 'Immersive ambient lighting'],
    spendingPriorities: ['Venue', 'Food and catering', 'Decoration'],
    costSavingCategories: ['Invitations and stationery'],
  },
};

export const CreateEventWizard: React.FC<CreateEventWizardProps> = ({
  isOpen,
  onClose,
  onEventCreated,
}) => {
  const { createEvent } = useEvents();

  const [name, setName] = useState('');
  const [eventType, setEventType] = useState<EventType>('Wedding');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgressText, setGenerationProgressText] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const eventTypeOptions: { type: EventType; label: string; subtitle: string; icon: React.ReactNode }[] = [
    {
      type: 'Wedding',
      label: 'Wedding',
      subtitle: 'Ceremonies, reception & rituals',
      icon: <Heart className="w-4 h-4" />,
    },
    {
      type: 'Birthday',
      label: 'Birthday',
      subtitle: 'Party, cake, music & celebration',
      icon: <Cake className="w-4 h-4" />,
    },
    {
      type: 'Anniversary',
      label: 'Anniversary',
      subtitle: 'Milestone dinner & celebration',
      icon: <CalendarHeart className="w-4 h-4" />,
    },
    {
      type: 'Corporate Event',
      label: 'Corporate',
      subtitle: 'Summits, galas & launches',
      icon: <Briefcase className="w-4 h-4" />,
    },
    {
      type: 'College Event',
      label: 'College Fest',
      subtitle: 'Cultural fests, concerts & Hackathons',
      icon: <GraduationCap className="w-4 h-4" />,
    },
    {
      type: 'Community Event',
      label: 'Community',
      subtitle: 'Festivals, gatherings & fairs',
      icon: <Users className="w-4 h-4" />,
    },
    {
      type: 'Custom',
      label: 'Custom Event',
      subtitle: 'Any bespoke celebration',
      icon: <Wand2 className="w-4 h-4" />,
    },
  ];

  const handleGeneratePlan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!name.trim()) {
      setError('Please enter your event name to continue.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    const progressMessages = [
      `Understanding your ${eventType.toLowerCase()} vision for "${name.trim()}"...`,
      'Calculating optimal budget allocations & vendor categories...',
      'Building pre-event checklist & minute-by-minute schedule...',
      'Finalizing your complete AI event workspace...',
    ];

    let msgIdx = 0;
    setGenerationProgressText(progressMessages[0]);
    const progressTimer = setInterval(() => {
      msgIdx = (msgIdx + 1) % progressMessages.length;
      setGenerationProgressText(progressMessages[msgIdx]);
    }, 1600);

    const preset = EVENT_PRESETS[eventType] || EVENT_PRESETS.Custom;
    const defaultStartDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const payload = {
      name: name.trim(),
      eventType,
      startDate: defaultStartDate,
      city: preset.city,
      venuePreference: preset.venuePreference,
      venueType: preset.venueType,
      guestCount: preset.guestCount,
      totalBudget: preset.totalBudget,
      currency: 'INR' as CurrencyCode,
      budgetFlexibility: 'Moderate' as BudgetFlexibility,
      spendingPriorities: preset.spendingPriorities,
      costSavingCategories: preset.costSavingCategories,
      theme: preset.theme,
      preferredColors: preset.preferredColors,
      foodPreferences: preset.foodPreferences,
      entertainmentPreferences: preset.entertainmentPreferences,
      additionalInstructions: `Automatically generate a complete, realistic ${eventType} blueprint for "${name.trim()}".`,
    };

    try {
      const response = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      clearInterval(progressTimer);

      if (data.success && data.plan) {
        const created = await createEvent({
          ...payload,
          plan: data.plan,
        });
        setIsGenerating(false);
        setName('');
        onEventCreated(created);
        onClose();
      } else {
        throw new Error(data.message || 'Plan generation failed');
      }
    } catch {
      clearInterval(progressTimer);
      const created = await createEvent(payload);
      setIsGenerating(false);
      setName('');
      onEventCreated(created);
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI Event Creator"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5 text-indigo-100" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Plan Event with AI
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tell AI your event name and type — we&apos;ll create everything automatically
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close wizard"
            onClick={onClose}
            disabled={isGenerating}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleGeneratePlan} className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center gap-2.5 text-xs font-medium text-rose-700 dark:text-rose-300"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isGenerating ? (
            <div className="py-12 px-4 text-center space-y-5">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 animate-ping" />
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/30">
                  <Sparkles className="w-8 h-8 animate-spin" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  AI is Creating Your {eventType} Automatically...
                </h3>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                  {generationProgressText}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-sm mx-auto pt-1">
                  Setting up your smart budget, timeline milestones, vendor checklist, and event workspace.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* 1. Event Name */}
              <div>
                <label
                  htmlFor="ai-event-name-input"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2"
                >
                  1. What is your Event Name? *
                </label>
                <input
                  id="ai-event-name-input"
                  type="text"
                  autoFocus
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g., Priya & Rohan's Wedding or Aarav's Birthday Bash"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* 2. Which Event (Event Type) */}
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2.5">
                  2. Which Event are you planning? *
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {eventTypeOptions.map((item) => {
                    const isSelected = eventType === item.type;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setEventType(item.type)}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`p-1.5 rounded-lg ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {item.icon}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                              Selected
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold">{item.label}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            {item.subtitle}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {isGenerating ? 'Creating Event...' : 'Create Event with AI'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
