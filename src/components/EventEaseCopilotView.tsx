import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Send,
  User,
  CheckCircle2,
  Wallet,
  ShieldAlert,
  Plus,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Briefcase,
  Clock,
  Palette,
  TrendingDown,
  Zap,
  ChevronRight,
  Users,
  ListTodo,
  Building2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useEvents } from '../context/EventContext';
import { formatCurrency } from '../utils/budgetCalculations';
import {
  CopilotPersona,
  ProposedCopilotAction,
  parseCopilotMessage,
  buildEventContextDigest,
  deriveContextualActions,
} from '../utils/copilot-parser';

export interface CopilotChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  persona?: CopilotPersona;
  suggestions?: string[];
  proposedActions?: ProposedCopilotAction[];
}

export interface CopilotThread {
  id: string;
  eventId: string;
  title: string;
  persona: CopilotPersona;
  updatedAt: string;
  messages: CopilotChatMessage[];
}

const PERSONA_CONFIG: {
  id: CopilotPersona;
  label: string;
  shortLabel: string;
  description: string;
  badgeColor: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  {
    id: 'general',
    label: 'Holistic Event Planner',
    shortLabel: 'Planner',
    description: 'End-to-end event strategy, guest flow & coordination',
    badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300',
    icon: Sparkles,
  },
  {
    id: 'budget',
    label: 'Financial & Budget Auditor',
    shortLabel: 'Budget AI',
    description: 'Cost-saving swaps, per-plate math & variance control',
    badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300',
    icon: Wallet,
  },
  {
    id: 'vendor',
    label: 'Vendor Negotiator',
    shortLabel: 'Negotiator',
    description: 'Word-for-word discount scripts & SLA contract clauses',
    badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300',
    icon: Briefcase,
  },
  {
    id: 'timeline',
    label: 'Showcaller & Timeline',
    shortLabel: 'Timeline',
    description: 'Cue-to-cue master run-sheets & critical path tasks',
    badgeColor: 'bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300',
    icon: Clock,
  },
  {
    id: 'creative',
    label: 'Decor & Culinary Stylist',
    shortLabel: 'Creative',
    description: 'Theme palettes, floral architecture & live food counters',
    badgeColor: 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300',
    icon: Palette,
  },
];

const LS_COPILOT_THREADS = 'eventease_copilot_threads_v2';

/**
 * Rich formatted markdown renderer for Copilot messages
 */
