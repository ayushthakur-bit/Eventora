import React, { useState } from 'react';
import {
  GitBranch,
  Sparkles,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Undo2,
  AlertCircle,
  HelpCircle,
  Layers,
  Check,
} from 'lucide-react';
import { useEvents } from '../context/EventContext';
import { WhatIfSimulationResult } from '../types';
import { formatCurrency, calculateCategoryVariance } from '../utils/budgetCalculations';

export const WhatIfPlannerView: React.FC = () => {
  const {
    activeEvent,
    applyWhatIfResult,
    undoPlanChange,
    previousPlanBackup,
  } = useEvents();

  const [query, setQuery] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<WhatIfSimulationResult | null>(null);
  const [appliedSuccessfully, setAppliedSuccessfully] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!activeEvent || !activeEvent.plan) {
    return (
      <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
        <GitBranch className="w-8 h-8 text-violet-500 mx-auto mb-2" />
        <h3 className="text-base font-bold text-slate-800 dark:text-white">No Event Plan to Simulate</h3>
        <p className="text-xs text-slate-500 mt-1">Please create or generate an event plan first.</p>
      </div>
    );
  }

  const sampleScenarios = [
    `My ${activeEvent.eventType.toLowerCase()} budget decreased from ${formatCurrency(activeEvent.totalBudget, activeEvent.currency)} to ${formatCurrency(Math.round(activeEvent.totalBudget * 0.8), activeEvent.currency)}. Update my plan.`,
    `I now expect ${Math.round(activeEvent.guestCount * 1.25)} guests instead of ${activeEvent.guestCount}.`,
    `Move our celebration to an indoor air-conditioned ballroom.`,
    `Keep the ${activeEvent.spendingPriorities?.[0] || 'Photography'} budget unchanged, but reduce decoration and invitation costs.`,
    `Suggest a traditional cultural aesthetic within our existing budget.`,
  ];

  const handleSimulate = async (scenarioQuery?: string) => {
    const textToRun = scenarioQuery || query;
    if (!textToRun.trim()) {
      setError('Please enter or select a scenario to simulate.');
      return;
    }

    setIsSimulating(true);
    setError(null);
    setAppliedSuccessfully(false);

    try {
      const response = await fetch('/api/ai/what-if', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: textToRun,
          currentEvent: activeEvent,
          currentPlan: activeEvent.plan,
        }),
      });

      const data = await response.json();
      if (data.success && data.result) {
        setSimulationResult(data.result);
      } else {
        throw new Error(data.message || 'Simulation failed');
      }
    } catch (err: unknown) {
      console.error('What-If simulation error:', err instanceof Error ? err.message : err);
      setError('Could not complete AI simulation. Please try again.');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleApply = () => {
    if (!simulationResult) return;
    applyWhatIfResult(simulationResult);
    setAppliedSuccessfully(true);
    setTimeout(() => setAppliedSuccessfully(false), 4000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-400/30 text-xs font-semibold text-violet-200">
            <GitBranch className="w-3.5 h-3.5" />
            <span>Eventora Signature Differentiating Feature</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            What-If Scenario Simulator
          </h1>

          <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed font-normal">
            Test any curveball: sudden budget cuts, guest count surges, venue pivots, or priority shields.
            Our engine rebalances all mathematical allocations, shields what matters most, and shows an instant before-and-after audit.
          </p>
        </div>

        {/* Undo bar if previous backup exists */}
        {previousPlanBackup && (
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-amber-300">
              <AlertCircle className="w-4 h-4" />
              <span>You applied a recent scenario to "{activeEvent.name}".</span>
            </div>
            <button
              onClick={undoPlanChange}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/20 hover:bg-white/30 text-white flex items-center gap-1.5 transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" /> Undo Last Changes
            </button>
          </div>
        )}
      </div>

      {/* Input Form & Preset Chips */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <label
          htmlFor="what-if-scenario-input"
          className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
        >
          Ask a Scenario Question
        </label>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="what-if-scenario-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSimulate()}
            placeholder="e.g. My budget decreased to ₹4,00,000. Shield photography but optimize decor..."
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          />

          <button
            onClick={() => handleSimulate()}
            disabled={isSimulating}
            className="px-6 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-md shadow-violet-600/20 flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
          >
            {isSimulating ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Simulating Impact...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Simulate Scenario</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{error}</span>
          </p>
        )}

        {/* Preset Chips */}
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Try Recommended Scenarios for this Event:
          </span>
          <div className="flex flex-wrap gap-2">
            {sampleScenarios.map((scenario, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(scenario);
                  handleSimulate(scenario);
                }}
                className="px-3 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 hover:bg-violet-50 dark:hover:bg-violet-950/40 text-slate-700 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 border border-slate-200 dark:border-slate-700/80 transition-colors text-left"
              >
                "{scenario}"
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Simulation Result Presentation */}
      {simulationResult && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
          {/* Impact Banner */}
          <div className="p-6 rounded-3xl bg-violet-50/80 dark:bg-violet-950/40 border border-violet-200/80 dark:border-violet-900/60 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                AI Impact Analysis & Findings
              </span>
              <span className="text-xs font-mono text-slate-400">
                Grounded in "{activeEvent.name}"
              </span>
            </div>

            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
              {simulationResult.impactSummary}
            </p>

            {/* Preserved priorities */}
            {simulationResult.preservedPriorities && simulationResult.preservedPriorities.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium pt-1">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  Protected user priorities: {simulationResult.preservedPriorities.join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* Side-by-Side Before & After Budget Audit */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Before vs After Reallocation Audit
                </h3>
                <p className="text-xs text-slate-500">
                  Every category is reconciled to ensure zero discrepancies.
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold">
                <div>
                  <span className="text-slate-400">Previous: </span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {formatCurrency(simulationResult.budgetAdjustments.previousBudget, activeEvent.currency)}
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <div>
                  <span className="text-slate-400">Proposed: </span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                    {formatCurrency(simulationResult.budgetAdjustments.newBudget, activeEvent.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Table / Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4 rounded-l-lg">Category</th>
                    <th className="py-2.5 px-4">Current Allocation</th>
                    <th className="py-2.5 px-4">Proposed Allocation</th>
                    <th className="py-2.5 px-4">Variance</th>
                    <th className="py-2.5 px-4 rounded-r-lg">AI Strategic Justification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {simulationResult.budgetAdjustments.reallocations.map((row, idx) => {
                    const diff = row.newAmount - row.oldAmount;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                          {row.category}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {formatCurrency(row.oldAmount, activeEvent.currency)}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {formatCurrency(row.newAmount, activeEvent.currency)}
                        </td>
                        <td className="py-3 px-4">
                          {diff === 0 ? (
                            <span className="text-slate-400 font-medium">Unchanged</span>
                          ) : diff < 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                              <TrendingDown className="w-3.5 h-3.5" />
                              -{formatCurrency(Math.abs(diff), activeEvent.currency)}
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                              <TrendingUp className="w-3.5 h-3.5" />
                              +{formatCurrency(diff, activeEvent.currency)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {row.changeReason}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Strategic Recommendations */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Action Plan & Tactical Advice:
              </span>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                {simulationResult.recommendations?.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Confirmation & Save Controls */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500">
                ⚠️ Significant changes require explicit confirmation. Previous plan is safely backed up.
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSimulationResult(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Discard Simulation
                </button>

                <button
                  onClick={handleApply}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-violet-600 hover:bg-violet-700 shadow-md shadow-violet-600/30 flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
                >
                  {appliedSuccessfully ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Changes Saved to Event!</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Apply to Event Plan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
