import React, { useState, useMemo } from 'react';
import {
  PlusCircle,
  Search,
  Filter,
  Calendar,
  MapPin,
  Users,
  ArrowRight,
  MoreVertical,
  Copy,
  Archive,
  Trash2,
  Sparkles,
  CheckCircle,
  AlertCircle,
  SlidersHorizontal,
} from 'lucide-react';
import { useEvents } from '../context/EventContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, calculateBudgetUtilization } from '../utils/budgetCalculations';
import { EventType } from '../types';

interface DashboardViewProps {
  onOpenCreateWizard: () => void;
  onOpenEvent: (id: string, view?: string) => void;
  onOpenControlModal?: (id: string) => void;
  onNavigate?: (view: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenCreateWizard,
  onOpenEvent,
  onOpenControlModal,
  onNavigate: _onNavigate,
}) => {
  const { currentUser } = useAuth();
  const {
    events,
    allTasks: tasks,
    allExpenses: expenses,
    duplicateEvent,
    archiveEvent,
    deleteEvent,
    seedSampleBlueprint,
  } = useEvents();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'date' | 'budget' | 'name'>('date');
  const [actionMenuEventId, setActionMenuEventId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Aggregated Metrics
  const metrics = useMemo(() => {
    const totalEvents = events.length;
    const today = new Date().toISOString().split('T')[0];
    const upcomingEvents = events.filter((e) => e.startDate >= today).length;

    const totalPlannedBudget = events.reduce((sum, e) => sum + e.totalBudget, 0);
    const totalActualExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    const pendingTasks = tasks.filter((t) => t.status !== 'Completed').length;
    const completedTasks = tasks.filter((t) => t.status === 'Completed').length;

    return {
      totalEvents,
      upcomingEvents,
      totalPlannedBudget,
      totalActualExpenses,
      pendingTasks,
      completedTasks,
    };
  }, [events, expenses, tasks]);

  // Filtered & Sorted Events
  const filteredEvents = useMemo(() => {
    return events
      .filter((evt) => {
        const matchesSearch =
          evt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          evt.city.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = selectedType === 'All' || evt.eventType === selectedType;
        const matchesStatus = selectedStatus === 'All' || evt.status === selectedStatus;
        return matchesSearch && matchesType && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'budget') return b.totalBudget - a.totalBudget;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      });
  }, [events, searchQuery, selectedType, selectedStatus, sortBy]);

  const eventTypes: (EventType | 'All')[] = [
    'All',
    'Wedding',
    'Birthday',
    'Anniversary',
    'College Event',
    'Community Event',
    'Corporate Event',
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 text-white shadow-xl shadow-indigo-600/15">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-semibold text-indigo-100">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
              <span>Eventora Copilot Active</span>
            </div>
            {currentUser && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/25 border border-emerald-300/30 text-xs font-mono font-semibold text-emerald-100">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-300" />
                <span>Saved to ID: {currentUser.phoneNumber || currentUser.email}</span>
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {currentUser?.name ? currentUser.name.split(' ')[0] : 'Planner'}! 👋
          </h1>
          <p className="text-sm text-indigo-100/90 font-normal max-w-xl">
            You have <span className="font-semibold text-white">{metrics.upcomingEvents} upcoming events</span> and{' '}
            <span className="font-semibold text-white">{metrics.pendingTasks} pending tasks</span> saved under your account.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          <button
            onClick={onOpenCreateWizard}
            className="px-5 py-3 rounded-xl font-bold text-xs sm:text-sm bg-white text-indigo-700 hover:bg-indigo-50 shadow-lg shadow-black/10 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Add New Event</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Events</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {metrics.totalEvents}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
            {metrics.upcomingEvents} Upcoming
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Planned Budget</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1 truncate">
            {formatCurrency(metrics.totalPlannedBudget, 'INR')}
          </div>
          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">Across all events</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Actual Spending</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1 truncate">
            {formatCurrency(metrics.totalActualExpenses, 'INR')}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {metrics.totalPlannedBudget > 0
              ? `${Math.round((metrics.totalActualExpenses / metrics.totalPlannedBudget) * 100)}% utilized`
              : '0%'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Tasks</div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {metrics.pendingTasks}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Awaiting completion</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Completed Tasks</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {metrics.completedTasks}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Milestones achieved</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Task Completion</div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {metrics.pendingTasks + metrics.completedTasks > 0
              ? `${Math.round((metrics.completedTasks / (metrics.pendingTasks + metrics.completedTasks)) * 100)}%`
              : '0%'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Overall progress</div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            id="dashboard-search-events"
            aria-label="Search events by name or city"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events by name or city..."
            className="w-full pl-10 pr-4 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filters */}
        <div className="w-full md:w-auto flex flex-wrap items-center gap-2.5">
          <label htmlFor="dashboard-filter-type" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Type:</span>
          </label>
          <select
            id="dashboard-filter-type"
            aria-label="Filter events by type"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {eventTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <label htmlFor="dashboard-filter-status" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 ml-2">
            <span>Status:</span>
          </label>
          <select
            id="dashboard-filter-status"
            aria-label="Filter events by status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">All Statuses</option>
            <option value="Planning">Planning</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Archived">Archived</option>
            <option value="Completed">Completed</option>
          </select>

          <label htmlFor="dashboard-sort-by" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 ml-2">
            <span>Sort:</span>
          </label>
          <select
            id="dashboard-sort-by"
            aria-label="Sort events by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'budget' | 'name')}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="date">Date</option>
            <option value="budget">Highest Budget</option>
            <option value="name">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Event Cards Section */}
      {filteredEvents.length === 0 ? (
        <div className="p-10 sm:p-12 text-center rounded-3xl border-2 border-dashed border-indigo-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <PlusCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              {searchQuery || selectedType !== 'All'
                ? 'No matching events found'
                : 'No events created in this account yet'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {searchQuery || selectedType !== 'All'
                ? 'Try adjusting your search criteria or resetting the filters.'
                : `Your workspace for ${currentUser?.phoneNumber || currentUser?.email || 'this account'} is clean and ready. Add your first event below and everything you create will be automatically saved to this ID.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              onClick={onOpenCreateWizard}
              className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/25 inline-flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Add New Event</span>
            </button>
          </div>

          {!searchQuery && selectedType === 'All' && (
            <div className="pt-4 border-t border-slate-200/70 dark:border-slate-800 max-w-lg mx-auto space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Or Quick-Add a Sample Event Blueprint to Your ID
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {(
                  [
                    { key: 'wedding', label: '+ Royal Wedding' },
                    { key: 'birthday', label: '+ Birthday Bash' },
                    { key: 'corporate', label: '+ Corporate Gala' },
                    { key: 'anniversary', label: '+ Golden Anniversary' },
                  ] as const
                ).map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => {
                      const created = seedSampleBlueprint(preset.key);
                      onOpenEvent(created.id, 'overview');
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((evt) => {
            const eventExpenses = expenses.filter((e) => e.eventId === evt.id);
            const actualSpending = eventExpenses.reduce((sum, e) => sum + e.amount, 0);
            const utilization = calculateBudgetUtilization(actualSpending, evt.totalBudget);

            const eventTasks = tasks.filter((t) => t.eventId === evt.id);
            const completedCount = eventTasks.filter((t) => t.status === 'Completed').length;
            const progress = eventTasks.length > 0 ? Math.round((completedCount / eventTasks.length) * 100) : 0;

            return (
              <div
                key={evt.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Top */}
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
                        {evt.eventType}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          evt.status === 'Confirmed'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : evt.status === 'Archived'
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {evt.status}
                      </span>
                    </div>

                    {/* Context Action Menu */}
                    <div className="relative">
                      <button
                        onClick={() => setActionMenuEventId(actionMenuEventId === evt.id ? null : evt.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Event options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {actionMenuEventId === evt.id && (
                        <div
                          className="absolute right-0 mt-1 w-48 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl py-1 z-30 animate-in fade-in"
                          onMouseLeave={() => setActionMenuEventId(null)}
                        >
                          <button
                            onClick={() => {
                              setActionMenuEventId(null);
                              onOpenControlModal?.(evt.id);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-medium flex items-center gap-2"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" /> Control Details
                          </button>
                          <button
                            onClick={() => {
                              setActionMenuEventId(null);
                              duplicateEvent(evt.id);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                          >
                            <Copy className="w-3.5 h-3.5" /> Duplicate Event
                          </button>
                          <button
                            onClick={() => {
                              setActionMenuEventId(null);
                              archiveEvent(evt.id);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                          >
                            <Archive className="w-3.5 h-3.5" /> Archive
                          </button>
                          <button
                            onClick={() => {
                              setActionMenuEventId(null);
                              setDeleteConfirmId(evt.id);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete Event
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3
                      onClick={() => onOpenEvent(evt.id, 'overview')}
                      className="text-lg font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
                    >
                      {evt.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {evt.plan?.overview.summary || `${evt.theme} theme, planned in ${evt.city}.`}
                    </p>
                  </div>

                  {/* Metadata Chips */}
                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>{evt.startDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                      <span className="truncate">{evt.city}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{evt.guestCount} Expected Guests</span>
                    </div>
                  </div>

                  {/* Progress & Utilization */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Budget Spent</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {formatCurrency(actualSpending, evt.currency)} / {formatCurrency(evt.totalBudget, evt.currency)}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          utilization > 100
                            ? 'bg-red-500'
                            : utilization > 80
                            ? 'bg-amber-500'
                            : 'bg-indigo-600'
                        }`}
                        style={{ width: `${Math.min(utilization, 100)}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Tasks: {completedCount}/{eventTasks.length} ({progress}%)</span>
                      <span>{utilization}% budget utilized</span>
                    </div>
                  </div>
                </div>

                {/* Card Bottom / Action Row */}
                <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => onOpenEvent(evt.id, 'what-if')}
                      className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>What-If</span>
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <button
                      onClick={() => onOpenControlModal?.(evt.id)}
                      className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
                      title="Control event specifications, budget and theme"
                    >
                      <SlidersHorizontal className="w-3 h-3" />
                      <span>Control</span>
                    </button>
                  </div>

                  <button
                    onClick={() => onOpenEvent(evt.id, 'overview')}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <span>Open Plan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center mb-3">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete this event?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              This action cannot be undone. All linked tasks, expenses, vendors, and invitations will be permanently removed.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteEvent(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
