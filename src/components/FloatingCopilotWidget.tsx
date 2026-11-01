import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  Maximize2,
  User,
  RefreshCw,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import { useEvents } from '../context/EventContext';
import { formatCurrency } from '../utils/budgetCalculations';
import { parseCopilotMessage } from '../utils/copilot-parser';

interface FloatingCopilotWidgetProps {
  currentView: string;
  onOpenFullCopilot: () => void;
}

interface QuickMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
}

export const FloatingCopilotWidget: React.FC<FloatingCopilotWidgetProps> = ({
  currentView,
  onOpenFullCopilot,
}) => {
  const { activeEvent, tasks, expenses, vendors, guests } = useEvents();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [messages, setMessages] = useState<QuickMsg[]>([
    {
      id: 'w_welcome',
      role: 'assistant',
      content: `Hi! I'm **Eventora Copilot**. Ask me anything about **${activeEvent?.name || 'your event'}** or open the full Copilot Studio for 1-click actions!`,
      suggestions: [
        'Reduce my budget by 15%',
        'Draft a vendor negotiation script',
        'What should I do this week?',
      ],
    },
  ]);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages.length, isOpen]);

  // Hide on full copilot view or auth pages to avoid duplicate chat UI
  if (
    currentView === 'copilot' ||
    currentView === 'login' ||
    currentView === 'signup' ||
    !activeEvent
  ) {
    return null;
  }

  const handleQuickSend = async (customText?: string) => {
    const text = (customText ?? input).trim();
    if (!text || isLoading) return;

    const userMsg: QuickMsg = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          persona: 'general',
          currentEvent: activeEvent,
          currentPlan: activeEvent.plan,
          tasks,
          expenses,
          vendors,
          guests,
          history: messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });
      const data = await response.json();
      const parsed = parseCopilotMessage(data.reply || '');
      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content:
            parsed.cleanContent ||
            `For **${activeEvent.name}**, your budget is **${formatCurrency(activeEvent.totalBudget, activeEvent.currency)}** with **${tasks.length} tasks** tracked.`,
          suggestions:
            parsed.suggestions.length > 0
              ? parsed.suggestions.slice(0, 2)
              : ['Questions to ask my caterer', 'Weather contingency checklist'],
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content: `Your active event **${activeEvent.name}** has a budget of **${formatCurrency(activeEvent.totalBudget, activeEvent.currency)}** for **${activeEvent.guestCount} guests** in **${activeEvent.city}**.`,
          suggestions: ['Reduce my budget by 15%', 'What should I do this week?'],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="hidden md:block fixed bottom-6 right-6 z-40">
      {isOpen ? (
        <div
          role="dialog"
          aria-label="Eventora Copilot Mini Chatbot"
          className="w-[340px] sm:w-[380px] h-[480px] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold truncate">Eventora Copilot</div>
                <div className="text-[10px] text-indigo-100 truncate">
                  {activeEvent.name} • {formatCurrency(activeEvent.totalBudget, activeEvent.currency)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenFullCopilot();
                }}
                aria-label="Expand to full Eventora Copilot Studio"
                title="Expand to full Copilot Studio"
                className="p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close Copilot mini chat"
                className="p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={containerRef} className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50/50 dark:bg-slate-950/50">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex items-start gap-2 ${
                  m.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-300'
                  }`}
                >
                  {m.role === 'user' ? <User className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                </div>
                <div className="space-y-1.5 max-w-[82%]">
                  <div
                    className={`p-3 rounded-2xl text-xs leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    {m.content.replace(/###\s+/g, '').replace(/\*\*/g, '')}
                  </div>
                  {m.role === 'assistant' && m.suggestions && m.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {m.suggestions.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleQuickSend(s)}
                          className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 flex items-center gap-0.5 cursor-pointer"
                        >
                          <span>{s}</span>
                          <ChevronRight className="w-2.5 h-2.5" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-500 p-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>Copilot is thinking...</span>
              </div>
            )}
          </div>

          {/* Footer Input */}
          <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleQuickSend();
              }}
              className="flex items-center gap-1.5"
            >
              <input
                type="text"
                aria-label="Quick message to Eventora Copilot"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Copilot..."
                className="flex-1 px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                aria-label="Send quick message"
                className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenFullCopilot();
              }}
              className="w-full py-1 text-center text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Open Full Eventora Copilot Studio →
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open Eventora Copilot Chatbot"
          className="hidden md:flex px-4 py-3 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs shadow-xl shadow-indigo-600/30 items-center gap-2 hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Ask Copilot AI</span>
        </button>
      )}
    </div>
  );
};
