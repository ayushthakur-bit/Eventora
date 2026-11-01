import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Languages,
  Palette,
  Edit3,
  Save,
  RotateCcw,
} from 'lucide-react';
import { useEvents } from '../context/EventContext';
import { InvitationCardContent } from '../types';
import { InvitationTemplateStyle } from '../utils/pdfExport';

const CARD_THEMES: { id: InvitationTemplateStyle; label: string; badgeClass: string }[] = [
  {
    id: 'royal',
    label: 'Royal Heritage',
    badgeClass: 'border-amber-500 bg-amber-950 text-amber-100',
  },
  {
    id: 'festive',
    label: 'Festive Glow',
    badgeClass: 'border-violet-500 bg-indigo-950 text-indigo-100',
  },
  {
    id: 'emerald',
    label: 'Emerald Garden',
    badgeClass: 'border-emerald-500 bg-emerald-950 text-emerald-100',
  },
  {
    id: 'rose',
    label: 'Rose Velvet',
    badgeClass: 'border-rose-500 bg-rose-950 text-rose-100',
  },
  {
    id: 'minimal',
    label: 'Modern Minimal',
    badgeClass: 'border-slate-300 bg-white text-slate-900',
  },
];

const EMBLEM_OPTIONS = ['❦', '✦', '❈', '♛', '♥'];