const FormattedMessageContent: React.FC<{ content: string; isUser: boolean }> = ({
  content,
  isUser,
}) => {
  const [copiedQuote, setCopiedQuote] = useState<number | null>(null);

  if (isUser) {
    return <div className="whitespace-pre-wrap leading-relaxed">{content}</div>;
  }

  const formatInlineBold = (line: string) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-bold text-slate-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  const lines = content.split('\n');

  return (
    <div className="space-y-2 text-xs sm:text-sm leading-relaxed">
      {lines.map((rawLine, idx) => {
        const line = rawLine.trim();
        if (!line) return <div key={idx} className="h-1" />;

        if (line.startsWith('### ')) {
          return (
            <h4
              key={idx}
              className="text-sm sm:text-base font-extrabold text-indigo-950 dark:text-indigo-200 pt-1 pb-0.5 flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-700/60"
            >
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>{formatInlineBold(line.replace(/^###\s+/, ''))}</span>
            </h4>
          );
        }

        if (line.startsWith('## ')) {
          return (
            <h3
              key={idx}
              className="text-base font-bold text-slate-900 dark:text-white pt-1"
            >
              {formatInlineBold(line.replace(/^##\s+/, ''))}
            </h3>
          );
        }

        if (line.startsWith('> ')) {
          const quoteText = line
            .replace(/^>\s+/, '')
            .replace(/^\*"|"\*$/g, '')
            .replace(/^"|"$/g, '')
            .replace(/^\*|\*$/g, '');
          return (
            <div
              key={idx}
              className="my-2.5 p-3.5 rounded-xl bg-indigo-50/90 dark:bg-indigo-950/50 border-l-4 border-indigo-600 text-slate-800 dark:text-slate-200 italic space-y-2"
            >
              <p className="leading-relaxed">“{formatInlineBold(quoteText)}”</p>
              <div className="flex justify-end not-italic">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(quoteText);
                    setCopiedQuote(idx);
                    setTimeout(() => setCopiedQuote(null), 1800);
                  }}
                  aria-label="Copy script to clipboard"
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 border border-slate-200/80 dark:border-slate-700 shadow-2xs text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  {copiedQuote === idx ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Copied Script</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Script</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        }

        if (/^\d+\.\s+/.test(line)) {
          const numMatch = line.match(/^(\d+)\.\s+(.*)/);
          if (numMatch) {
            return (
              <div key={idx} className="flex items-start gap-2.5 pl-1">
                <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  {numMatch[1]}
                </span>
                <div className="flex-1">{formatInlineBold(numMatch[2])}</div>
              </div>
            );
          }
        }

        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
              <div className="flex-1">{formatInlineBold(line.slice(2))}</div>
            </div>
          );
        }

        return <p key={idx}>{formatInlineBold(line)}</p>;
      })}
    </div>
  );
};

export const EventEaseCopilotView: React.FC = () => {
  const {
    activeEvent,
    tasks,
    expenses,
    vendors,
    guests,
    addTask,
    addExpense,
    addVendor,
    updateEventDaySchedule,
  } = useEvents();

  const [selectedPersona, setSelectedPersona] = useState<CopilotPersona>('general');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);

  const buildWelcomeMessage = (evName: string, budgetStr: string): CopilotChatMessage => ({
    id: `msg_welcome_${Date.now()}`,
    role: 'assistant',
    persona: 'general',
    content: `### Welcome to Eventora Copilot Studio\n\nI'm your live AI Event Architect & Financial Strategist for **${evName}**.\n\n- **Grounded Financial Target**: **${budgetStr}** across **${activeEvent?.guestCount || 0} guests** in **${activeEvent?.city || 'your city'}**\n- **Live Sync**: Connected to your **${tasks.length} tasks**, **${vendors.length} vendors**, and **${guests.length} guest records**\n\nSelect a specialist mode above or ask me to audit your budget, write a vendor negotiation script, or add tasks directly to your plan!`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    suggestions: [
      'Reduce my budget by 15%',
      'Draft a vendor negotiation script',
      'Questions to ask my caterer',
      'What should I do this week?',
    ],
    proposedActions: [],
  });

  const [threads, setThreads] = useState<CopilotThread[]>(() => {
    try {
      const saved = localStorage.getItem(LS_COPILOT_THREADS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    const evId = activeEvent?.id || 'default';
    const evName = activeEvent?.name || 'Your Celebration';
    const budgetStr = formatCurrency(activeEvent?.totalBudget || 0, activeEvent?.currency);
    return [
      {
        id: 'thread_initial',
        eventId: evId,
        title: 'Master Strategy & Audit',
        persona: 'general',
        updatedAt: new Date().toISOString(),
        messages: [buildWelcomeMessage(evName, budgetStr)],
      },
    ];
  });

  const [activeThreadId, setActiveThreadId] = useState<string>(() => threads[0]?.id || 'thread_initial');

  useEffect(() => {
    try {
      localStorage.setItem(LS_COPILOT_THREADS, JSON.stringify(threads));
    } catch {
      // ignore storage quota errors
    }
  }, [threads]);

  // Ensure an active thread exists for the current activeEvent
  const eventThreads = useMemo(
    () => threads.filter((t) => t.eventId === (activeEvent?.id || 'default')),
    [threads, activeEvent?.id]
  );

  useEffect(() => {
    if (!activeEvent) return;
    const matching = threads.filter((t) => t.eventId === activeEvent.id);
    if (matching.length === 0) {
      const newThread: CopilotThread = {
        id: `thread_${Date.now()}`,
        eventId: activeEvent.id,
        title: 'Master Strategy & Audit',
        persona: 'general',
        updatedAt: new Date().toISOString(),
        messages: [
          buildWelcomeMessage(
            activeEvent.name,
            formatCurrency(activeEvent.totalBudget, activeEvent.currency)
          ),
        ],
      };
      setThreads((prev) => [newThread, ...prev]);
      setActiveThreadId(newThread.id);
    } else if (!matching.some((t) => t.id === activeThreadId)) {
      setActiveThreadId(matching[0].id);
    }
  }, [activeEvent?.id]);

  const currentThread = useMemo(() => {
    return (
      eventThreads.find((t) => t.id === activeThreadId) ||
      eventThreads[0] ||
      threads[0]
    );
  }, [eventThreads, activeThreadId, threads]);

  const messages = currentThread?.messages || [];

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messages.length, isLoading]);

  if (!activeEvent) {
    return (
      <div className="p-8 text-center text-slate-500">
        No active event selected. Please choose or create an event first.
      </div>
    );
  }

  const contextDigest = buildEventContextDigest(
    activeEvent,
    tasks,
    expenses,
    vendors,
    guests
  );

  const handleDeleteThread = (threadId: string) => {
    if (eventThreads.length <= 1) {
      // Reset the single thread instead of leaving empty
      const freshWelcome = buildWelcomeMessage(
        activeEvent.name,
        formatCurrency(activeEvent.totalBudget, activeEvent.currency)
      );
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId
            ? { ...t, title: 'Master Strategy & Audit', messages: [freshWelcome] }
            : t
        )
      );
      return;
    }
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
    if (activeThreadId === threadId) {
      const remaining = eventThreads.filter((t) => t.id !== threadId);
      if (remaining[0]) setActiveThreadId(remaining[0].id);
    }
  };

  const handleApplyCopilotAction = (msgId: string, action: ProposedCopilotAction) => {
    if (action.applied) return;

    if (action.type === 'add_task') {
      const priorityVal = String(action.payload.priority || 'High');
      const priority: 'Low' | 'Medium' | 'High' =
        priorityVal === 'Low' || priorityVal === 'Medium' ? priorityVal : 'High';
      addTask({
        title: String(action.payload.title || 'Copilot Recommended Task'),
        category: String(action.payload.category || 'Planning'),
        dueDate: String(action.payload.dueDate || activeEvent.startDate),
        priority,
        status: 'Not Started',
        description: String(action.payload.notes || 'Added via Eventora Copilot'),
      });
      setActionToast(`Task added to Timeline: "${String(action.payload.title || 'Task')}"`);
    } else if (action.type === 'add_expense') {
      const statusVal = String(action.payload.paymentStatus || 'Pending');
      const paymentStatus: 'Paid' | 'Pending' | 'Advance Paid' =
        statusVal === 'Paid' || statusVal === 'Advance Paid' ? statusVal : 'Pending';
      addExpense({
        category: String(action.payload.category || 'Emergency contingency'),
        amount: Number(action.payload.amount) || 25000,
        vendorName: String(action.payload.vendorName || 'Eventora Treasury'),
        paymentStatus,
        date: String(action.payload.date || new Date().toISOString().split('T')[0]),
        notes: String(action.payload.notes || action.payload.title || 'Added via Eventora Copilot'),
      });
      setActionToast(`Expense logged in Budget: "${String(action.payload.title || action.payload.category)}"`);
    } else if (action.type === 'add_vendor') {
      const quoted = Number(action.payload.estimatedCost) || 50000;
      addVendor({
        businessName: String(action.payload.name || 'Recommended Specialist Vendor'),
        category: String(action.payload.category || 'Decoration'),
        contactInfo: {
          phone: String(action.payload.phone || '+91 98200 11223'),
          email: String(action.payload.email || 'contact@vendor.in'),
        },
        quotedAmount: quoted,
        advancePayment: 0,
        remainingPayment: quoted,
        bookingStatus: 'Evaluating',
        contractNotes: String(action.payload.notes || 'Shortlisted via Eventora Copilot'),
      });
      setActionToast(`Vendor added to Registry: "${String(action.payload.name || 'Vendor')}"`);
    } else if (action.type === 'add_schedule') {
      const existingSchedule = activeEvent.plan?.timeline?.eventDaySchedule || [];
      updateEventDaySchedule(activeEvent.id, [
        ...existingSchedule,
        {
          time: String(action.payload.time || '15:30 - 16:00'),
          activity: String(action.payload.activity || 'Copilot Operational Cue'),
          notes: String(action.payload.notes || 'Added via Eventora Copilot'),
        },
      ]);
      setActionToast(`Schedule cue added to Master Run-sheet: "${String(action.payload.activity || 'Cue')}"`);
    }

    setTimeout(() => setActionToast(null), 3500);

    // Mark action as applied in thread state
    setThreads((prev) =>
      prev.map((thread) => {
        if (thread.id !== currentThread.id) return thread;
        return {
          ...thread,
          messages: thread.messages.map((m) => {
            if (m.id !== msgId) return m;
            return {
              ...m,
              proposedActions: (m.proposedActions || []).map((a) =>
                a.id === action.id ? { ...a, applied: true } : a
              ),
            };
          }),
        };
      })
    );
  };

  const handleSend = async (customMessage?: string) => {
    const textToSend = (customMessage ?? input).trim();
    if (!textToSend || isLoading) return;

    const userMsg: CopilotChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      persona: selectedPersona,
    };

    const updatedTitle =
      currentThread.messages.length <= 1
        ? textToSend.slice(0, 34) + (textToSend.length > 34 ? '...' : '')
        : currentThread.title;

    setThreads((prev) =>
      prev.map((t) =>
        t.id === currentThread.id
          ? {
              ...t,
              title: updatedTitle,
              updatedAt: new Date().toISOString(),
              messages: [...t.messages, userMsg],
            }
          : t
      )
    );
    if (!customMessage) setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          persona: selectedPersona,
          currentEvent: activeEvent,
          currentPlan: activeEvent.plan,
          tasks,
          expenses,
          vendors,
          guests,
          history: currentThread.messages.slice(-8).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();
      if (data.success && data.reply) {
        const parsed = parseCopilotMessage(data.reply);
        const contextualActions =
          parsed.proposedActions.length > 0
            ? parsed.proposedActions
            : deriveContextualActions(textToSend, activeEvent);

        const assistantMsg: CopilotChatMessage = {
          id: `asst_${Date.now()}`,
          role: 'assistant',
          persona: selectedPersona,
          content: parsed.cleanContent,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestions:
            parsed.suggestions.length > 0
              ? parsed.suggestions
              : [
                  'Reduce my budget by 15%',
                  'Draft a vendor negotiation script',
                  'What should I do this week?',
                ],
          proposedActions: contextualActions,
        };

        setThreads((prev) =>
          prev.map((t) =>
            t.id === currentThread.id
              ? {
                  ...t,
                  updatedAt: new Date().toISOString(),
                  messages: [...t.messages, assistantMsg],
                }
              : t
          )
        );
      } else {
        throw new Error(data.message || 'Copilot failed');
      }
    } catch {
      const fallbackActions = deriveContextualActions(textToSend, activeEvent);
      const fallbackMsg: CopilotChatMessage = {
        id: `asst_${Date.now()}`,
        role: 'assistant',
        persona: selectedPersona,
        content: `### Live Operational Analysis for "${activeEvent.name}"\n\n- **Budget Health**: You have spent **${formatCurrency(contextDigest.totalSpent, activeEvent.currency)}** out of **${formatCurrency(activeEvent.totalBudget, activeEvent.currency)}** (${contextDigest.utilizationPct}% utilized).\n- **Pending Execution**: **${contextDigest.pendingTasksCount} tasks** remain open (${contextDigest.highPriorityPendingCount} High Priority).\n- **Recommendation**: Lock your primary venue and catering SLAs in **${activeEvent.city}** and use the 1-Click Action below to log this milestone immediately.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: [
          'Reduce my budget by 15%',
          'Questions to ask my caterer',
          'Weather contingency checklist',
        ],
        proposedActions: fallbackActions,
      };
      setThreads((prev) =>
        prev.map((t) =>
          t.id === currentThread.id
            ? { ...t, messages: [...t.messages, fallbackMsg] }
            : t
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeakMessage = (msg: CopilotChatMessage) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (speakingMsgId === msg.id) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const cleanSpeech = msg.content.replace(/[#*>_-]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);
    setSpeakingMsgId(msg.id);
    window.speechSynthesis.speak(utterance);
  };

  const quickAuditPrompts = [
    {
      label: '15% Cost-Cutting Audit',
      prompt: 'Reduce my budget by 15% while protecting my top priorities',
      icon: TrendingDown,
      persona: 'budget' as CopilotPersona,
    },
    {
      label: 'Vendor Discount Script',
      prompt: 'Draft a word-for-word vendor negotiation script and contract clauses',
      icon: Briefcase,
      persona: 'vendor' as CopilotPersona,
    },
    {
      label: 'Caterer Inspection Checklist',
      prompt: 'What essential questions should I ask my caterer before paying advance?',
      icon: CheckCircle2,
      persona: 'general' as CopilotPersona,
    },
    {
      label: 'Monsoon / Weather Backup',
      prompt: 'Create a complete weather contingency and generator backup checklist',
      icon: ShieldAlert,
      persona: 'timeline' as CopilotPersona,
    },
    {
      label: `${activeEvent.theme} Decor Concepts`,
      prompt: `Suggest unique ${activeEvent.theme} decoration and lighting ideas for ${activeEvent.city}`,
      icon: Palette,
      persona: 'creative' as CopilotPersona,
    },
  ];

  const activePersonaConfig =
    PERSONA_CONFIG.find((p) => p.id === selectedPersona) || PERSONA_CONFIG[0];

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Action Toast Notification */}
      {actionToast && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-600 text-white text-xs sm:text-sm font-semibold shadow-xl shadow-emerald-600/30 animate-in slide-in-from-bottom-4"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* Top Specialist Mode Selector Bar */}
      <div className="p-3 sm:p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 shrink-0">
            Specialist Mode:
          </span>
          {PERSONA_CONFIG.map((persona) => {
            const Icon = persona.icon;
            const isSelected = selectedPersona === persona.id;
            return (
              <button
                key={persona.id}
                type="button"
                onClick={() => setSelectedPersona(persona.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{persona.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Copilot Grid: Left Chat Studio + Right Live Event Context Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Main Chatbot Column (8 cols) */}
        <div className="lg:col-span-8 h-[calc(100vh-14.5rem)] min-h-[560px] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          {/* Copilot Studio Header */}
          <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-[200px] flex-1">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
                <Sparkles className="w-5 h-5 text-indigo-100" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Eventora Copilot Chatbot
                  </h2>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activePersonaConfig.badgeColor}`}>
                    {activePersonaConfig.label}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Grounded
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Active Event: <strong className="text-slate-700 dark:text-slate-200">{activeEvent.name}</strong> • {activeEvent.city} • {formatCurrency(activeEvent.totalBudget, activeEvent.currency)}
                </p>
              </div>
            </div>

            {/* Saved Thread Selector Dropdown */}
            <div className="flex items-center gap-1.5 shrink-0">
              <select
                aria-label="Select conversation thread"
                value={currentThread?.id || ''}
                onChange={(e) => setActiveThreadId(e.target.value)}
                className="text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-slate-700 dark:text-slate-200 font-medium max-w-[160px] truncate"
              >
                {eventThreads.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.messages.length})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleDeleteThread(currentThread.id)}
                aria-label="Clear or delete current conversation"
                title="Clear conversation"
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${
                    isUser ? 'ml-auto flex-row-reverse max-w-2xl' : 'max-w-3xl'
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-2xl flex items-center justify-center text-xs shrink-0 shadow-xs ${
                      isUser
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white'
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble + Action Cards + Follow-up Chips */}
                  <div className="flex-1 min-w-0 space-y-2.5">
                    <div
                      className={`p-4 rounded-2xl ${
                        isUser
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15 ml-auto'
                          : 'bg-slate-50 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      <FormattedMessageContent content={msg.content} isUser={isUser} />

                      {/* Footer Metadata & Utility Controls */}
                      <div
                        className={`mt-3 pt-2 border-t flex items-center justify-between gap-2 text-[10px] ${
                          isUser
                            ? 'border-indigo-500/40 text-indigo-200'
                            : 'border-slate-200/60 dark:border-slate-700/60 text-slate-400'
                        }`}
                      >
                        <span>{msg.timestamp}</span>

                        {!isUser && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSpeakMessage(msg)}
                              aria-label={speakingMsgId === msg.id ? 'Stop reading message' : 'Read message aloud'}
                              className="hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 cursor-pointer"
                            >
                              {speakingMsgId === msg.id ? (
                                <>
                                  <VolumeX className="w-3 h-3 text-rose-500" />
                                  <span className="text-rose-500 font-semibold">Stop</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-3 h-3" />
                                  <span>Listen</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard?.writeText(msg.content);
                                setCopiedMsgId(msg.id);
                                setTimeout(() => setCopiedMsgId(null), 1500);
                              }}
                              aria-label="Copy response text"
                              className="hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 cursor-pointer"
                            >
                              {copiedMsgId === msg.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-500" />
                                  <span className="text-emerald-500">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 1-Click Executable Copilot Action Cards */}
                    {!isUser && msg.proposedActions && msg.proposedActions.length > 0 && (
                      <div className="space-y-2">
                        {msg.proposedActions.map((act) => (
                          <div
                            key={act.id}
                            className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/70 flex flex-wrap items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-indigo-600/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
                                <Zap className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {act.label}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                  {act.description}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={act.applied}
                              aria-label={
                                act.applied
                                  ? `Applied to Event: ${act.label}`
                                  : `Apply 1-Click Action: ${act.label}`
                              }
                              onClick={() => handleApplyCopilotAction(msg.id, act)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                                act.applied
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 cursor-default'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                              }`}
                            >
                              {act.applied ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Applied to Event</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Apply 1-Click Action</span>
                                </>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Dynamic Follow-Up Suggestion Chips */}
                    {!isUser && msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {msg.suggestions.map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleSend(sug)}
                            className="px-3 py-1 rounded-full text-[11px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <span>{sug}</span>
                            <ChevronRight className="w-3 h-3 opacity-60" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-3 p-4 max-w-sm rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
                <span>
                  Copilot ({activePersonaConfig.shortLabel}) is analyzing "{activeEvent.name}"...
                </span>
              </div>
            )}
          </div>

          {/* Chat Input Composer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                aria-label="Ask Eventora Copilot a question"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask ${activePersonaConfig.label} about ${activeEvent.name} (budget, vendors, menus, timeline)...`}
                className="flex-1 px-4 py-3 rounded-2xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Live Grounded Context & Smart Audit Launcher (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Live Grounded Event Telemetry Card */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Live Grounded Event Context
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                {activeEvent.eventType}
              </span>
            </div>

            {/* Budget Progress */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Budget Utilized</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatCurrency(contextDigest.totalSpent, activeEvent.currency)} /{' '}
                  {formatCurrency(activeEvent.totalBudget, activeEvent.currency)}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    contextDigest.utilizationPct > 90 ? 'bg-rose-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${Math.min(100, contextDigest.utilizationPct)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>{contextDigest.utilizationPct}% committed</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {formatCurrency(contextDigest.remainingBudget, activeEvent.currency)} available
                </span>
              </div>
            </div>

            {/* Operational Counters Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-center">
                <div className="flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-1">
                  <ListTodo className="w-4 h-4" />
                </div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {contextDigest.completedTasks}/{contextDigest.totalTasks}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Tasks Done</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-center">
                <div className="flex items-center justify-center text-violet-600 dark:text-violet-400 mb-1">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {contextDigest.totalVendorsCount}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Vendors</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-center">
                <div className="flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-1">
                  <Users className="w-4 h-4" />
                </div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {activeEvent.guestCount}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Target Guests</div>
              </div>
            </div>
          </div>

          {/* 1-Click Smart Copilot Audits */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>1-Click Smart Copilot Prompts</span>
            </h3>

            <div className="space-y-2">
              {quickAuditPrompts.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      setSelectedPersona(item.persona);
                      handleSend(item.prompt);
                    }}
                    className="w-full p-3 rounded-2xl text-left bg-slate-50 dark:bg-slate-800/70 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200/70 dark:border-slate-700/70 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex items-center justify-between gap-2 group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-2xs shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 truncate">
                          {item.label}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {item.prompt}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
