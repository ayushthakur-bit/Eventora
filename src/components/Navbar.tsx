import React, { useState } from 'react';
import {
  Sparkles,
  Calendar,
  PlusCircle,
  Sun,
  Moon,
  User,
  LogOut,
  ChevronDown,
  Layers,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../context/EventContext';
import { formatCurrency } from '../utils/budgetCalculations';

interface NavbarProps {
  onOpenCreateWizard: () => void;
  onOpenAuth: () => void;
  onOpenControlModal?: () => void;
  currentView: string;
  setCurrentView: (view: string) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCreateWizard,
  onOpenAuth,
  onOpenControlModal,
  currentView,
  setCurrentView,
  darkMode,
  setDarkMode,
}) => {
  const { currentUser, isAuthenticated, logout } = useAuth();
  const { events, activeEventId, activeEvent, setActiveEventId } = useEvents();
  const [showEventDropdown, setShowEventDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentView('landing')}
            className="flex items-center gap-2.5 text-left focus:outline-none group"
            aria-label="Eventora Home"
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <img
                src="/assets/aistudio/WhatsApp_Image_2026-11-01_at_12.11.57_54d52026.jpeg"
                alt="Eventora Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-500">Eventora</span>
              </span>
              <span className="hidden sm:block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Your Vision. Your Budget. Your Perfect Event.
              </span>
            </div>
          </button>
        </div>

        {/* Center / Event Selector if logged in */}
        {isAuthenticated && events.length > 0 && currentView !== 'landing' && (
          <div className="relative hidden md:block">
            <button
              onClick={() => setShowEventDropdown(!showEventDropdown)}
              className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors"
              aria-expanded={showEventDropdown}
              aria-label="Select active event"
            >
              <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="max-w-[200px] truncate">
                {activeEvent ? activeEvent.name : 'Select Event'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showEventDropdown && (
              <div
                className="absolute left-0 mt-2 w-72 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2"
                onMouseLeave={() => setShowEventDropdown(false)}
              >
                <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Switch Active Event
                </div>
                {events.map((evt) => (
                  <button
                    key={evt.id}
                    onClick={() => {
                      setActiveEventId(evt.id);
                      setShowEventDropdown(false);
                      if (currentView === 'landing') setCurrentView('dashboard');
                    }}
                    className={`w-full text-left px-3.5 py-2 text-sm flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors ${
                      evt.id === activeEventId ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-medium' : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="truncate">{evt.name}</div>
                      <div className="text-xs text-slate-400 font-normal">
                        {evt.eventType} • {formatCurrency(evt.totalBudget, evt.currency)}
                      </div>
                    </div>
                    {evt.id === activeEventId && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
                    )}
                  </button>
                ))}
                {activeEvent && (
                  <div className="border-t border-slate-100 dark:border-slate-700/50 mt-1 pt-1 px-2">
                    <button
                      onClick={() => {
                        setShowEventDropdown(false);
                        onOpenControlModal?.();
                      }}
                      className="w-full text-left px-2 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded flex items-center gap-1.5"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" /> Control Event Details
                    </button>
                  </div>
                )}
                <div className="border-t border-slate-100 dark:border-slate-700/50 mt-1 pt-1 px-2">
                  <button
                    onClick={() => {
                      setShowEventDropdown(false);
                      onOpenCreateWizard();
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded flex items-center gap-1.5"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> + Plan New Event
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Right Action Icons & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Plan Event Button */}
          <button
            onClick={onOpenCreateWizard}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            aria-label="Create New Event"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Plan Event</span>
          </button>

          {/* Dark / Light Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 sm:px-2.5 sm:py-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
            <span className="text-xs font-semibold select-none">
              {darkMode ? 'Light' : 'Dark'}
            </span>
          </button>

          {/* User Account Menu */}
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 p-1 rounded-full border border-slate-200 dark:border-slate-700 hover:ring-2 hover:ring-indigo-500/30 transition-all"
                aria-label="User Account Menu"
                aria-expanded={showUserDropdown}
              >
                <img
                  src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                  alt={currentUser?.name || 'User'}
                  className="w-8 h-8 rounded-full object-cover"
                />
              </button>

              {showUserDropdown && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2"
                  onMouseLeave={() => setShowUserDropdown(false)}
                >
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {currentUser?.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {currentUser?.email}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      setCurrentView('profile');
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    <span>Profile & Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      setCurrentView('dashboard');
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                  >
                    <Layers className="w-4 h-4 text-slate-400" />
                    <span>My Events</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      setCurrentView('login');
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    <span>Login & Auth Center</span>
                  </button>

                  <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        logout();
                        setCurrentView('login');
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setCurrentView('signup')}
                className={`hidden sm:inline-flex px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                  currentView === 'signup'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60'
                }`}
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