export const InvitationStudioView: React.FC = () => {
  const { activeEvent, getSavedInvitation, saveEventInvitation } = useEvents();

  const getDefaultInvitationData = (
    evtName?: string,
    evtDate?: string,
    evtVenue?: string
  ): InvitationCardContent => ({
    headline: 'A Joyous Celebration of Love & Unity',
    hosts: 'The Family & Loved Ones',
    mainBody: `With boundless joy and gratitude, we cordially invite you to join us in celebrating the ${evtName || 'Grand Celebration'}.\n\nYour gracious presence, warm blessings, and shared laughter will make this unforgettable milestone truly complete.`,
    itineraryHighlight: `Date: ${evtDate || 'November 28, 2026'} | Venue: ${evtVenue || 'Royal Palace'}`,
    rsvpDetails: 'Kindly RSVP via your Eventora invitation link or reach out to the family hosts.',
    quote: 'Moments shared with beloved family and friends become the timeless treasures of a lifetime.',
  });

  const savedInvite = activeEvent ? getSavedInvitation(activeEvent.id) : null;

  const [tone, setTone] = useState<string>(savedInvite?.tone || 'Warm & Celebratory');
  const [language, setLanguage] = useState<'English' | 'Hindi' | 'Gujarati'>(
    savedInvite?.language || 'English'
  );
  const [templateStyle, setTemplateStyle] = useState<InvitationTemplateStyle>(
    (savedInvite?.templateStyle as InvitationTemplateStyle) || 'royal'
  );
  const [emblem, setEmblem] = useState<string>(savedInvite?.emblem || '❦');
  const [cardTitle, setCardTitle] = useState<string>(
    savedInvite?.cardTitle || activeEvent?.name || 'Grand Celebration'
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditingManual, setIsEditingManual] = useState(false);

  const [invitationData, setInvitationData] = useState<InvitationCardContent>(() =>
    savedInvite?.invitationData ||
    getDefaultInvitationData(
      activeEvent?.name,
      activeEvent?.startDate,
      activeEvent?.venuePreference || activeEvent?.city
    )
  );

  // Sync when switching activeEvent
  useEffect(() => {
    if (!activeEvent) return;
    const saved = getSavedInvitation(activeEvent.id);
    if (saved) {
      setCardTitle(saved.cardTitle);
      setTemplateStyle((saved.templateStyle as InvitationTemplateStyle) || 'royal');
      setEmblem(saved.emblem || '❦');
      setTone(saved.tone || 'Warm & Celebratory');
      setLanguage(saved.language || 'English');
      setInvitationData(saved.invitationData);
    } else {
      setCardTitle(activeEvent.name);
      setTemplateStyle('royal');
      setEmblem('❦');
      setTone('Warm & Celebratory');
      setLanguage('English');
      setInvitationData(
        getDefaultInvitationData(
          activeEvent.name,
          activeEvent.startDate,
          activeEvent.venuePreference || activeEvent.city
        )
      );
    }
  }, [activeEvent?.id]);

  // Persist changes to active user's workspace
  useEffect(() => {
    if (!activeEvent) return;
    saveEventInvitation(activeEvent.id, {
      cardTitle,
      templateStyle,
      emblem,
      tone,
      language,
      invitationData,
      updatedAt: new Date().toISOString(),
    });
  }, [activeEvent?.id, cardTitle, templateStyle, emblem, tone, language, invitationData]);

  if (!activeEvent) {
    return (
      <div className="p-8 text-center text-slate-500">
        No active event selected.
      </div>
    );
  }

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentEvent: activeEvent,
          tone,
          language,
        }),
      });

      const data = await response.json();
      if (data.success && data.invitation) {
        setInvitationData(data.invitation);
      }
    } catch {
      // Retain existing invitation card data on network error
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResetDefaults = () => {
    setCardTitle(activeEvent.name);
    setEmblem('❦');
    setInvitationData(
      getDefaultInvitationData(
        activeEvent.name,
        activeEvent.startDate,
        activeEvent.venuePreference || activeEvent.city
      )
    );
  };

  const getCardContainerClasses = (style: InvitationTemplateStyle) => {
    switch (style) {
      case 'royal':
        return 'bg-gradient-to-b from-amber-950 via-slate-900 to-amber-950 text-amber-100 border-4 border-amber-600/40';
      case 'festive':
        return 'bg-gradient-to-b from-violet-950 via-indigo-950 to-slate-950 text-indigo-100 border-4 border-violet-500/40';
      case 'emerald':
        return 'bg-gradient-to-b from-emerald-950 via-slate-900 to-emerald-950 text-emerald-100 border-4 border-emerald-500/40';
      case 'rose':
        return 'bg-gradient-to-b from-rose-950 via-indigo-950 to-rose-950 text-rose-100 border-4 border-rose-500/40';
      case 'minimal':
      default:
        return 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-4 border-slate-200 dark:border-slate-800';
    }
  };

  const getInputClasses = (style: InvitationTemplateStyle) => {
    if (style === 'minimal') {
      return 'w-full rounded-xl px-3 py-2 text-center bg-slate-50 dark:bg-slate-800/90 border border-indigo-300 dark:border-indigo-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500';
    }
    return 'w-full rounded-xl px-3 py-2 text-center bg-black/35 backdrop-blur-xs border border-white/25 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-amber-400';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            AI Multi-Lingual Invitation Studio
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Craft heartfelt, poetic invitation cards in English, Hindi, and Gujarati tailored to your theme.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Controls Column */}
        <div className="lg:col-span-5 space-y-5">
          {/* Tone Selector */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Invitation Tone
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {['Royal & Formal', 'Warm & Celebratory', 'Modern & Chic', 'Poetic & Traditional'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    tone === t
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Language Selector */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Languages className="w-4 h-4 text-indigo-500" />
              <span>Language</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {(['English', 'Hindi', 'Gujarati'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    language === lang
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {lang === 'Hindi' ? 'हिंदी (Hindi)' : lang === 'Gujarati' ? 'ગુજરાતી (Gujarati)' : 'English'}
                </button>
              ))}
            </div>
          </div>

          {/* Visual Card Style */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Palette className="w-4 h-4 text-violet-500" />
              <span>Card Visual Theme</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {CARD_THEMES.map((themeItem) => (
                <button
                  key={themeItem.id}
                  onClick={() => setTemplateStyle(themeItem.id)}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    templateStyle === themeItem.id
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {themeItem.label}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-3.5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Composing in {language}...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate New Phrasing ({language})</span>
              </>
            )}
          </button>
        </div>

        {/* Visual Live Card Preview Column */}
        <div className="lg:col-span-7">
          <div
            id="invitation-printable-card"
            className={`rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden transition-all text-center flex flex-col justify-between min-h-[560px] ${getCardContainerClasses(
              templateStyle
            )}`}
          >
            {/* Floating Manual Edit Toolbar Inside Card */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-2 border-b border-current/10">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold opacity-80">
                <Palette className="w-3.5 h-3.5" />
                <span>
                  {CARD_THEMES.find((t) => t.id === templateStyle)?.label || 'Custom Theme'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isEditingManual && (
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    title="Reset card text to event defaults"
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                      templateStyle === 'minimal'
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                    }`}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsEditingManual(!isEditingManual)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 ${
                    isEditingManual
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      : templateStyle === 'minimal'
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-xs'
                  }`}
                >
                  {isEditingManual ? (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Done Editing</span>
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Card & Theme</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Inline Manual Theme & Emblem Switcher when in Edit Mode */}
            {isEditingManual && (
              <div
                className={`mb-6 p-4 rounded-2xl text-left space-y-3 border ${
                  templateStyle === 'minimal'
                    ? 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700'
                    : 'bg-black/30 border-white/15 backdrop-blur-xs'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider opacity-85">
                    Manual Theme & Crest Selector
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] opacity-75 mr-1">Crest:</span>
                    {EMBLEM_OPTIONS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setEmblem(item)}
                        className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center border transition-all cursor-pointer ${
                          emblem === item
                            ? 'border-amber-400 bg-amber-500/30 font-bold scale-110'
                            : 'border-current/20 opacity-70 hover:opacity-100'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {CARD_THEMES.map((themeOpt) => (
                    <button
                      key={themeOpt.id}
                      type="button"
                      onClick={() => setTemplateStyle(themeOpt.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                        templateStyle === themeOpt.id
                          ? 'ring-2 ring-amber-400 border-transparent bg-white text-slate-900 font-bold'
                          : 'border-current/25 opacity-80 hover:opacity-100'
                      }`}
                    >
                      {themeOpt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Top Ornamental Emblem */}
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-full border-2 border-amber-400/50 flex items-center justify-center mx-auto text-amber-300 font-serif text-lg">
                {emblem}
              </div>

              {isEditingManual ? (
                <div className="space-y-2 max-w-md mx-auto">
                  <label htmlFor="invite-headline" className="block text-[10px] uppercase tracking-wider opacity-75">
                    Headline Banner
                  </label>
                  <input
                    id="invite-headline"
                    aria-label="Invitation Headline Banner"
                    type="text"
                    value={invitationData.headline}
                    onChange={(e) =>
                      setInvitationData({ ...invitationData, headline: e.target.value })
                    }
                    placeholder="Invitation Headline"
                    className={`${getInputClasses(templateStyle)} text-xs font-semibold uppercase tracking-widest`}
                  />

                  <label htmlFor="invite-hosts" className="block text-[10px] uppercase tracking-wider opacity-75 pt-1">
                    Hosts Line
                  </label>
                  <input
                    id="invite-hosts"
                    aria-label="Invitation Hosts Line"
                    type="text"
                    value={invitationData.hosts}
                    onChange={(e) =>
                      setInvitationData({ ...invitationData, hosts: e.target.value })
                    }
                    placeholder="Hosted By"
                    className={`${getInputClasses(templateStyle)} text-xs uppercase tracking-widest`}
                  />
                </div>
              ) : (
                <>
                  <div className="text-sm font-semibold tracking-widest uppercase opacity-80">
                    {invitationData.headline}
                  </div>
                  <div className="text-xs uppercase tracking-widest opacity-70">
                    {invitationData.hosts}
                  </div>
                </>
              )}
            </div>

            {/* Main Body */}
            <div className="my-8 space-y-4 max-w-lg mx-auto w-full">
              {isEditingManual ? (
                <div className="space-y-3">
                  <div>
                    <label htmlFor="invite-card-title" className="block text-[10px] uppercase tracking-wider opacity-75 mb-1">
                      Celebration Title
                    </label>
                    <input
                      id="invite-card-title"
                      aria-label="Celebration Title"
                      type="text"
                      value={cardTitle}
                      onChange={(e) => setCardTitle(e.target.value)}
                      placeholder="Event Title on Card"
                      className={`${getInputClasses(templateStyle)} text-xl font-extrabold font-serif`}
                    />
                  </div>

                  <div>
                    <label htmlFor="invite-main-body" className="block text-[10px] uppercase tracking-wider opacity-75 mb-1">
                      Invitation Message Body
                    </label>
                    <textarea
                      id="invite-main-body"
                      aria-label="Invitation Message Body"
                      rows={5}
                      value={invitationData.mainBody}
                      onChange={(e) =>
                        setInvitationData({ ...invitationData, mainBody: e.target.value })
                      }
                      placeholder="Write your custom invitation wording..."
                      className={`${getInputClasses(templateStyle)} text-xs sm:text-sm leading-relaxed`}
                    />
                  </div>

                  <div className="pt-3 border-t border-current/15 space-y-2">
                    <label htmlFor="invite-itinerary" className="block text-[10px] uppercase tracking-wider opacity-75">
                      Date, Time & Venue Line
                    </label>
                    <input
                      id="invite-itinerary"
                      aria-label="Date, Time and Venue Line"
                      type="text"
                      value={invitationData.itineraryHighlight}
                      onChange={(e) =>
                        setInvitationData({
                          ...invitationData,
                          itineraryHighlight: e.target.value,
                        })
                      }
                      placeholder="Date & Venue Details"
                      className={`${getInputClasses(templateStyle)} text-xs sm:text-sm font-bold`}
                    />

                    <label htmlFor="invite-rsvp" className="block text-[10px] uppercase tracking-wider opacity-75 pt-1">
                      RSVP Instructions
                    </label>
                    <input
                      id="invite-rsvp"
                      aria-label="RSVP Instructions"
                      type="text"
                      value={invitationData.rsvpDetails}
                      onChange={(e) =>
                        setInvitationData({ ...invitationData, rsvpDetails: e.target.value })
                      }
                      placeholder="RSVP Details"
                      className={`${getInputClasses(templateStyle)} text-xs`}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-serif">
                    {cardTitle}
                  </h2>

                  <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line opacity-90 font-light">
                    {invitationData.mainBody}
                  </p>

                  <div className="pt-4 border-t border-white/20 dark:border-slate-800 space-y-1">
                    <div className="text-xs sm:text-sm font-bold tracking-wide">
                      {invitationData.itineraryHighlight}
                    </div>
                    <div className="text-xs opacity-75">
                      {invitationData.rsvpDetails}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer Blessing Quote */}
            <div className="pt-4 border-t border-white/10 dark:border-slate-800 text-[11px] italic opacity-75">
              {isEditingManual ? (
                <div className="max-w-lg mx-auto">
                  <label htmlFor="invite-quote" className="block text-[10px] not-italic uppercase tracking-wider opacity-75 mb-1">
                    Footer Blessing / Quote
                  </label>
                  <input
                    id="invite-quote"
                    aria-label="Footer Blessing or Quote"
                    type="text"
                    value={invitationData.quote}
                    onChange={(e) =>
                      setInvitationData({ ...invitationData, quote: e.target.value })
                    }
                    placeholder="Footer Quote"
                    className={`${getInputClasses(templateStyle)} text-xs italic`}
                  />
                </div>
              ) : (
                <>“{invitationData.quote}”</>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
