import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Wallet,
  Palette,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { EventType, ThemeType, VenueType, BudgetFlexibility, CurrencyCode, EventData } from '../types';
import { useEvents } from '../context/EventContext';
import { formatCurrency } from '../utils/budgetCalculations';

interface CreateEventWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: (event: EventData) => void;
}

export const CreateEventWizard: React.FC<CreateEventWizardProps> = ({
  isOpen,
  onClose,
  onEventCreated,
}) => {
  const { createEvent } = useEvents();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgressText, setGenerationProgressText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState<EventType>('Wedding');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [city, setCity] = useState('');
  const [venuePreference, setVenuePreference] = useState('');
  const [venueType, setVenueType] = useState<VenueType>('Mixed');
  const [guestCount, setGuestCount] = useState<number>(150);

  // Budget
  const [totalBudget, setTotalBudget] = useState<number>(500000);
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [budgetFlexibility, setBudgetFlexibility] = useState<BudgetFlexibility>('Moderate');
  const [spendingPriorities, setSpendingPriorities] = useState<string[]>(['Venue', 'Food and catering']);
  const [costSavingCategories, setCostSavingCategories] = useState<string[]>(['Invitations and stationery']);

  // Style & Preferences
  const [theme, setTheme] = useState<ThemeType>('Traditional');
  const [colorInput, setColorInput] = useState('Royal Burgundy, Champagne Gold, Ivory');
  const [foodPreferences, setFoodPreferences] = useState('Authentic regional buffet, live chaat counter');
  const [entertainmentPreferences, setEntertainmentPreferences] = useState('Live folk welcome artists & celebration DJ');
  const [accessibilityRequirements, setAccessibilityRequirements] = useState('');
  const [culturalPreferences, setCulturalPreferences] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  if (!isOpen) return null;

  const eventTypeOptions: EventType[] = [
    'Wedding',
    'Birthday',
    'Anniversary',
    'College Event',
    'Community Event',
    'Corporate Event',
    'Custom',
  ];

  const themeOptions: ThemeType[] = [
    'Elegant',
    'Traditional',
    'Minimal',
    'Luxury',
    'Rustic',
    'Colorful',
    'Cultural',
    'Custom',
  ];

  const priorityOptions = [
    'Venue',
    'Food and catering',
    'Decoration',
    'Photography and videography',
    'Entertainment',
    'Invitations and stationery',
    'Transportation',
  ];

  const togglePriority = (item: string) => {
    if (spendingPriorities.includes(item)) {
      setSpendingPriorities(spendingPriorities.filter((p) => p !== item));
    } else {
      setSpendingPriorities([...spendingPriorities, item]);
    }
  };

  const toggleCostSaving = (item: string) => {
    if (costSavingCategories.includes(item)) {
      setCostSavingCategories(costSavingCategories.filter((c) => c !== item));
    } else {
      setCostSavingCategories([...costSavingCategories, item]);
    }
  };

  // Validation
  const validateStep1 = () => {
    if (!name.trim()) {
      setError('Please provide an event name.');
      return false;
    }
    if (!startDate) {
      setError('Please select an event start date.');
      return false;
    }
    if (!city.trim()) {
      setError('Please provide the host city.');
      return false;
    }
    if (!guestCount || guestCount <= 0) {
      setError('Expected guests must be greater than zero.');
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep2 = () => {
    if (!totalBudget || totalBudget <= 0) {
      setError('Total budget must be a positive number.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setError(null);
    setStep((prev) => Math.min(4, prev + 1) as any);
  };

  const handleBack = () => {
    setError(null);
    setStep((prev) => Math.max(1, prev - 1) as any);
  };

  const handleGeneratePlan = async () => {
    if (!validateStep1() || !validateStep2()) return;

    setIsGenerating(true);
    setError(null);

    const progressMessages = [
      'Analyzing event type, regional cues, and guest ergonomics...',
      'Synthesizing mathematically balanced budget allocations...',
      'Constructing pre-event timeline and minute-by-minute itinerary...',
      'Formulating vendor sourcing questions and safety contingencies...',
    ];

    let msgIdx = 0;
    setGenerationProgressText(progressMessages[0]);
    const progressTimer = setInterval(() => {
      msgIdx = (msgIdx + 1) % progressMessages.length;
      setGenerationProgressText(progressMessages[msgIdx]);
    }, 1800);

    const payload = {
      name: name.trim(),
      eventType,
      startDate,
      endDate: endDate || undefined,
      city: city.trim(),
      venuePreference: venuePreference.trim(),
      venueType,
      guestCount: Number(guestCount),
      totalBudget: Number(totalBudget),
      currency,
      budgetFlexibility,
      spendingPriorities,
      costSavingCategories,
      theme,
      preferredColors: colorInput.split(',').map((c) => c.trim()).filter(Boolean),
      foodPreferences: foodPreferences.split(',').map((f) => f.trim()).filter(Boolean),
      entertainmentPreferences: entertainmentPreferences.split(',').map((e) => e.trim()).filter(Boolean),
      accessibilityRequirements: accessibilityRequirements.trim() || undefined,
      culturalPreferences: culturalPreferences.trim() || undefined,
      additionalInstructions: additionalInstructions.trim() || undefined,
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
        onEventCreated(created);
        onClose();
      } else {
        throw new Error(data.message || 'Plan generation failed');
      }
    } catch (err: any) {
      clearInterval(progressTimer);
      console.error('Plan generation failed:', err);
      // Create with smart local fallback so user never gets stuck
      const created = await createEvent(payload);
      setIsGenerating(false);
      onEventCreated(created);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5 text-indigo-100" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                AI Event Planning Wizard
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Step {step} of 4: {step === 1 && 'Event Details'}{step === 2 && 'Budget & Priorities'}{step === 3 && 'Style & Preferences'}{step === 4 && 'Review & Generate'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isGenerating}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5">
          <div
            className="h-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center gap-2 text-xs text-red-600 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: EVENT DETAILS */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Event Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aarav & Meera's Wedding or TechSummit 2026"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Event Type
                  </label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as EventType)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {eventTypeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expected Number of Guests <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Users className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="number"
                      min={1}
                      value={guestCount}
                      onChange={(e) => setGuestCount(parseInt(e.target.value, 10) || 0)}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    City / Location <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Udaipur, Mumbai, Bengaluru"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Venue Setting
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Indoor', 'Outdoor', 'Mixed'] as VenueType[]).map((v) => (
                      <button
                        type="button"
                        key={v}
                        onClick={() => setVenueType(v)}
                        className={`py-2 text-xs font-medium rounded-xl border transition-all ${
                          venueType === v
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Venue Preference / Name (Optional)
                </label>
                <input
                  type="text"
                  value={venuePreference}
                  onChange={(e) => setVenuePreference(e.target.value)}
                  placeholder="e.g. Lakeside Heritage Courtyard, 5-Star Hotel Banquet, or Campus Auditorium"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* STEP 2: BUDGET & PRIORITIES */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Total Planned Budget <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Wallet className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="number"
                      min={1000}
                      step={1000}
                      value={totalBudget}
                      onChange={(e) => setTotalBudget(parseFloat(e.target.value) || 0)}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Formatted: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{formatCurrency(totalBudget, currency)}</span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Currency (Default INR ₹)
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="INR">INR — Indian Rupee (₹)</option>
                    <option value="USD">USD — US Dollar ($)</option>
                    <option value="EUR">EUR — Euro (€)</option>
                    <option value="GBP">GBP — British Pound (£)</option>
                    <option value="AED">AED — UAE Dirham</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Budget Flexibility
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Strict', 'Moderate', 'Flexible'] as BudgetFlexibility[]).map((f) => (
                    <button
                      type="button"
                      key={f}
                      onClick={() => setBudgetFlexibility(f)}
                      className={`py-2 text-xs font-medium rounded-xl border transition-all ${
                        budgetFlexibility === f
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Top Spending Priorities (AI will allocate higher share)
                </label>
                <div className="flex flex-wrap gap-2">
                  {priorityOptions.map((opt) => {
                    const isSelected = spendingPriorities.includes(opt);
                    return (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => togglePriority(opt)}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white font-medium'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Cost-Saving Target Areas (AI will propose economical alternatives)
                </label>
                <div className="flex flex-wrap gap-2">
                  {priorityOptions.map((opt) => {
                    const isSelected = costSavingCategories.includes(opt);
                    return (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => toggleCostSaving(opt)}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-600 text-white font-medium'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: STYLE & PREFERENCES */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Aesthetic Theme
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {themeOptions.map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`p-2.5 text-xs font-medium rounded-xl border text-center transition-all ${
                        theme === t
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Preferred Color Palette
                </label>
                <input
                  type="text"
                  value={colorInput}
                  onChange={(e) => setColorInput(e.target.value)}
                  placeholder="e.g. Royal Burgundy, Champagne Gold, Ivory, Emerald"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Food & Catering Preferences
                  </label>
                  <textarea
                    rows={2}
                    value={foodPreferences}
                    onChange={(e) => setFoodPreferences(e.target.value)}
                    placeholder="e.g. Regional authentic buffet, live counter, Jain options, cocktail bar"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Entertainment & Music
                  </label>
                  <textarea
                    rows={2}
                    value={entertainmentPreferences}
                    onChange={(e) => setEntertainmentPreferences(e.target.value)}
                    placeholder="e.g. Sitar welcome, DJ, emcee games, folk dance troupe"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Accessibility Requirements
                  </label>
                  <input
                    type="text"
                    value={accessibilityRequirements}
                    onChange={(e) => setAccessibilityRequirements(e.target.value)}
                    placeholder="e.g. Wheelchair ramp to mandap/stage, elevator access"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cultural / Regional Traditions
                  </label>
                  <input
                    type="text"
                    value={culturalPreferences}
                    onChange={(e) => setCulturalPreferences(e.target.value)}
                    placeholder="e.g. Traditional Vedic rituals, Sangeet, Nikah, Christian service"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Additional Planner Notes
                </label>
                <input
                  type="text"
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  placeholder="e.g. Eco-friendly decor, minimal plastic, sunset photo schedule"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & GENERATE */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-sm mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span>Ready for Gemini AI Synthesis</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Review your event inputs below. Once confirmed, Eventora will build your comprehensive
                  blueprint with balanced budgets, vendor checklists, and minute-by-minute schedules.
                </p>
              </div>

              {/* Review Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-1">
                  <span className="text-slate-400 font-medium">Event & Scale</span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{name}</div>
                  <div className="text-slate-600 dark:text-slate-300">
                    {eventType} • {guestCount} Guests • {venueType}
                  </div>
                  <div className="text-slate-500">
                    {city} • {startDate} {endDate ? `to ${endDate}` : ''}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-1">
                  <span className="text-slate-400 font-medium">Financial Parameters</span>
                  <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(totalBudget, currency)}
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    Flexibility: {budgetFlexibility}
                  </div>
                  <div className="text-slate-500 truncate">
                    Priorities: {spendingPriorities.join(', ') || 'Balanced'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-1 sm:col-span-2">
                  <span className="text-slate-400 font-medium">Theme & Culinary Concept</span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {theme} Theme ({colorInput})
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Food:</span> {foodPreferences}
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Entertainment:</span> {entertainmentPreferences}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={isGenerating}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
            >
              Next Step <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGeneratePlan}
              disabled={isGenerating}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
            >
              {isGenerating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{generationProgressText || 'Crafting Master Blueprint...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate My Event Plan</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
