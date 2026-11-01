import React, { useState } from 'react';
import {
  Sparkles,
  Calendar,
  ShieldAlert,
  Lightbulb,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
  Download,
  Check,
} from 'lucide-react';
import { useEvents } from '../context/EventContext';
import { formatCurrency } from '../utils/budgetCalculations';
import { exportEventToPdf } from '../utils/pdfExport';

type PlanTabId = 'overview' | 'budget' | 'timeline' | 'vendors' | 'ideas' | 'risks';

export const AIGeneratedPlanView: React.FC = () => {
  const { activeEvent, tasks, expenses, vendors, guests } = useEvents();
  const [activeTab, setActiveTab] = useState<PlanTabId>('overview');
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!activeEvent || !activeEvent.plan) {
    return (
      <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
        <Sparkles className="w-8 h-8 text-indigo-500 mx-auto mb-2 animate-bounce" />
        <h3 className="text-base font-bold text-slate-800 dark:text-white">No AI Plan Generated Yet</h3>
        <p className="text-xs text-slate-500 mt-1">Open the planning wizard to synthesize a complete master blueprint.</p>
      </div>
    );
  }

  const { plan } = activeEvent;
  const pdfFileName = `${activeEvent.name.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '') || 'Event'}_Blueprint.pdf`;

  const handleExport = () => {
    setIsExporting(true);
    const success = exportEventToPdf(activeEvent, tasks, expenses, vendors, guests);
    setIsExporting(false);
    if (success) {
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    }
  };

  const tabs: Array<{ id: PlanTabId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'overview', label: 'Overview & Concept', icon: Sparkles },
    { id: 'budget', label: 'Budget Allocation', icon: DollarSign },
    { id: 'timeline', label: 'Timeline & Schedule', icon: Calendar },
    { id: 'vendors', label: 'Vendor Sourcing', icon: CheckCircle2 },
    { id: 'ideas', label: 'Creative Ideas', icon: Lightbulb },
    { id: 'risks', label: 'Risks & Contingencies', icon: ShieldAlert },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Gemini AI Generated Blueprint</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Master Event Plan: {activeEvent.name}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Personalized blueprint tailored for {activeEvent.guestCount} guests in {activeEvent.city}.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          title={`Download ${pdfFileName}`}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-2 self-start sm:self-center transition-all cursor-pointer active:scale-95 ${
            downloadSuccess
              ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
              : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-indigo-600/25 hover:scale-[1.02]'
          }`}
        >
          {downloadSuccess ? (
            <>
              <Check className="w-4 h-4 text-white" />
              <span>Downloaded {pdfFileName}</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Generating PDF...' : 'Download Blueprint PDF'}</span>
            </>
          )}
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-2 pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all whitespace-nowrap border-b-2 ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}

      {/* 1. OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Executive Concept</h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {plan.overview.summary}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Recommended Aesthetic
                </span>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                  {plan.overview.recommendedTheme}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Suggested Itinerary Structure
                </span>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-1">
                  {plan.overview.suggestedFormat}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>Strategic Planner Recommendations</span>
              </h3>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                {plan.overview.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-indigo-500" />
                <span>Assumptions & Information Needed</span>
              </h3>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                {plan.overview.assumptionsAndMissing.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 2. BUDGET BREAKDOWN */}
      {activeTab === 'budget' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                Total Planned Budget
              </span>
              <div className="text-2xl font-black text-indigo-950 dark:text-indigo-100">
                {formatCurrency(activeEvent.totalBudget, activeEvent.currency)}
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm">
              All allocations add up precisely to 100% of your planned budget with an internal emergency contingency.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plan.budgetBreakdown.map((item, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {item.category}
                    </h4>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950">
                      {item.percentage}%
                    </span>
                  </div>

                  <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
                    {formatCurrency(item.amount, activeEvent.currency)}
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    {item.reason}
                  </p>
                </div>

                {item.costSavingTip && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-emerald-700 dark:text-emerald-400 flex items-start gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Tip: {item.costSavingTip}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. TIMELINE & SCHEDULE */}
      {activeTab === 'timeline' && (
        <div className="space-y-6">
          {/* Day Schedule */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
              Event-Day Minute-by-Minute Run Sheet
            </h3>
            <div className="space-y-3">
              {plan.timeline.eventDaySchedule.map((item, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs"
                >
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0 w-32">
                    {item.time}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white sm:w-48">
                    {item.activity}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 flex-1">
                    {item.notes}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Morning Checklist */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Morning-of-Event Final Checklist
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {plan.timeline.finalDayChecklist.map((chk, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 text-slate-700 dark:text-slate-300"
                >
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>{chk}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. VENDOR SOURCING */}
      {activeTab === 'vendors' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plan.vendorChecklist.map((v, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{v.category}</h4>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Est: {v.estimatedPriceRange}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">What to look for:</span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">{v.whatToLookFor}</p>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Key Interview Questions:</span>
                  <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 mt-1">
                    {v.questionsToAsk.map((q, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-indigo-500 shrink-0">?</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex justify-between">
                  <span>Target Booking: {v.bookingDeadline}</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">{v.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. CREATIVE IDEAS */}
      {activeTab === 'ideas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Decoration & Visual Concepts</h4>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              {plan.personalizedIdeas.decorationSuggestions.map((d, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-violet-500 shrink-0 mt-0.5" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Culinary & Signature Menu</h4>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              {plan.personalizedIdeas.foodAndMenuIdeas.map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-indigo-500 shrink-0">🍲</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Activities & Guest Hospitality</h4>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              {plan.personalizedIdeas.activitiesAndEntertainment.map((a, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-indigo-500 shrink-0">✨</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Budget-Friendly Alternatives</h4>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              {plan.personalizedIdeas.budgetFriendlyAlternatives.map((b, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-emerald-500 shrink-0">💡</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 6. RISKS & CONTINGENCIES */}
      {activeTab === 'risks' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Weather Contingency Protocol
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                {plan.risksAndRecommendations.weatherContingency}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Backup Vendors & Venues
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                {plan.risksAndRecommendations.backupVendorsOrVenues}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Guest Count Variance Advisory
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                {plan.risksAndRecommendations.guestCountChangesAdvice}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                Payment Milestone Deadlines Caution
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                {plan.risksAndRecommendations.paymentDeadlinesCaution}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
