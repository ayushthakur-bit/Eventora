import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  GitBranch,
  Wallet,
  Calendar,
  CheckCircle2,
  Users,
  ShieldCheck,
  Languages,
  Clock,
  ChevronRight,
  Zap,
  RotateCcw,
  Sliders,
  DollarSign,
  TrendingDown,
  CloudRain,
  Music2,
  Award,
  Check,
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { useEvents } from '../context/EventContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/budgetCalculations';

interface LandingPageProps {
  onPlanEvent: () => void;
  onExploreDashboard: () => void;
  onOpenAuth?: (mode?: 'login' | 'signup') => void;
}

// Scenarios for the Interactive What-If Simulator
const WHAT_IF_SCENARIOS = [
  {
    id: 'budget-cut',
    title: 'Budget Cut (-20%)',
    icon: TrendingDown,
    tag: 'Financial Audit',
    color: 'from-amber-500 to-rose-500',
    query: '“Our family budget dropped by ₹3,00,000. Protect our dream photographer, but trim decor and catering non-essentials.”',
    originalBudget: 1500000,
    newBudget: 1200000,
    diff: '-₹3,00,000 (-20%)',
    priorityPreserved: 'Photography & Videography (100% Protected at ₹1,40,000)',
    allocations: [
      { category: 'Catering & Live Counters', before: '₹4,20,000', after: '₹3,40,000', change: '-19%', pct: 28 },
      { category: 'Floral & Mandap Decor', before: '₹2,10,000', after: '₹1,50,000', change: '-28%', pct: 13 },
      { category: 'Sound, Lights & DJ', before: '₹1,10,000', after: '₹90,000', change: '-18%', pct: 8 },
      { category: 'Emergency Reserve', before: '₹80,000', after: '₹60,000', change: 'Retained 5%', pct: 5 },
    ],
  },
  {
    id: 'guest-surge',
    title: 'Guest Surge (+50 Guests)',
    icon: Users,
    tag: 'Capacity Scaling',
    color: 'from-blue-500 to-indigo-500',
    query: '“Extended family confirmed attendance. Guests increased from 200 to 250 without expanding our total budget.”',
    originalBudget: 1000000,
    newBudget: 1000000,
    diff: '₹0 (Zero Budget Overrun)',
    priorityPreserved: 'Per-Plate Food Standard Maintained with Bulk Vendor Discount',
    allocations: [
      { category: 'Catering Scale (250 Pax)', before: '₹3,50,000', after: '₹4,10,000', change: '+₹60k via Tier-2 menu', pct: 41 },
      { category: 'Invitations & Digital RSVPs', before: '₹35,000', after: '₹15,000', change: 'Switched to WhatsApp Cards', pct: 2 },
      { category: 'Favors & Welcome Hampers', before: '₹60,000', after: '₹45,000', change: 'Streamlined per hamper', pct: 5 },
      { category: 'Contingency Allocation', before: '₹75,000', after: '₹50,000', change: 'Buffered', pct: 5 },
    ],
  },
  {
    id: 'rain-plan',
    title: 'Monsoon Indoors Shift',
    icon: CloudRain,
    tag: 'Contingency Pivot',
    color: 'from-violet-500 to-cyan-500',
    query: '“Sudden monsoon warning 48h prior. Must relocate open-air lawn reception to indoor banquet hall.”',
    originalBudget: 1250000,
    newBudget: 1250000,
    diff: 'Zero Last-Minute Surcharge',
    priorityPreserved: 'All 6 Timeline Milestones Intact with AC Hall Provisioning',
    allocations: [
      { category: 'Banquet Hall Transition', before: '₹3,80,000', after: '₹4,10,000', change: 'AC Hall Surcharge absorbed', pct: 33 },
      { category: 'Outdoor Waterproofing Tent', before: '₹90,000', after: '₹0', change: 'Fully Refunded/Cancelled', pct: 0 },
      { category: 'Indoor Acoustic & Lighting', before: '₹80,000', after: '₹1,10,000', change: 'Enhanced indoor mood wash', pct: 9 },
      { category: 'Logistics Valet Shuttle', before: '₹40,000', after: '₹55,000', change: 'Covered guest drop-off', pct: 4 },
    ],
  },
  {
    id: 'artist-addon',
    title: 'Live Band / Celebrity DJ',
    icon: Music2,
    tag: 'Entertainment Upgrade',
    color: 'from-fuchsia-500 to-amber-500',
    query: '“We want to add a premium live acoustic band for the cocktail hour for ₹80,000 without exceeding budget.”',
    originalBudget: 800000,
    newBudget: 800000,
    diff: 'Balanced to 0.00 Variance',
    priorityPreserved: 'Live Band Contract Secured & Sound Rider Integrated',
    allocations: [
      { category: 'Live Music & Performance', before: '₹40,000', after: '₹1,20,000', change: '+₹80,000 Upgraded', pct: 15 },
      { category: 'Printed Paper Stationery', before: '₹45,000', after: '₹15,000', change: 'Switched to QR Codes', pct: 2 },
      { category: 'Table Centerpiece Rentals', before: '₹60,000', after: '₹35,000', change: 'Minimalist Candle Aesthetic', pct: 4 },
      { category: 'Alcohol Bar Optimization', before: '₹1,80,000', after: '₹1,55,000', change: 'Bulk distributor direct rate', pct: 19 },
    ],
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onPlanEvent,
  onExploreDashboard,
  onOpenAuth,
}) => {
  const { events, setActiveEventId } = useEvents();
  const { isAuthenticated } = useAuth();

  // Interactive Live Estimator State
  const [selectedEventType, setSelectedEventType] = useState('Wedding');
  const [guestCount, setGuestCount] = useState(150);
  const [targetBudget, setTargetBudget] = useState(800000);

  // What-If Simulator Active Scenario
  const [activeScenarioId, setActiveScenarioId] = useState('budget-cut');
  const [isSimulating, setIsSimulating] = useState(false);

  // Blueprint Category Filter
  const [blueprintCategory, setBlueprintCategory] = useState<'All' | 'Wedding' | 'Birthday' | 'Corporate'>('All');

  const activeScenario = WHAT_IF_SCENARIOS.find((s) => s.id === activeScenarioId) || WHAT_IF_SCENARIOS[0];

  const handleSelectSample = (id: string) => {
    setActiveEventId(id);
    onExploreDashboard();
  };

  const triggerCelebration = (e?: React.MouseEvent) => {
    if (e) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;
      confetti({
        particleCount: 65,
        spread: 70,
        origin: { x, y },
        colors: ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'],
      });
    } else {
      confetti({
        particleCount: 75,
        spread: 90,
        origin: { y: 0.7 },
        colors: ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'],
      });
    }
  };

  const handleSimulateClick = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      triggerCelebration();
    }, 900);
  };

  const filteredEvents = events.filter((evt) => {
    if (blueprintCategory === 'All') return true;
    if (blueprintCategory === 'Wedding') return evt.eventType.toLowerCase().includes('wedding') || evt.eventType.toLowerCase().includes('reception');
    if (blueprintCategory === 'Birthday') return evt.eventType.toLowerCase().includes('birthday') || evt.eventType.toLowerCase().includes('anniversary');
    if (blueprintCategory === 'Corporate') return evt.eventType.toLowerCase().includes('corporate') || evt.eventType.toLowerCase().includes('gala') || evt.eventType.toLowerCase().includes('conference');
    return true;
  });

  // Calculate live breakdown for interactive estimator
  const estVenue = Math.round(targetBudget * 0.35);
  const estCatering = Math.round(targetBudget * 0.32);
  const estDecor = Math.round(targetBudget * 0.15);
  const estMedia = Math.round(targetBudget * 0.10);
  const estBuffer = Math.round(targetBudget * 0.08);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Dynamic Animated Ambient Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          animate={{
            x: [0, 40, 0],
            y: [0, -30, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/10 blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -50, 0],
            y: [0, 40, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-1/3 -right-40 w-[28rem] h-[28rem] rounded-full bg-gradient-to-bl from-violet-600/15 via-fuchsia-500/10 to-transparent blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, 30, 0],
            y: [0, 25, 0],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute bottom-20 left-1/4 w-80 h-80 rounded-full bg-gradient-to-tr from-emerald-500/10 via-cyan-500/10 to-transparent blur-3xl"
        />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-12 pb-20 lg:pt-16 lg:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto relative">
            {/* Pill Tags & Quick Value Highlights */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-wrap items-center justify-center gap-2.5 mb-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/80 dark:to-violet-950/80 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300 shadow-sm">
                <motion.div
                  animate={{ rotate: [0, 180, 360] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                </motion.div>
                <span>Next-Gen Event Architecture • Powered by Google Gemini AI</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 shadow-xs">
                <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
                <span>₹1.2L Avg. Savings</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800 text-xs font-semibold text-violet-700 dark:text-violet-300 shadow-xs">
                <Zap className="w-3.5 h-3.5 text-violet-500 fill-violet-500" />
                <span>0.8s What-If Simulator</span>
              </div>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]"
            >
              Your Vision.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-500 underline decoration-indigo-400/30 decoration-wavy decoration-2">
                Your Budget.
              </span>{' '}
              <br className="hidden sm:inline" />
              Your Perfect Event.
            </motion.h1>

            {/* Subheading */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed font-normal max-w-2xl mx-auto"
            >
              Say goodbye to stressful spreadsheets and budget leaks. Eventora crafts tailored
              schedules, mathematically balanced budgets, and intelligent What-If simulations for weddings,
              parties, and milestones.
            </motion.p>

            {/* Primary Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.96 }}
                onClick={(e) => {
                  triggerCelebration(e);
                  onPlanEvent();
                }}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-base text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/40 transition-all flex items-center justify-center gap-2 group relative overflow-hidden"
                aria-label="Start Event Creation Wizard"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                <span>Plan My Event with AI</span>
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={onExploreDashboard}
                className="w-full sm:w-auto px-7 py-4 rounded-2xl font-bold text-base text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isAuthenticated ? 'Open My Dashboard' : 'Explore Live Demo'}</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </motion.button>

              {!isAuthenticated && onOpenAuth && (
                <motion.button
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onOpenAuth('login')}
                  className="w-full sm:w-auto px-6 py-4 rounded-2xl font-bold text-base text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>Login / Sign Up</span>
                </motion.button>
              )}
            </motion.div>

            {/* Trust and Key Capabilities Badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mt-10 pt-8 border-t border-slate-200/80 dark:border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left"
            >
              {[
                { icon: CheckCircle2, label: 'Guaranteed Budget Math', color: 'text-emerald-500' },
                { icon: GitBranch, label: 'What-If Simulation Engine', color: 'text-violet-500' },
                { icon: Languages, label: 'EN, Hindi & Gujarati Invites', color: 'text-amber-500' },
                { icon: ShieldCheck, label: 'Zero Unexpected Leaks', color: 'text-indigo-500' },
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ y: -2 }}
                  className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/60 dark:hover:bg-slate-900/60 transition-colors"
                >
                  <item.icon className={`w-4 h-4 ${item.color} shrink-0`} />
                  <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium">
                    {item.label}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Featured Event Cover Showcase Photo */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="mt-12 max-w-5xl mx-auto relative rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-2xl group"
          >
            <img
              src="/assets/aistudio/event_cover_photo_9af63a2f.webp"
              alt="Enchanted Evening Floral Arch & Candlelit Event Setup"
              className="w-full h-[320px] sm:h-[440px] lg:h-[520px] object-cover object-center group-hover:scale-[1.02] transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 inset-x-0 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-white">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold text-amber-200 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Featured Celebration Showcase</span>
                </span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                  Enchanted Evening Floral Arch & Candlelit Aisle
                </h2>
                <p className="text-xs sm:text-sm text-slate-200/90 mt-0.5">
                  Designed with Eventora — Balanced decor, ambient lighting, and seating layout.
                </p>
              </div>
              <button
                type="button"
                onClick={onPlanEvent}
                className="self-start sm:self-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-white/95 text-slate-900 hover:bg-white shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <span>Plan a Similar Event</span>
                <ArrowRight className="w-4 h-4 text-indigo-600" />
              </button>
            </div>
          </motion.div>

          {/* Interactive Live Event Blueprint Estimator Widget */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-12 max-w-4xl mx-auto rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-2xl backdrop-blur-xl p-6 sm:p-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800 gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold mb-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Interactive Live Calculator</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  Instant AI Budget Distribution Preview
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Slide guests and target budget to see how our algorithm balances allocations in real time.
                </p>
              </div>

              {/* Event Type Selector Pills */}
              <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
                {['Wedding', 'Birthday', 'Gala', 'Corporate'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedEventType(type)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      selectedEventType === type
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Slider Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
              <div>
                <div className="flex justify-between items-center text-xs font-bold mb-2">
                  <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-500" />
                    Guest Count:
                  </span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-mono text-sm bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                    {guestCount} Attendees
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="600"
                  step="10"
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                />
                <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                  <span>Intimate (20)</span>
                  <span>Grand Celebration (600)</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-bold mb-2">
                  <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                    Estimated Budget:
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono text-sm bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                    {formatCurrency(targetBudget, 'INR')}
                  </span>
                </div>
                <input
                  type="range"
                  min="200000"
                  max="3500000"
                  step="50000"
                  value={targetBudget}
                  onChange={(e) => setTargetBudget(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                />
                <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                  <span>₹2,00,000</span>
                  <span>₹35,00,000+</span>
                </div>
              </div>
            </div>

            {/* Live Visual Allocation Bar with Smooth Animation */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span>Calculated Category Quotas</span>
                <span className="text-emerald-600 dark:text-emerald-400">100% Balanced</span>
              </div>
              <div className="h-4 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex shadow-inner">
                <motion.div
                  animate={{ width: '35%' }}
                  className="bg-indigo-600 h-full"
                  title="Venue & Spaces: 35%"
                />
                <motion.div
                  animate={{ width: '32%' }}
                  className="bg-emerald-500 h-full"
                  title="Catering & Bar: 32%"
                />
                <motion.div
                  animate={{ width: '15%' }}
                  className="bg-violet-500 h-full"
                  title="Decor & Ambience: 15%"
                />
                <motion.div
                  animate={{ width: '10%' }}
                  className="bg-amber-500 h-full"
                  title="Photo & Media: 10%"
                />
                <motion.div
                  animate={{ width: '8%' }}
                  className="bg-slate-400 dark:bg-slate-600 h-full"
                  title="Buffer Reserve: 8%"
                />
              </div>

              {/* Category Quick Tags */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-3">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                  <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    Venue (35%)
                  </div>
                  <div className="font-bold text-slate-800 dark:text-white mt-1">
                    {formatCurrency(estVenue, 'INR')}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Catering (32%)
                  </div>
                  <div className="font-bold text-slate-800 dark:text-white mt-1">
                    {formatCurrency(estCatering, 'INR')}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                  <div className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-violet-500" />
                    Decor (15%)
                  </div>
                  <div className="font-bold text-slate-800 dark:text-white mt-1">
                    {formatCurrency(estDecor, 'INR')}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Photo (10%)
                  </div>
                  <div className="font-bold text-slate-800 dark:text-white mt-1">
                    {formatCurrency(estMedia, 'INR')}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    Buffer (8%)
                  </div>
                  <div className="font-bold text-slate-800 dark:text-white mt-1">
                    {formatCurrency(estBuffer, 'INR')}
                  </div>
                </div>
              </div>

              {/* Action row inside estimator */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  Approx. <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(Math.round(targetBudget / guestCount), 'INR')}</strong> per guest experience
                </span>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={(e) => {
                    triggerCelebration(e);
                    onPlanEvent();
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-2 shadow-md transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Full AI Blueprint with These Numbers</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Signature What-If Feature Spotlight with Animated Interactive Simulator */}
      <section className="py-20 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Column: Description & Explanation */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-5 space-y-5"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-950/80 text-xs font-semibold text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                <GitBranch className="w-3.5 h-3.5" />
                <span>Signature Differentiating Feature</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                The What-If Event Planner
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
                Life doesn't stick to a rigid script. Whether your budget drops by ₹3,00,000, guest
                count doubles, or sudden monsoon showers force you indoors, Eventora dynamically recalibrates
                every single vendor quota and milestone in seconds.
              </p>

              <div className="space-y-3 pt-2">
                <motion.div
                  whileHover={{ x: 4 }}
                  className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 transition-transform"
                >
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5 font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Protects Your Non-Negotiables</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Keep your dream photography, live band, or gourmet menu untouched while mathematically trimming discretionary areas.
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ x: 4 }}
                  className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 transition-transform"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Before & After Math Auditing</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Preview exact category variances before applying updates with 1-click snapshot restore.
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* Right Column: Interactive Scenario Simulator Card with Tabs */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-7"
            >
              {/* Scenario Selector Tabs */}
              <div className="flex flex-wrap gap-2 mb-3">
                {WHAT_IF_SCENARIOS.map((sc) => {
                  const Icon = sc.icon;
                  const isActive = activeScenarioId === sc.id;
                  return (
                    <motion.button
                      key={sc.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveScenarioId(sc.id)}
                      className={`relative px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{sc.title}</span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Main Simulated Terminal / Card */}
              <div className="rounded-3xl border border-slate-700/80 bg-slate-950 text-white p-6 sm:p-7 shadow-2xl relative overflow-hidden">
                {/* Glowing top line accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-emerald-400" />

                {/* Card Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block animate-pulse" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                    <span className="text-xs font-mono text-slate-400 ml-2">Eventora Scenario Engine v2.4</span>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-indigo-950 border border-indigo-700 text-indigo-300 font-mono font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                    LIVE SIMULATOR
                  </span>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeScenario.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    {/* Prompt Box */}
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                        <span>User Scenario Query</span>
                        <span className="text-violet-400 font-bold">{activeScenario.tag}</span>
                      </div>
                      <p className="text-sm text-indigo-200 font-medium mt-1.5 leading-relaxed">
                        {activeScenario.query}
                      </p>
                    </div>

                    {/* High-Level Delta Cards */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                        <div className="text-slate-400 font-medium">Original Budget Target</div>
                        <div className="text-lg font-bold text-slate-300 mt-0.5">
                          {formatCurrency(activeScenario.originalBudget, 'INR')}
                        </div>
                        <div className="text-[11px] text-amber-400 font-medium mt-1">
                          Variance: {activeScenario.diff}
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                        <div className="text-slate-400 font-medium">Protected Priority</div>
                        <div className="text-xs font-bold text-emerald-400 mt-1 line-clamp-2">
                          {activeScenario.priorityPreserved}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">✓ Verified zero degradation</div>
                      </div>
                    </div>

                    {/* Allocated Adjustments with Animated Progress Bars */}
                    <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                      <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider font-mono">
                        Automated AI Reallocations:
                      </div>

                      <div className="space-y-2.5">
                        {activeScenario.allocations.map((item, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-200 font-medium">{item.category}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400 line-through text-[11px]">{item.before}</span>
                                <span className="text-emerald-400 font-bold">{item.after}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono">
                                  {item.change}
                                </span>
                              </div>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${item.pct * 2.5}%` }}
                                transition={{ duration: 0.6, delay: idx * 0.1 }}
                                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Action Row */}
                    <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSimulateClick}
                        disabled={isSimulating}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/30"
                      >
                        {isSimulating ? (
                          <>
                            <RotateCcw className="w-4 h-4 animate-spin text-indigo-200" />
                            <span>Simulating Mathematical Rebalance...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 fill-white" />
                            <span>Run AI Rebalance Calculation</span>
                          </>
                        )}
                      </motion.button>

                      <button
                        onClick={() => {
                          if (events[0]) setActiveEventId(events[0].id);
                          onExploreDashboard();
                        }}
                        className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-colors text-center"
                      >
                        Test on Active Event →
                      </button>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Example Event Plans Showcase with Category Filter */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tested & Grounded Examples</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              Explore Live Event Blueprints
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-xl">
              Inspect complete AI-generated timelines, vendor quotas, and contingency cushions ready for instant customization.
            </p>
          </div>

          {/* Blueprint Category Filter Buttons */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-200/60 dark:bg-slate-800/80">
            {(['All', 'Wedding', 'Birthday', 'Corporate'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setBlueprintCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  blueprintCategory === cat
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Blueprint Cards Grid with Motion */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredEvents.map((evt, idx) => (
              <motion.div
                key={evt.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.35, delay: idx * 0.06 }}
                whileHover={{ y: -6, scale: 1.015 }}
                onClick={() => handleSelectSample(evt.id)}
                className="group cursor-pointer rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-2xl hover:border-indigo-400 dark:hover:border-indigo-600 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900">
                      {evt.eventType}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      {evt.startDate}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {evt.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {evt.plan?.overview.summary || `${evt.theme} celebration in ${evt.city} for ${evt.guestCount} guests.`}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Total Budget</span>
                    <span className="font-extrabold text-slate-900 dark:text-white text-base">
                      {formatCurrency(evt.totalBudget, evt.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Confirmed Guests</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {evt.guestCount} Attendees
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-slate-800 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center text-indigo-600 dark:text-indigo-400 transition-all group-hover:rotate-[-10deg]">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* Feature Grid with Scroll-Triggered Animations */}
      <section className="py-20 bg-slate-100/70 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              Engineered for Flawless Celebrations
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
              Every feature is built around real event economics, vendor workflows, and guest hospitality.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Wallet,
                title: 'Budget & Expense Tracker',
                desc: 'Log actual vendor payouts, see live category variance, and get automatic alerts before exceeding allocations.',
                color: 'violet',
                bg: 'bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400',
              },
              {
                icon: Clock,
                title: 'Dynamic Schedule',
                desc: 'Reverse-engineered deadlines with pre-event milestones, morning-of checklists, and minute-by-minute itinerary.',
                color: 'indigo',
                bg: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400',
              },
              {
                icon: Users,
                title: 'Guest List & CSV Sync',
                desc: 'Track RSVPs, manage dietary notes (Jain, Vegan, Gluten-Free), and export clean spreadsheets for caterers.',
                color: 'emerald',
                bg: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400',
              },
              {
                icon: Languages,
                title: 'Multi-Lingual Invites',
                desc: 'Generate heartfelt invitations across diverse tones in English, Hindi, and Gujarati with instant copy and PDF export.',
                color: 'amber',
                bg: 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400',
              },
            ].map((f, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all"
              >
                <div className={`w-12 h-12 rounded-2xl ${f.bg} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-lg">{f.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-14 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white shadow-xl grid grid-cols-2 lg:grid-cols-4 gap-6 text-center"
          >
            <div>
              <div className="text-3xl sm:text-4xl font-black text-indigo-400">99.8%</div>
              <div className="text-xs text-slate-300 mt-1 font-medium">Budget Math Precision</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-black text-emerald-400">&lt; 45s</div>
              <div className="text-xs text-slate-300 mt-1 font-medium">AI Generation Speed</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-black text-amber-400">3 Languages</div>
              <div className="text-xs text-slate-300 mt-1 font-medium">English, Hindi & Gujarati</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-black text-violet-400">₹0.00</div>
              <div className="text-xs text-slate-300 mt-1 font-medium">Zero Hidden Surcharges</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Call to Action Banner with Confetti */}
      <section className="py-20 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 text-white relative overflow-hidden">
        {/* Ambient glow in CTA */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] h-[36rem] bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-900/60 border border-indigo-700 text-xs font-semibold text-indigo-300 mb-6">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Free to plan, audit, and simulate</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Ready to plan an unforgettable event <br className="hidden sm:inline" />
              without the chaos?
            </h2>
            <p className="mt-4 text-indigo-200 text-base max-w-2xl mx-auto leading-relaxed">
              Create your customized plan in under 2 minutes. Free to plan, test scenarios, and export to PDF.
            </p>

            <div className="mt-8">
              <motion.button
                whileHover={{ scale: 1.06, y: -2 }}
                whileTap={{ scale: 0.96 }}
                onClick={(e) => {
                  triggerCelebration(e);
                  onPlanEvent();
                }}
                className="px-9 py-4 rounded-2xl font-bold text-base text-indigo-950 bg-white hover:bg-indigo-50 shadow-2xl transition-all inline-flex items-center gap-2 group"
              >
                <Sparkles className="w-5 h-5 text-indigo-600 group-hover:rotate-12 transition-transform" />
                <span>Launch Event Creator</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
        <p>© 2026 Eventora • “Your Vision. Your Budget. Your Perfect Event.”</p>
      </footer>
    </div>
  );
};
