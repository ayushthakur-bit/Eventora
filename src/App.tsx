import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EventProvider, useEvents } from './context/EventContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LandingPage } from './components/LandingPage';
import { DashboardView } from './components/DashboardView';
import { EventOverviewView } from './components/EventOverviewView';
import { AIGeneratedPlanView } from './components/AIGeneratedPlanView';
import { WhatIfPlannerView } from './components/WhatIfPlannerView';
import { BudgetManagementView } from './components/BudgetManagementView';
import { TimelineTasksView } from './components/TimelineTasksView';
import { VendorManagementView } from './components/VendorManagementView';
import { GuestManagementView } from './components/GuestManagementView';
import { EventEaseCopilotView } from './components/EventEaseCopilotView';
import { InvitationStudioView } from './components/InvitationStudioView';
import { ProfileSettingsView } from './components/ProfileSettingsView';
import { CreateEventWizard } from './components/CreateEventWizard';
import { AuthPage } from './components/auth/AuthPage';
import { DataManagementView } from './components/DataManagementView';
import { EventDetailsControlModal } from './components/EventDetailsControlModal';
import { EventData } from './types';
import { Menu, X, ArrowLeft } from 'lucide-react';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const { activeEvent, setActiveEventId } = useEvents();

  // Navigation State — require sign-in on first visit when unauthenticated
  const [currentView, setCurrentView] = useState<string>(() =>
    isAuthenticated ? 'landing' : 'login'
  );
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);
  const [isControlModalOpen, setIsControlModalOpen] = useState(false);
  const [controlEventId, setControlEventId] = useState<string | null>(null);

  // Dark Mode State with complete persistence
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('eventease_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (darkMode) {
      root.classList.add('dark');
      body.classList.add('dark');
      root.style.colorScheme = 'dark';
      localStorage.setItem('eventease_theme', 'dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
      root.style.colorScheme = 'light';
      localStorage.setItem('eventease_theme', 'light');
    }
  }, [darkMode]);

  // Support ?autostart=1 or ?view=login query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'login' || params.get('view') === 'auth') {
      setCurrentView('login');
    } else if (params.get('view') === 'signup') {
      setCurrentView('signup');
    } else if (params.get('autostart') === '1') {
      setCurrentView(isAuthenticated ? 'dashboard' : 'login');
    } else if (params.get('view') === 'data-management' || params.get('view') === 'data') {
      setCurrentView(isAuthenticated ? 'data-management' : 'login');
    } else if (params.get('view') === 'copilot' || params.get('view') === 'chat') {
      setCurrentView(isAuthenticated ? 'copilot' : 'login');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [currentView]);

  // Require sign-in for any non-public view
  useEffect(() => {
    const publicViews = new Set(['landing', 'login', 'signup']);
    if (!isAuthenticated && !publicViews.has(currentView)) {
      setCurrentView('login');
      return;
    }

    const eventRequiredViews = new Set([
      'overview',
      'ai-plan',
      'what-if',
      'budget',
      'tasks',
      'vendors',
      'guests',
      'copilot',
      'invitations',
    ]);
    if (isAuthenticated && !activeEvent && eventRequiredViews.has(currentView)) {
      setCurrentView('dashboard');
    }
  }, [isAuthenticated, activeEvent, currentView]);

  const requireAuth = (action: () => void) => {
    if (!isAuthenticated) {
      setCurrentView('login');
      return;
    }
    action();
  };

  const handleOpenControlEvent = (id?: string) => {
    requireAuth(() => {
      const validId = typeof id === 'string' ? id : activeEvent?.id || null;
      setControlEventId(validId);
      setIsControlModalOpen(true);
    });
  };

  const handleOpenEvent = (id: string, view = 'overview') => {
    requireAuth(() => {
      setActiveEventId(id);
      setCurrentView(view);
    });
  };

  const handleEventCreated = (newEvent: EventData) => {
    setActiveEventId(newEvent.id);
    setCurrentView('overview');
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''} bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200`}>
      {/* Accessible Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-indigo-600 focus:text-white focus:font-bold focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Top Navigation */}
      <Navbar
        onOpenCreateWizard={() => requireAuth(() => setIsCreateWizardOpen(true))}
        onOpenAuth={() => setCurrentView('login')}
        onOpenControlModal={handleOpenControlEvent}
        currentView={currentView}
        setCurrentView={setCurrentView}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      {/* Main Content Layout */}
      {currentView === 'login' ? (
        <main id="main-content" className="flex-1">
          <AuthPage
            initialMode="login"
            onNavigateHome={() => setCurrentView('landing')}
            onNavigateDashboard={() => setCurrentView('dashboard')}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
        </main>
      ) : currentView === 'signup' ? (
        <main id="main-content" className="flex-1">
          <AuthPage
            initialMode="signup"
            onNavigateHome={() => setCurrentView('landing')}
            onNavigateDashboard={() => setCurrentView('dashboard')}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
        </main>
      ) : currentView === 'landing' ? (
        <main id="main-content" className="flex-1">
          <LandingPage
            onPlanEvent={() => requireAuth(() => setIsCreateWizardOpen(true))}
            onExploreDashboard={() => requireAuth(() => setCurrentView('dashboard'))}
            onOpenAuth={(m) => setCurrentView(m === 'signup' ? 'signup' : 'login')}
          />
        </main>
      ) : (
        <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6 relative">
          {/* Mobile Sidebar Toggle Button */}
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="md:hidden absolute top-6 right-4 sm:right-6 z-40 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-500/30 shadow-sm shadow-indigo-600/25 active:scale-95 transition-all cursor-pointer"
            aria-label={isMobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileOpen}
          >
            {isMobileOpen ? (
              <>
                <X className="w-4 h-4" />
                <span>Close</span>
              </>
            ) : (
              <>
                <Menu className="w-4 h-4" />
                <span>Menu</span>
              </>
            )}
          </button>

          {/* Desktop & Mobile Sidebar */}
          <Sidebar
            currentView={currentView}
            setCurrentView={setCurrentView}
            isMobileOpen={isMobileOpen}
            setIsMobileOpen={setIsMobileOpen}
            onOpenControlModal={handleOpenControlEvent}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />

          {/* View Container */}
          <main id="main-content" className="flex-1 min-w-0 pb-16">
            <div className="mb-4 flex items-center pr-24 md:pr-0">
              <button
                onClick={() => setCurrentView('landing')}
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Back to Homepage</span>
              </button>
            </div>

            {currentView === 'dashboard' && (
              <DashboardView
                onOpenCreateWizard={() => setIsCreateWizardOpen(true)}
                onOpenEvent={handleOpenEvent}
                onOpenControlModal={handleOpenControlEvent}
                onNavigate={(view) => setCurrentView(view)}
              />
            )}

            {currentView === 'overview' && (
              <EventOverviewView
                onNavigate={(view) => setCurrentView(view)}
                onOpenControlModal={handleOpenControlEvent}
              />
            )}

            {currentView === 'ai-plan' && <AIGeneratedPlanView />}

            {currentView === 'what-if' && <WhatIfPlannerView />}

            {currentView === 'budget' && <BudgetManagementView />}

            {currentView === 'tasks' && <TimelineTasksView />}

            {currentView === 'vendors' && <VendorManagementView />}

            {currentView === 'guests' && <GuestManagementView />}

            {currentView === 'copilot' && <EventEaseCopilotView />}

            {currentView === 'invitations' && <InvitationStudioView />}

            {currentView === 'data-management' && <DataManagementView />}

            {currentView === 'profile' && (
              <ProfileSettingsView darkMode={darkMode} setDarkMode={setDarkMode} />
            )}
          </main>
        </div>
      )}

      {/* Global Modals */}
      <CreateEventWizard
        isOpen={isCreateWizardOpen}
        onClose={() => setIsCreateWizardOpen(false)}
        onEventCreated={handleEventCreated}
      />

      <EventDetailsControlModal
        isOpen={isControlModalOpen}
        onClose={() => setIsControlModalOpen(false)}
        eventId={controlEventId}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <EventProvider>
        <AppContent />
      </EventProvider>
    </AuthProvider>
  );
}
