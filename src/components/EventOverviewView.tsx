import React, { useState } from 'react';
import {
  Calendar,
  MapPin,
  Users,
  Wallet,
  Download,
  GitBranch,
  Sparkles,
  ArrowRight,
  Check,
  SlidersHorizontal,
  Palette,
  Utensils,
  Music,
  Edit3,
} from 'lucide-react';
import { useEvents } from '../context/EventContext';
import { formatCurrency, calculateBudgetUtilization } from '../utils/budgetCalculations';
import { exportEventToPdf } from '../utils/pdfExport';

interface EventOverviewViewProps {
  onNavigate: (view: string) => void;
  onOpenControlModal?: () => void;
}

export const EventOverviewView: React.FC<EventOverviewViewProps> = ({ onNavigate, onOpenControlModal }) => {
  const { activeEvent, tasks, expenses } = useEvents();
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!activeEvent) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">No active event selected.</p>
      </div>
    );
  }

  // Calculate Days Remaining
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = new Date(activeEvent.startDate);
  const diffTime = eventDate.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const utilization = calculateBudgetUtilization(totalSpent, activeEvent.totalBudget);
  const completedTasks = tasks.filter((t) => t.status === 'Completed').length;
  const taskProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const handleExportPdf = () => {
    const success = exportEventToPdf(activeEvent, tasks, expenses);
    if (success) {
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-xs text-white">
                {activeEvent.eventType}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                {activeEvent.theme} Theme
              </span>
              <span className="text-xs text-indigo-200 font-mono">
                {daysRemaining > 0 ? `⏳ ${daysRemaining} days remaining` : daysRemaining === 0 ? '🎉 TODAY' : 'Past Event'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              {activeEvent.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-indigo-100/90 pt-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-300" />
                {activeEvent.startDate} {activeEvent.endDate ? `to ${activeEvent.endDate}` : ''}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-violet-300" />
                {activeEvent.venuePreference || activeEvent.city} ({activeEvent.venueType})
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-300" />
                {activeEvent.guestCount} Expected Guests
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenControlModal}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-white text-indigo-950 hover:bg-indigo-50 shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
              aria-label="Control Event Details"
            >
              <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
              <span>Control Event Details</span>
            </button>

            <button
              onClick={() => onNavigate('what-if')}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <GitBranch className="w-4 h-4" />
              <span>What-If Simulator</span>
            </button>

            <button
              onClick={handleExportPdf}
              className="px-4 py-2.5 rounded-xl font-semibold text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all flex items-center gap-2"
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>PDF Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Export Blueprint PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Snapshot Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Budget
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {formatCurrency(activeEvent.totalBudget, activeEvent.currency)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Flexibility: {activeEvent.budgetFlexibility}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Actual Spent
          </div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {formatCurrency(totalSpent, activeEvent.currency)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {utilization}% of total budget utilized
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Milestone Progress
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {taskProgress}%
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {completedTasks} of {tasks.length} tasks completed
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Key Priorities
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white mt-1 truncate">
            {activeEvent.spendingPriorities?.slice(0, 2).join(' & ') || 'Standard'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Protected from budget cuts
          </div>
        </div>
      </div>

      {/* Event Details & Specifications Control Panel */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Event Specifications & Controls</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeEvent.status === 'Confirmed'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                    : activeEvent.status === 'Completed'
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                }`}>
                  {activeEvent.status}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Logistics, venue settings, guest capacity, aesthetic palette, and dietary preferences.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenControlModal}
            className="self-start sm:self-center px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Event Details</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Logistics Box */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span>Schedule & Venue</span>
            </div>
            <div className="space-y-1 text-slate-700 dark:text-slate-300">
              <p><strong className="text-slate-900 dark:text-white">Dates:</strong> {activeEvent.startDate} {activeEvent.endDate ? `to ${activeEvent.endDate}` : ''}</p>
              <p><strong className="text-slate-900 dark:text-white">City:</strong> {activeEvent.city}</p>
              <p><strong className="text-slate-900 dark:text-white">Venue Preference:</strong> {activeEvent.venuePreference || 'TBD'}</p>
              <p><strong className="text-slate-900 dark:text-white">Environment:</strong> {activeEvent.venueType} Setting</p>
            </div>
          </div>

          {/* Scale & Budget Box */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-emerald-500" />
              <span>Budget & Guests</span>
            </div>
            <div className="space-y-1 text-slate-700 dark:text-slate-300">
              <p><strong className="text-slate-900 dark:text-white">Total Budget:</strong> {formatCurrency(activeEvent.totalBudget, activeEvent.currency)}</p>
              <p><strong className="text-slate-900 dark:text-white">Flexibility:</strong> {activeEvent.budgetFlexibility}</p>
              <p><strong className="text-slate-900 dark:text-white">Guest Count:</strong> {activeEvent.guestCount} Attendees</p>
              <p className="truncate"><strong className="text-slate-900 dark:text-white">Priorities:</strong> {activeEvent.spendingPriorities?.join(', ') || 'None specified'}</p>
            </div>
          </div>

          {/* Theme & Palette Box */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-violet-500" />
              <span>Aesthetic & Style</span>
            </div>
            <div className="space-y-1 text-slate-700 dark:text-slate-300">
              <p><strong className="text-slate-900 dark:text-white">Theme:</strong> {activeEvent.theme}</p>
              <div>
                <strong className="text-slate-900 dark:text-white block mb-1">Color Palette:</strong>
                <div className="flex flex-wrap items-center gap-1.5">
                  {activeEvent.preferredColors?.map((col, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-slate-300 dark:border-slate-600"
                        style={{ backgroundColor: col.startsWith('#') ? col : undefined }}
                      />
                      <span>{col}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hospitality & Notes line */}
        {(activeEvent.foodPreferences?.length > 0 || activeEvent.entertainmentPreferences?.length > 0 || activeEvent.accessibilityRequirements) && (
          <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-400">
            {activeEvent.foodPreferences?.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">Catering:</span>
                <span>{activeEvent.foodPreferences.join(', ')}</span>
              </div>
            )}
            {activeEvent.entertainmentPreferences?.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-indigo-500" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">Entertainment:</span>
                <span>{activeEvent.entertainmentPreferences.join(', ')}</span>
              </div>
            )}
            {activeEvent.accessibilityRequirements && (
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Accessibility:</span>
                <span>{activeEvent.accessibilityRequirements}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Concept & Strategy Summary */}
      {activeEvent.plan?.overview && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-base">
              <Sparkles className="w-5 h-5" />
              <span>AI Executive Blueprint & Concept</span>
            </div>
            <button
              onClick={() => onNavigate('ai-plan')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              View Full AI Plan <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
            {activeEvent.plan.overview.summary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Recommended Execution Format
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                {activeEvent.plan.overview.suggestedFormat}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Core Strategic Tips
              </h4>
              <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                {activeEvent.plan.overview.recommendations?.slice(0, 3).map((r, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-indigo-500 shrink-0">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
