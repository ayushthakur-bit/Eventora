import React, { useState, useMemo, useRef } from 'react';
import {
  Database,
  Search,
  Plus,
  Download,
  Upload,
  Trash2,
  Edit3,
  Copy,
  Code,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Calendar,
  DollarSign,
  Users,
  Building,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Layers,
  Check,
  X,
  Clock,
  Store,
  Archive,
  Save,
} from 'lucide-react';
import { useEvents } from '../context/EventContext';
import {
  EventData,
  EventType,
  ThemeType,
  BudgetFlexibility,
  VenueType,
} from '../types';
import { formatCurrency } from '../utils/budgetCalculations';
import {
  auditEventData,
  filterEvents,
  exportEventsToCsv,
  safeJsonParse,
} from '../utils/data-management';

interface LocalSnapshot {
  id: string;
  name: string;
  timestamp: string;
  eventCount: number;
  data: string;
}

type DataSortBy = 'date-desc' | 'date-asc' | 'budget-desc' | 'budget-asc' | 'guests-desc';
type EditorSubTab = 'core' | 'budget' | 'schedule' | 'vendors' | 'guests' | 'raw';

export const DataManagementView: React.FC = () => {
  const {
    events,
    activeEventId,
    setActiveEventId,
    allTasks,
    allExpenses,
    allVendors,
    allGuests,
    updateEvent,
    deleteEvent,
    duplicateEvent,
    bulkDeleteEvents,
    bulkUpdateEventStatus,
    importFullDatabase,
    exportFullDatabase,
    resetDatabaseToDefaults,
    seedSampleBlueprint,
    updateEventRawJson,
    updateBudgetAllocations,
    updateEventDaySchedule,
  } = useEvents();

  // Top level active tab: 'all-events' | 'event-editor' | 'audit' | 'backup'
  const [activeTab, setActiveTab] = useState<'all-events' | 'event-editor' | 'audit' | 'backup'>('all-events');

  // Currently focused event for the granular editor
  const [selectedEventId, setSelectedEventId] = useState<string>(
    activeEventId || events[0]?.id || ''
  );

  // Search & Filter state for events master table
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState<DataSortBy>('date-desc');

  // Batch Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Raw JSON Editor Modal / Drawer
  const [jsonModalEventId, setJsonModalEventId] = useState<string | null>(null);
  const [rawJsonText, setRawJsonText] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonSuccess, setJsonSuccess] = useState<string | null>(null);

  // Status feedback toast
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Local Snapshots State (stored in localStorage)
  const [snapshots, setSnapshots] = useState<LocalSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem('eventease_data_snapshots');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [newSnapshotName, setNewSnapshotName] = useState('');

  // File input ref for JSON import
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Filtered and sorted events
  const filteredEvents = useMemo(() => {
    const list = filterEvents(events, searchQuery, typeFilter, statusFilter);
    return list.sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      if (sortBy === 'date-asc') return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      if (sortBy === 'budget-desc') return b.totalBudget - a.totalBudget;
      if (sortBy === 'budget-asc') return a.totalBudget - b.totalBudget;
      if (sortBy === 'guests-desc') return b.guestCount - a.guestCount;
      return 0;
    });
  }, [events, searchQuery, typeFilter, statusFilter, sortBy]);

  // Overall database audit issues
  const auditIssues = useMemo(() => {
    return auditEventData(events, allExpenses, allVendors);
  }, [events, allExpenses, allVendors]);

  // Compute database metrics
  const totalBudgetSum = events.reduce((acc, ev) => acc + (ev.totalBudget || 0), 0);
  const totalExpenseSum = allExpenses.reduce((acc, exp) => acc + (exp.amount || 0), 0);
  const healthyCount = events.length - new Set(auditIssues.map((i) => i.eventId)).size;
  const healthPercent = events.length > 0 ? Math.round((healthyCount / events.length) * 100) : 100;

  // Selected event for granular editor
  const focusedEvent = events.find((e) => e.id === selectedEventId) || events[0] || null;

  // Granular editor sub-tabs: 'core' | 'budget' | 'schedule' | 'vendors' | 'guests' | 'raw'
  const [editorSubTab, setEditorSubTab] = useState<EditorSubTab>('core');

  // Core details form state for focused event
  const [coreForm, setCoreForm] = useState<Partial<EventData>>({});

  React.useEffect(() => {
    if (focusedEvent) {
      setCoreForm({
        name: focusedEvent.name,
        eventType: focusedEvent.eventType,
        startDate: focusedEvent.startDate,
        endDate: focusedEvent.endDate || '',
        city: focusedEvent.city,
        venuePreference: focusedEvent.venuePreference,
        venueType: focusedEvent.venueType,
        guestCount: focusedEvent.guestCount,
        totalBudget: focusedEvent.totalBudget,
        currency: focusedEvent.currency,
        budgetFlexibility: focusedEvent.budgetFlexibility,
        theme: focusedEvent.theme,
        status: focusedEvent.status,
      });
    }
  }, [focusedEvent]);

  // New allocation line item input state
  const [newAllocCategory, setNewAllocCategory] = useState('');
  const [newAllocAmount, setNewAllocAmount] = useState<number>(0);
  const [newAllocReason, setNewAllocReason] = useState('');

  // New timeline schedule item input state
  const [newSchedTime, setNewSchedTime] = useState('');
  const [newSchedActivity, setNewSchedActivity] = useState('');
  const [newSchedNotes, setNewSchedNotes] = useState('');

  // Batch actions
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredEvents.map((e) => e.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Permanently delete ${selectedIds.length} event(s) and all linked data?`)) {
      bulkDeleteEvents(selectedIds);
      setSelectedIds([]);
      showNotice(`Successfully deleted ${selectedIds.length} event(s).`);
    }
  };

  const handleBulkStatus = (status: EventData['status']) => {
    if (selectedIds.length === 0) return;
    bulkUpdateEventStatus(selectedIds, status);
    setSelectedIds([]);
    showNotice(`Updated status to '${status}' for ${selectedIds.length} event(s).`);
  };

  const handleExportSelectedJson = () => {
    const subset = events.filter((e) => selectedIds.includes(e.id));
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(subset, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `eventease_selected_${Date.now()}.json`);
    dlAnchor.click();
    showNotice(`Exported ${subset.length} events to JSON file.`);
  };

  const handleExportCsv = () => {
    const csvContent = exportEventsToCsv(filteredEvents);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `eventease_database_${Date.now()}.csv`);
    link.click();
    URL.revokeObjectURL(url);
    showNotice('Exported event database to CSV spreadsheet.');
  };

  const handleFullBackupDownload = () => {
    const json = exportFullDatabase();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eventease_backup_complete_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotice('Complete database backup saved to your device.');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = safeJsonParse<Record<string, unknown>>(text);
        if (!parsed) {
          showNotice('Backup Import Error: Invalid JSON file.');
          return;
        }
        const res = importFullDatabase(parsed);
        if (res.success) {
          showNotice(`Successfully restored ${res.count} events and operational data!`);
        } else {
          showNotice(`Backup Import Error: ${res.error}`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        showNotice(`Failed to parse JSON file: ${msg}`);
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };

  const handleCreateSnapshot = () => {
    const name = newSnapshotName.trim() || `Snapshot ${snapshots.length + 1}`;
    const newSnap: LocalSnapshot = {
      id: `snap_${Date.now()}`,
      name,
      timestamp: new Date().toLocaleString(),
      eventCount: events.length,
      data: exportFullDatabase(),
    };
    const updated = [newSnap, ...snapshots];
    setSnapshots(updated);
    localStorage.setItem('eventease_data_snapshots', JSON.stringify(updated));
    setNewSnapshotName('');
    showNotice(`Snapshot "${name}" saved locally.`);
  };

  const handleRestoreSnapshot = (snap: LocalSnapshot) => {
    if (window.confirm(`Restore state to "${snap.name}"? Current unsaved modifications will be replaced.`)) {
      try {
        const parsed = safeJsonParse<Record<string, unknown>>(snap.data);
        if (!parsed) {
          showNotice('Error restoring snapshot: corrupted data.');
          return;
        }
        const res = importFullDatabase(parsed);
        if (res.success) {
          showNotice(`Database restored to snapshot "${snap.name}".`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        showNotice(`Error restoring snapshot: ${msg}`);
      }
    }
  };

  const handleDeleteSnapshot = (id: string) => {
    const updated = snapshots.filter((s) => s.id !== id);
    setSnapshots(updated);
    localStorage.setItem('eventease_data_snapshots', JSON.stringify(updated));
    showNotice('Snapshot removed.');
  };

  // Open Raw JSON modal
  const handleOpenRawJson = (id: string) => {
    const target = events.find((e) => e.id === id);
    if (!target) return;
    setJsonModalEventId(id);
    setRawJsonText(JSON.stringify(target, null, 2));
    setJsonError(null);
    setJsonSuccess(null);
  };

  const handleSaveRawJson = () => {
    if (!jsonModalEventId) return;
    const res = updateEventRawJson(jsonModalEventId, rawJsonText);
    if (res.success) {
      setJsonSuccess('JSON changes validated and applied successfully!');
      setTimeout(() => {
        setJsonModalEventId(null);
        showNotice('Event JSON updated.');
      }, 900);
    } else {
      setJsonError(res.error || 'Failed to apply JSON.');
    }
  };

  // Granular editor core save
  const handleSaveCoreDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!focusedEvent) return;
    updateEvent(focusedEvent.id, coreForm);
    showNotice(`Saved details for "${coreForm.name || focusedEvent.name}".`);
  };

  // Line item add/delete
  const handleAddBudgetAllocation = () => {
    if (!focusedEvent || !newAllocCategory.trim() || newAllocAmount <= 0) return;
    const currentAlloc = focusedEvent.plan?.budgetBreakdown || [];
    const pct = Number(((newAllocAmount / focusedEvent.totalBudget) * 100).toFixed(1));
    const updated = [
      ...currentAlloc,
      {
        category: newAllocCategory.trim(),
        amount: newAllocAmount,
        percentage: pct,
        reason: newAllocReason.trim() || 'Custom allocation item',
      },
    ];
    updateBudgetAllocations(focusedEvent.id, updated);
    setNewAllocCategory('');
    setNewAllocAmount(0);
    setNewAllocReason('');
    showNotice('Budget line item added.');
  };

  const handleDeleteBudgetAllocation = (index: number) => {
    if (!focusedEvent) return;
    const currentAlloc = focusedEvent.plan?.budgetBreakdown || [];
    const updated = currentAlloc.filter((_, idx) => idx !== index);
    updateBudgetAllocations(focusedEvent.id, updated);
    showNotice('Line item removed.');
  };

  // Timeline schedule item add/delete
  const handleAddScheduleItem = () => {
    if (!focusedEvent || !newSchedTime.trim() || !newSchedActivity.trim()) return;
    const currentSchedule = focusedEvent.plan?.timeline?.eventDaySchedule || [];
    const updated = [
      ...currentSchedule,
      {
        time: newSchedTime.trim(),
        activity: newSchedActivity.trim(),
        notes: newSchedNotes.trim() || 'Schedule block',
      },
    ];
    updateEventDaySchedule(focusedEvent.id, updated);
    setNewSchedTime('');
    setNewSchedActivity('');
    setNewSchedNotes('');
    showNotice('Timeline schedule block added.');
  };

  const handleDeleteScheduleItem = (index: number) => {
    if (!focusedEvent) return;
    const currentSchedule = focusedEvent.plan?.timeline?.eventDaySchedule || [];
    const updated = currentSchedule.filter((_, idx) => idx !== index);
    updateEventDaySchedule(focusedEvent.id, updated);
    showNotice('Schedule block removed.');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Action Notification Toast */}
      {actionNotice && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Top Header & Context Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
            <Database className="w-3.5 h-3.5" />
            <span>Enterprise Event Data Studio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Event Data Management System
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Real-time CRUD operations, granular budget breakdowns, run-sheets, database audit, and instant JSON backup.
          </p>
        </div>

        {/* Global Hub Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            aria-label="Upload JSON database backup file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Import JSON database file"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-500" />
            <span>Restore JSON</span>
          </button>

          <button
            onClick={handleFullBackupDownload}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Download full JSON database backup"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span>Export Backup</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Download spreadsheet CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Database Metrics Ribbon (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Events in DB
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              {events.length}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{events.filter((e) => e.status === 'Confirmed').length} Confirmed</span>
              <span>•</span>
              <span>{events.filter((e) => e.status === 'Planning').length} Planning</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Budget Managed
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              {formatCurrency(totalBudgetSum, 'INR')}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Spent: {formatCurrency(totalExpenseSum, 'INR')} ({totalBudgetSum > 0 ? Math.round((totalExpenseSum / totalBudgetSum) * 100) : 0}%)
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Linked Operational Records
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              {allTasks.length + allVendors.length + allGuests.length}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {allVendors.length} Vendors • {allGuests.length} Guests • {allTasks.length} Tasks
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Database Integrity
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5 flex items-center gap-1.5">
              <span>{healthPercent}%</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${healthPercent >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300' : 'bg-amber-100 text-amber-700'}`}>
                {healthPercent >= 80 ? 'Optimal' : 'Needs Review'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {auditIssues.length} issue(s) flagged by audit scanner
            </div>
          </div>
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${auditIssues.length === 0 ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600' : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600'}`}>
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Mode Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1 sm:space-x-4">
        <button
          onClick={() => setActiveTab('all-events')}
          className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'all-events'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Events Master Table</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {events.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('event-editor')}
          className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'event-editor'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          <span>Granular Event Studio</span>
          {focusedEvent && (
            <span className="max-w-[120px] truncate text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              {focusedEvent.name}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'audit'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Health Diagnostics</span>
          {auditIssues.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 font-bold">
              {auditIssues.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'backup'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Archive className="w-4 h-4" />
          <span>Snapshots & Templates</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {snapshots.length}
          </span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: ALL EVENTS MASTER TABLE */}
      {/* ============================================================== */}
      {activeTab === 'all-events' && (
        <div className="space-y-4">
          {/* Search, Filter, and Sort Controls Bar */}
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex flex-1 flex-col sm:flex-row gap-2.5">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="data-search-events"
                  aria-label="Search events by name, city, venue or type"
                  type="text"
                  placeholder="Search events by name, city, venue or type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Clear search query"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Event Type Filter */}
              <select
                id="data-filter-type"
                aria-label="Filter by event type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="All">All Event Types</option>
                <option value="Wedding">Wedding</option>
                <option value="Birthday">Birthday</option>
                <option value="Anniversary">Anniversary</option>
                <option value="Corporate Event">Corporate Event</option>
                <option value="College Event">College Event</option>
                <option value="Community Event">Community Event</option>
              </select>

              {/* Status Filter */}
              <select
                id="data-filter-status"
                aria-label="Filter by event status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Planning">Planning</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Completed">Completed</option>
                <option value="Archived">Archived</option>
              </select>

              {/* Sort By */}
              <select
                id="data-sort-events"
                aria-label="Sort events by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as DataSortBy)}
                className="px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="date-desc">Date (Newest First)</option>
                <option value="date-asc">Date (Oldest First)</option>
                <option value="budget-desc">Budget (High to Low)</option>
                <option value="budget-asc">Budget (Low to High)</option>
                <option value="guests-desc">Guest Count (High to Low)</option>
              </select>
            </div>

            {/* Quick Template Seeder shortcut */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const seeded = seedSampleBlueprint('corporate');
                  setSelectedEventId(seeded.id);
                  setActiveTab('event-editor');
                  showNotice('Created corporate blueprint!');
                }}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Seed New Event</span>
              </button>
            </div>
          </div>

          {/* Batch Selection Banner */}
          {selectedIds.length > 0 && (
            <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
              <div className="font-semibold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                  {selectedIds.length}
                </span>
                <span>Events selected for batch execution:</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleBulkStatus('Confirmed')}
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Mark Confirmed
                </button>
                <button
                  onClick={() => handleBulkStatus('Completed')}
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Mark Completed
                </button>
                <button
                  onClick={() => handleBulkStatus('Archived')}
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Archive
                </button>
                <button
                  onClick={handleExportSelectedJson}
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 font-semibold cursor-pointer flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Export JSON</span>
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 font-semibold cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete Selected</span>
                </button>
              </div>
            </div>
          )}

          {/* Master Events Data Table */}
          <div className="overflow-x-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all events"
                      checked={
                        filteredEvents.length > 0 &&
                        selectedIds.length === filteredEvents.length
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-4">Event Identity & Location</th>
                  <th className="py-3.5 px-4">Classification & Theme</th>
                  <th className="py-3.5 px-4">Schedule / Date</th>
                  <th className="py-3.5 px-4">Guests</th>
                  <th className="py-3.5 px-4">Total Budget & Spent</th>
                  <th className="py-3.5 px-4">Operational Status</th>
                  <th className="py-3.5 px-4 text-right">Data Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredEvents.map((evt) => {
                  const isSelected = selectedIds.includes(evt.id);
                  const isActive = evt.id === activeEventId;
                  const eventExpenses = allExpenses.filter((e) => e.eventId === evt.id);
                  const spent = eventExpenses.reduce((s, e) => s + (e.amount || 0), 0);
                  const variancePct = evt.totalBudget > 0 ? Math.round((spent / evt.totalBudget) * 100) : 0;

                  return (
                    <tr
                      key={evt.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          aria-label={`Select event ${evt.name}`}
                          checked={isSelected}
                          onChange={() => handleToggleSelect(evt.id)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      {/* Event Name & City */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2.5">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{evt.name}</span>
                              {isActive && (
                                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                                  Active
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Building className="w-3 h-3 text-slate-400" />
                              <span className="truncate max-w-[200px]">
                                {evt.venuePreference || 'Venue TBD'} • {evt.city}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Classification & Theme */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {evt.eventType}
                        </span>
                        <div className="text-[11px] text-slate-400">
                          Theme: {evt.theme}
                        </div>
                      </td>

                      {/* Schedule / Date */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-slate-800 dark:text-slate-200">
                          {evt.startDate}
                        </div>
                        {evt.endDate && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            To: {evt.endDate}
                          </div>
                        )}
                      </td>

                      {/* Guests */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{evt.guestCount}</span>
                        </div>
                      </td>

                      {/* Total Budget & Spent */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold font-mono text-slate-900 dark:text-white">
                          {formatCurrency(evt.totalBudget, evt.currency)}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono mt-0.5">
                          <span>Spent: {formatCurrency(spent, evt.currency)}</span>
                          <span className={`font-semibold ${variancePct > 100 ? 'text-rose-500' : 'text-slate-500'}`}>
                            ({variancePct}%)
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            evt.status === 'Confirmed'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : evt.status === 'Completed'
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              : evt.status === 'Archived'
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              evt.status === 'Confirmed'
                                ? 'bg-emerald-500'
                                : evt.status === 'Completed'
                                ? 'bg-blue-500'
                                : evt.status === 'Archived'
                                ? 'bg-slate-400'
                                : 'bg-amber-500'
                            }`}
                          />
                          <span>{evt.status}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Granular edit */}
                          <button
                            onClick={() => {
                              setSelectedEventId(evt.id);
                              setActiveTab('event-editor');
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Open granular record studio"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Inspect JSON */}
                          <button
                            onClick={() => handleOpenRawJson(evt.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Inspect & edit raw JSON"
                          >
                            <Code className="w-4 h-4" />
                          </button>

                          {/* Set Active */}
                          {!isActive && (
                            <button
                              onClick={() => {
                                setActiveEventId(evt.id);
                                showNotice(`Set "${evt.name}" as active event.`);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Set as active workspace event"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}

                          {/* Duplicate */}
                          <button
                            onClick={() => {
                              duplicateEvent(evt.id);
                              showNotice(`Duplicated "${evt.name}".`);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Duplicate event record"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete "${evt.name}"? This removes all linked records.`)) {
                                deleteEvent(evt.id);
                                showNotice(`Deleted "${evt.name}".`);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete event"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredEvents.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Search className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                        <p className="text-sm font-semibold">No events matching your filters</p>
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setTypeFilter('All');
                            setStatusFilter('All');
                          }}
                          className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold underline"
                        >
                          Clear all filters
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: GRANULAR EVENT DATA EDITOR */}
      {/* ============================================================== */}
      {activeTab === 'event-editor' && (
        <div className="space-y-6">
          {/* Top Event Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-3">
              <label htmlFor="data-select-event-record" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Editing Record:
              </label>
              <select
                id="data-select-event-record"
                aria-label="Editing Record"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer max-w-sm truncate"
              >
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.eventType} • {e.startDate})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (focusedEvent) handleOpenRawJson(focusedEvent.id);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Code className="w-3.5 h-3.5 text-indigo-500" />
                <span>Raw JSON</span>
              </button>

              <button
                onClick={() => {
                  if (focusedEvent) {
                    setActiveEventId(focusedEvent.id);
                    showNotice(`Set "${focusedEvent.name}" as active event.`);
                  }
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Set as Active Event</span>
              </button>
            </div>
          </div>

          {focusedEvent ? (
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              {/* Sub Navigation */}
              <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-800 p-2 gap-1 bg-slate-50/50 dark:bg-slate-850">
                {([
                  { id: 'core' as EditorSubTab, label: '1. Identity & Logistics', icon: Building },
                  { id: 'budget' as EditorSubTab, label: '2. Budget Line Allocations', icon: DollarSign },
                  { id: 'schedule' as EditorSubTab, label: '3. Master Timeline Run-sheet', icon: Clock },
                  { id: 'vendors' as EditorSubTab, label: '4. Linked Vendors', icon: Store },
                  { id: 'guests' as EditorSubTab, label: '5. Guest Roster', icon: Users },
                  { id: 'raw' as EditorSubTab, label: '6. Direct Raw JSON Editor', icon: Code },
                ]).map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setEditorSubTab(st.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      editorSubTab === st.id
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <st.icon className="w-3.5 h-3.5" />
                    <span>{st.label}</span>
                  </button>
                ))}
              </div>

              {/* Sub-tab 1: Core Logistics & Identity Form */}
              {editorSubTab === 'core' && (
                <form onSubmit={handleSaveCoreDetails} className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {/* Event Name */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label htmlFor="core-event-name" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Event Title / Celebration Name
                      </label>
                      <input
                        id="core-event-name"
                        aria-label="Event Title / Celebration Name"
                        type="text"
                        required
                        value={coreForm.name || ''}
                        onChange={(e) => setCoreForm({ ...coreForm, name: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Status */}
                    <div className="space-y-1.5">
                      <label htmlFor="core-event-status" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Operational Status
                      </label>
                      <select
                        id="core-event-status"
                        aria-label="Operational Status"
                        value={coreForm.status || 'Planning'}
                        onChange={(e) => setCoreForm({ ...coreForm, status: e.target.value as EventData['status'] })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="Planning">Planning</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Completed">Completed</option>
                        <option value="Archived">Archived</option>
                      </select>
                    </div>

                    {/* Event Type */}
                    <div className="space-y-1.5">
                      <label htmlFor="core-event-type" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Event Type
                      </label>
                      <select
                        id="core-event-type"
                        aria-label="Event Type"
                        value={coreForm.eventType || 'Wedding'}
                        onChange={(e) => setCoreForm({ ...coreForm, eventType: e.target.value as EventType })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="Wedding">Wedding</option>
                        <option value="Birthday">Birthday</option>
                        <option value="Anniversary">Anniversary</option>
                        <option value="Corporate Event">Corporate Event</option>
                        <option value="College Event">College Event</option>
                        <option value="Community Event">Community Event</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </div>

                    {/* Theme */}
                    <div className="space-y-1.5">
                      <label htmlFor="core-design-theme" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Design Theme
                      </label>
                      <select
                        id="core-design-theme"
                        aria-label="Design Theme"
                        value={coreForm.theme || 'Elegant'}
                        onChange={(e) => setCoreForm({ ...coreForm, theme: e.target.value as ThemeType })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="Elegant">Elegant</option>
                        <option value="Traditional">Traditional</option>
                        <option value="Luxury">Luxury</option>
                        <option value="Minimal">Minimal</option>
                        <option value="Rustic">Rustic</option>
                        <option value="Colorful">Colorful</option>
                        <option value="Cultural">Cultural</option>
                      </select>
                    </div>

                    {/* Total Budget */}
                    <div className="space-y-1.5">
                      <label htmlFor="core-total-budget" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Total Budget Limit ({coreForm.currency || 'INR'})
                      </label>
                      <input
                        id="core-total-budget"
                        aria-label="Total Budget Limit"
                        type="number"
                        min="0"
                        step="1000"
                        value={coreForm.totalBudget || 0}
                        onChange={(e) => setCoreForm({ ...coreForm, totalBudget: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Start Date */}
                    <div className="space-y-1.5">
                      <label htmlFor="core-start-date" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Start Date
                      </label>
                      <input
                        id="core-start-date"
                        aria-label="Start Date"
                        type="date"
                        required
                        value={coreForm.startDate || ''}
                        onChange={(e) => setCoreForm({ ...coreForm, startDate: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>

                    {/* End Date */}
                    <div className="space-y-1.5">
                      <label htmlFor="core-end-date" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        End Date (Optional)
                      </label>
                      <input
                        id="core-end-date"
                        aria-label="End Date"
                        type="date"
                        value={coreForm.endDate || ''}
                        onChange={(e) => setCoreForm({ ...coreForm, endDate: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>

                    {/* Guest Count */}
                    <div className="space-y-1.5">
                      <label htmlFor="core-guest-count" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Target Guest Count
                      </label>
                      <input
                        id="core-guest-count"
                        aria-label="Target Guest Count"
                        type="number"
                        min="1"
                        value={coreForm.guestCount || 100}
                        onChange={(e) => setCoreForm({ ...coreForm, guestCount: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* City */}
                    <div className="space-y-1.5">
                      <label htmlFor="core-city" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        City / Region
                      </label>
                      <input
                        id="core-city"
                        aria-label="City / Region"
                        type="text"
                        value={coreForm.city || ''}
                        onChange={(e) => setCoreForm({ ...coreForm, city: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Venue Preference */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label htmlFor="core-venue-name" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Venue Name / Address
                      </label>
                      <input
                        id="core-venue-name"
                        aria-label="Venue Name / Address"
                        type="text"
                        placeholder="e.g. Taj Lake Palace, Udaipur"
                        value={coreForm.venuePreference || ''}
                        onChange={(e) => setCoreForm({ ...coreForm, venuePreference: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Venue Type */}
                    <div className="space-y-1.5">
                      <label htmlFor="core-venue-type" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Venue Type
                      </label>
                      <select
                        id="core-venue-type"
                        aria-label="Venue Type"
                        value={coreForm.venueType || 'Mixed'}
                        onChange={(e) => setCoreForm({ ...coreForm, venueType: e.target.value as VenueType })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="Indoor">Indoor (Banquet/Auditorium)</option>
                        <option value="Outdoor">Outdoor (Lawn/Beach/Rooftop)</option>
                        <option value="Mixed">Mixed (Indoor + Outdoor)</option>
                      </select>
                    </div>

                    {/* Flexibility */}
                    <div className="space-y-1.5">
                      <label htmlFor="core-budget-flexibility" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Budget Flexibility
                      </label>
                      <select
                        id="core-budget-flexibility"
                        aria-label="Budget Flexibility"
                        value={coreForm.budgetFlexibility || 'Moderate'}
                        onChange={(e) => setCoreForm({ ...coreForm, budgetFlexibility: e.target.value as BudgetFlexibility })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="Strict">Strict (Zero tolerance for overruns)</option>
                        <option value="Moderate">Moderate (Up to 10% tolerance)</option>
                        <option value="Flexible">Flexible (Experience first)</option>
                      </select>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex items-center justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Event Parameters</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Sub-tab 2: Budget Line Allocations Editor */}
              {editorSubTab === 'budget' && (
                <div className="p-6 space-y-6">
                  {/* Summary Bar */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs gap-3">
                    <div>
                      <span className="text-slate-400">Total Event Budget: </span>
                      <strong className="font-mono text-slate-900 dark:text-white">
                        {formatCurrency(focusedEvent.totalBudget, focusedEvent.currency)}
                      </strong>
                    </div>

                    <div>
                      {(() => {
                        const sum = (focusedEvent.plan?.budgetBreakdown || []).reduce((acc, b) => acc + (b.amount || 0), 0);
                        const diff = focusedEvent.totalBudget - sum;
                        return (
                          <div className="flex items-center gap-2">
                            <span>Allocations Sum: <strong className="font-mono">{formatCurrency(sum, focusedEvent.currency)}</strong></span>
                            {Math.abs(diff) > 10 ? (
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-semibold">
                                {diff > 0 ? `Unallocated: ${formatCurrency(diff, focusedEvent.currency)}` : `Over-allocated: ${formatCurrency(Math.abs(diff), focusedEvent.currency)}`}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-semibold flex items-center gap-1">
                                <Check className="w-3 h-3" /> 100% Balanced
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Existing Allocations List */}
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 font-bold uppercase tracking-wider text-[10px] text-slate-500">
                        <tr>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Allocated Amount</th>
                          <th className="py-2.5 px-3">% of Budget</th>
                          <th className="py-2.5 px-3">Allocation Reason / Specification</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(focusedEvent.plan?.budgetBreakdown || []).map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                              {item.category}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                              {formatCurrency(item.amount, focusedEvent.currency)}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {item.percentage}%
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                              {item.reason}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => handleDeleteBudgetAllocation(idx)}
                                className="p-1 text-slate-400 hover:text-rose-600"
                                title="Remove line item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Add New Line Item Form */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Add New Budget Allocation Line Item</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        id="alloc-category-name"
                        aria-label="Category Name"
                        type="text"
                        placeholder="Category Name (e.g., Drone Videography)"
                        value={newAllocCategory}
                        onChange={(e) => setNewAllocCategory(e.target.value)}
                        className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                      <input
                        id="alloc-amount"
                        aria-label="Allocated Amount"
                        type="number"
                        placeholder="Amount (e.g. 50000)"
                        value={newAllocAmount || ''}
                        onChange={(e) => setNewAllocAmount(Number(e.target.value))}
                        className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                      />
                      <input
                        id="alloc-reason"
                        aria-label="Allocation Reason or Details"
                        type="text"
                        placeholder="Reason / Details"
                        value={newAllocReason}
                        onChange={(e) => setNewAllocReason(e.target.value)}
                        className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddBudgetAllocation}
                      disabled={!newAllocCategory || newAllocAmount <= 0}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                    >
                      + Append Line Item
                    </button>
                  </div>
                </div>
              )}

              {/* Sub-tab 3: Master Run-sheet & Timeline */}
              {editorSubTab === 'schedule' && (
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Event Day Master Timeline & Run-sheet
                      </h3>
                      <p className="text-xs text-slate-500">
                        Hour-by-hour operational cues and coordinator notes for the event day.
                      </p>
                    </div>
                  </div>

                  {/* List of schedule blocks */}
                  <div className="space-y-2.5">
                    {(focusedEvent.plan?.timeline?.eventDaySchedule || []).map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-indigo-400 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-mono font-bold text-xs shrink-0">
                            {item.time}
                          </span>
                          <div>
                            <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                              {item.activity}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {item.notes}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          aria-label={`Remove schedule item ${item.activity}`}
                          onClick={() => handleDeleteScheduleItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {(focusedEvent.plan?.timeline?.eventDaySchedule || []).length === 0 && (
                      <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                        No run-sheet schedule blocks yet. Add your first time slot below!
                      </div>
                    )}
                  </div>

                  {/* Add schedule item */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Add New Timeline Schedule Block</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        id="sched-time-slot"
                        aria-label="Schedule Time Slot"
                        type="text"
                        placeholder="Time (e.g. 17:00 - 18:30)"
                        value={newSchedTime}
                        onChange={(e) => setNewSchedTime(e.target.value)}
                        className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                      />
                      <input
                        id="sched-activity-name"
                        aria-label="Activity or Milestone Name"
                        type="text"
                        placeholder="Activity / Milestone Name"
                        value={newSchedActivity}
                        onChange={(e) => setNewSchedActivity(e.target.value)}
                        className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                      <input
                        id="sched-coordinator-notes"
                        aria-label="Coordinator Notes and Stage"
                        type="text"
                        placeholder="Coordinator Notes & Stage"
                        value={newSchedNotes}
                        onChange={(e) => setNewSchedNotes(e.target.value)}
                        className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddScheduleItem}
                      disabled={!newSchedTime || !newSchedActivity}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                    >
                      + Append Schedule Block
                    </button>
                  </div>
                </div>
              )}

              {/* Sub-tab 4: Linked Vendors */}
              {editorSubTab === 'vendors' && (
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Vendors Linked to {focusedEvent.name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Manage vendor quotes, deposits, and delivery milestones.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Vendor / Business</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Quote</th>
                          <th className="py-2.5 px-3">Advance Paid</th>
                          <th className="py-2.5 px-3">Remaining Due</th>
                          <th className="py-2.5 px-3">Contact</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {allVendors
                          .filter((v) => v.eventId === focusedEvent.id)
                          .map((v) => (
                            <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                              <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                                {v.businessName}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                                {v.category}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold">
                                {formatCurrency(v.quotedAmount, focusedEvent.currency)}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-emerald-600">
                                {formatCurrency(v.advancePayment, focusedEvent.currency)}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-rose-500">
                                {formatCurrency(v.remainingPayment, focusedEvent.currency)}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                                {v.contactInfo.phone || v.contactInfo.email || '—'}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  {v.bookingStatus}
                                </span>
                              </td>
                            </tr>
                          ))}

                        {allVendors.filter((v) => v.eventId === focusedEvent.id).length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400">
                              No vendors directly registered under this event yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sub-tab 5: Guest Roster */}
              {editorSubTab === 'guests' && (
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Guest Roster for {focusedEvent.name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Attendance, dietary preferences, and contact info.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Guest Name</th>
                          <th className="py-2.5 px-3">Group</th>
                          <th className="py-2.5 px-3">RSVP Status</th>
                          <th className="py-2.5 px-3">Party Size</th>
                          <th className="py-2.5 px-3">Dietary / Meal Requests</th>
                          <th className="py-2.5 px-3">Contact</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {allGuests
                          .filter((g) => g.eventId === focusedEvent.id)
                          .map((g) => (
                            <tr key={g.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                              <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                                {g.name}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500">
                                {g.group}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  g.rsvpStatus === 'Attending'
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                    : g.rsvpStatus === 'Declined'
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {g.rsvpStatus}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold">
                                {g.attendanceCount}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500">
                                {g.dietaryRequirements || 'Regular'}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                                {g.contactInfo || '—'}
                              </td>
                            </tr>
                          ))}

                        {allGuests.filter((g) => g.eventId === focusedEvent.id).length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400">
                              No guests registered under this event yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sub-tab 6: Direct Raw JSON Editor */}
              {editorSubTab === 'raw' && (
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Live Event JSON Record
                      </h3>
                      <p className="text-xs text-slate-500">
                        Inspect or edit the underlying data payload directly.
                      </p>
                    </div>
                    <button
                      onClick={() => handleOpenRawJson(focusedEvent.id)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Code className="w-3.5 h-3.5" />
                      <span>Open Fullscreen JSON Editor</span>
                    </button>
                  </div>

                  <pre className="p-4 rounded-2xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto max-h-96 border border-slate-800">
                    {JSON.stringify(focusedEvent, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              No event selected. Choose an event from the selector above.
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: SYSTEM HEALTH & AUDIT INSPECTOR */}
      {/* ============================================================== */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-indigo-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Automated Database Health Diagnostics
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Real-time scanning for negative budget variances, missing venue allocations, and unconfirmed contracts.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Found {auditIssues.length} issues across {events.length} events
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {auditIssues.map((issue) => (
              <div
                key={issue.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  issue.severity === 'high'
                    ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900'
                    : issue.severity === 'medium'
                    ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900'
                    : 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl mt-0.5 ${
                    issue.severity === 'high'
                      ? 'bg-rose-100 text-rose-600'
                      : issue.severity === 'medium'
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {issue.eventName}
                      </span>
                      <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                        issue.severity === 'high'
                          ? 'bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-200'
                          : 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200'
                      }`}>
                        {issue.severity} priority
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      {issue.message}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                      <span>Suggested Fix:</span>
                      <strong className="text-indigo-600 dark:text-indigo-400">{issue.suggestedAction}</strong>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedEventId(issue.eventId);
                    setActiveTab('event-editor');
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 transition-colors flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                >
                  <span>Resolve in Studio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {auditIssues.length === 0 && (
              <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  100% Clean Audit Status!
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  All events have balanced budgets, registered venues, active timeline run-sheets, and verified vendor records.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: BACKUP, RESTORE & SNAPSHOT HUB */}
      {/* ============================================================== */}
      {activeTab === 'backup' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Local Snapshots Manager */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-indigo-500" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Local Database Snapshots
                </h3>
                <p className="text-xs text-slate-500">
                  Save quick rollback checkpoints before making major budget or vendor revisions.
                </p>
              </div>
            </div>

            {/* Create Snapshot Input */}
            <div className="flex gap-2 pt-2">
              <input
                id="snapshot-label-input"
                aria-label="Snapshot Label"
                type="text"
                placeholder="Snapshot Label (e.g., Pre-Vendor Finalization)"
                value={newSnapshotName}
                onChange={(e) => setNewSnapshotName(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleCreateSnapshot}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer shadow-xs"
              >
                Save Snapshot
              </button>
            </div>

            {/* Snapshots List */}
            <div className="space-y-2 pt-2">
              {snapshots.map((snap) => (
                <div
                  key={snap.id}
                  className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {snap.name}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {snap.timestamp} • {snap.eventCount} Events Captured
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleRestoreSnapshot(snap)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-indigo-100 cursor-pointer"
                    >
                      Rollback
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete snapshot ${snap.name}`}
                      onClick={() => handleDeleteSnapshot(snap.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {snapshots.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  No local snapshots created yet.
                </div>
              )}
            </div>
          </div>

          {/* Right: Quick Seeder & Factory Defaults */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Seed Ready-to-Use Event Blueprints
                </h3>
                <p className="text-xs text-slate-500">
                  Inject rich comprehensive blueprints complete with run-sheets and budgets.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => {
                  const ev = seedSampleBlueprint('corporate');
                  setSelectedEventId(ev.id);
                  setActiveTab('event-editor');
                  showNotice('Seeded Corporate Summit blueprint!');
                }}
                className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 bg-white dark:bg-slate-800 text-left transition-all cursor-pointer group shadow-2xs"
              >
                <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                  Nexus Tech Summit (Bengaluru)
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  ₹24,00,000 • 350 Delegates • AV & Keynotes
                </div>
              </button>

              <button
                onClick={() => {
                  const ev = seedSampleBlueprint('anniversary');
                  setSelectedEventId(ev.id);
                  setActiveTab('event-editor');
                  showNotice('Seeded 50th Golden Jubilee blueprint!');
                }}
                className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 bg-white dark:bg-slate-800 text-left transition-all cursor-pointer group shadow-2xs"
              >
                <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                  50th Golden Jubilee (New Delhi)
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  ₹9,50,000 • 160 Guests • Heritage Ghazal
                </div>
              </button>

              <button
                onClick={() => {
                  const ev = seedSampleBlueprint('birthday');
                  setSelectedEventId(ev.id);
                  setActiveTab('event-editor');
                  showNotice('Seeded Rooftop Birthday blueprint!');
                }}
                className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 bg-white dark:bg-slate-800 text-left transition-all cursor-pointer group shadow-2xs"
              >
                <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                  Aanya’s 30th Neon Rooftop (Mumbai)
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  ₹4,80,000 • 90 Guests • Skyline DJ
                </div>
              </button>

              <button
                onClick={() => {
                  const ev = seedSampleBlueprint('wedding');
                  setSelectedEventId(ev.id);
                  setActiveTab('event-editor');
                  showNotice('Seeded Royal Wedding blueprint!');
                }}
                className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 bg-white dark:bg-slate-800 text-left transition-all cursor-pointer group shadow-2xs"
              >
                <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                  Palace Lakeside Wedding (Jaipur)
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  ₹18,00,000 • 250 Guests • Traditional
                </div>
              </button>
            </div>

            {/* Factory Reset */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
                    Reset Database to Factory Defaults
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Restores initial demo events, clear custom records.
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm('Reset all events and records back to initial factory demo state?')) {
                      resetDatabaseToDefaults();
                      showNotice('Database reset to factory defaults.');
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                >
                  Factory Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* RAW JSON LIVE INSPECTOR & EDITOR MODAL */}
      {/* ============================================================== */}
      {jsonModalEventId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Live Raw JSON Editor"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-indigo-500" />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                    Live Raw JSON Editor
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    ID: {jsonModalEventId}
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label="Close JSON editor"
                onClick={() => setJsonModalEventId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {jsonError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{jsonError}</span>
              </div>
            )}

            {jsonSuccess && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-600 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{jsonSuccess}</span>
              </div>
            )}

            <div className="flex-1 my-4 min-h-[300px]">
              <textarea
                id="raw-json-textarea"
                aria-label="Event Raw JSON Content"
                value={rawJsonText}
                onChange={(e) => {
                  setRawJsonText(e.target.value);
                  setJsonError(null);
                }}
                className="w-full h-full min-h-[320px] p-4 font-mono text-xs rounded-2xl bg-slate-950 text-slate-100 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  try {
                    const formatted = JSON.stringify(JSON.parse(rawJsonText), null, 2);
                    setRawJsonText(formatted);
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : 'Syntax error';
                    setJsonError(`Invalid JSON: ${msg}`);
                  }
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Format / Beautify JSON
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setJsonModalEventId(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveRawJson}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm cursor-pointer"
                >
                  Validate & Save JSON
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
