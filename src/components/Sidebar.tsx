import React from 'react';
import {
  LayoutDashboard,
  Compass,
  FileSpreadsheet,
  GitBranch,
  Wallet,
  CheckSquare,
  Users,
  Store,
  BotMessageSquare,
  MailOpen,
  Settings,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import { useEvents } from '../context/EventContext';
import { formatCurrency } from '../utils/budgetCalculations';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  onOpenControlModal?: () => void;
  darkMode?: boolean;
  setDarkMode?: (val: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setCurrentView,
  isMobileOpen,
  setIsMobileOpen,
  onOpenControlModal,
  darkMode,
  setDarkMode,
}) => {
  const { activeEvent } = useEvents();

  const navItems = [
    { id: 'dashboard', label: 'All Events', icon: LayoutDashboard },
    { id: 'overview', label: 'Event Overview', icon: Compass, requireEvent: true },
    { id: 'ai-plan', label: 'AI Master Plan', icon: FileSpreadsheet, requireEvent: true },
    {
      id: 'what-if',
      label: 'What-If Planner',
      icon: GitBranch,
      requireEvent: true,
      badge: 'Signature',
    },
    { id: 'budget', label: 'Budget & Expenses', icon: Wallet, requireEvent: true },
    { id: 'tasks', label: 'Tasks & Timeline', icon: CheckSquare, requireEvent: true },
    { id: 'vendors', label: 'Vendors', icon: Store, requireEvent: true },
    { id: 'guests', label: 'Guest List & RSVPs', icon: Users, requireEvent: true },
    { id: 'copilot', label: 'Eventora Copilot', icon: BotMessageSquare, requireEvent: true, badge: 'AI' },
    { id: 'invitations', label: 'Invitation Studio', icon: MailOpen, requireEvent: true },
    { id: 'profile', label: 'Settings & Profile', icon: Settings },
  ];

  const handleNavClick = (id: string) => {
    setCurrentView(id);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-30 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-16 left-0 z-30 h-[calc(100vh-4rem)] w-64 bg-slate-50/80 dark:bg-slate-900/80 border-r border-slate-200 dark:border-slate-800 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col justify-between p-4 overflow-y-auto backdrop-blur-sm`}
      >
        <div className="space-y-4">
          {/* Active Event Mini Pill */}
          {activeEvent && (
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/20 border border-indigo-100 dark:border-indigo-900/50">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Active Event
                </span>
                <button
                  onClick={onOpenControlModal}
                  className="p-1 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 transition-colors"
                  title="Control Event Details"
                  aria-label="Control Event Details"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate mt-0.5">
                {activeEvent.name}
              </h2>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span>{activeEvent.eventType}</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(activeEvent.totalBudget, activeEvent.currency)}
                </span>
              </div>
              <button
                onClick={onOpenControlModal}
                className="mt-2 w-full py-1.5 px-2 rounded-lg text-[11px] font-semibold bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center justify-center gap-1.5 transition-all shadow-2xs"
              >
                <SlidersHorizontal className="w-3 h-3 text-indigo-500" />
                <span>Control Event Details</span>
              </button>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1" aria-label="Sidebar Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              const isDisabled = item.requireEvent && !activeEvent;

              return (
                <button
                  key={item.id}
                  onClick={() => !isDisabled && handleNavClick(item.id)}
                  disabled={isDisabled}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                      : isDisabled
                      ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.badge && (
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-indigo-500 text-white'
                            : item.badge === 'Signature'
                            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white'
                            : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Tagline */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <div className="text-[11px] text-slate-400 dark:text-slate-500 text-center">
            Eventora v2.4 • Gemini Powered
          </div>
        </div>
      </aside>
    </>
  );
};
