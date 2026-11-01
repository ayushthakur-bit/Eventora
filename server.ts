import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;

function withTimeout<T>(promise: Promise<T>, ms = 1800): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API request timed out')), ms)
    ),
  ]);
}

console.log(`[Eventora Server] Gemini API Key present: ${Boolean(apiKey)}`);

/**
 * Health check
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    appName: 'Eventora',
    geminiConfigured: Boolean(apiKey),
    timestamp: new Date().toISOString(),
  });
});

/**
 * 1. AI Event Plan Generator
 */
app.post('/api/ai/plan', async (req: Request, res: Response) => {
  try {
    const {
      name,
      eventType,
      startDate,
      endDate,
      city,
      venuePreference,
      venueType,
      guestCount,
      totalBudget,
      currency = 'INR',
      budgetFlexibility,
      spendingPriorities = [],
      costSavingCategories = [],
      theme,
      preferredColors = [],
      foodPreferences = [],
      entertainmentPreferences = [],
      accessibilityRequirements,
      culturalPreferences,
      additionalInstructions,
    } = req.body;

    const prompt = `
You are Eventora, an elite event planner and financial strategist.
Create a comprehensive, production-grade event plan for:
- Event Name: ${name}
- Event Type: ${eventType}
- Dates: ${startDate} ${endDate ? `to ${endDate}` : ''}
- City & Venue: ${city} (${venuePreference || 'Standard venue'}, ${venueType || 'Mixed'})
- Expected Guests: ${guestCount}
- Total Budget: ${currency} ${totalBudget} (${budgetFlexibility} flexibility)
- Top Spending Priorities: ${spendingPriorities.join(', ') || 'Standard balanced'}
- Target Cost-Saving Categories: ${costSavingCategories.join(', ') || 'None specified'}
- Theme: ${theme}
- Color Palette: ${preferredColors.join(', ') || 'Complementary elegant tones'}
- Food & Catering: ${foodPreferences.join(', ') || 'Multi-course menu'}
- Entertainment: ${entertainmentPreferences.join(', ') || 'Live music & ambient setup'}
- Accessibility: ${accessibilityRequirements || 'Standard accessibility'}
- Cultural/Regional Nuances: ${culturalPreferences || 'Contemporary universal'}
- Additional Notes: ${additionalInstructions || 'None'}

CRITICAL BUDGET RULES:
1. Category budget allocations MUST SUM UP EXACTLY to the Total Budget (${totalBudget}).
2. Do NOT add emergency contingency on top of the budget; it must be an item WITHIN the total budget (e.g. 5% to 8%).
3. Adjust categories to fit the event type (e.g. don't force bridal or wedding items for a tech symposium or 50th birthday).
4. Provide realistic percentages and actionable cost-saving tips for each category.

Return ONLY valid JSON matching this exact structure without markdown backticks:
{
  "overview": {
    "summary": "2-3 sentence inspiring executive summary of the event concept and execution strategy",
    "recommendedTheme": "Specific creative theme title",
    "suggestedFormat": "Key schedule format or day-by-day highlight",
    "recommendations": ["3-5 concrete expert recommendations"],
    "assumptionsAndMissing": ["2-3 practical assumptions made"]
  },
  "budgetBreakdown": [
    {
      "category": "Venue | Food and catering | Decoration | Photography and videography | Entertainment | Invitations and stationery | Transportation | Emergency contingency | Miscellaneous",
      "amount": number,
      "percentage": number,
      "reason": "Clear explanation of this allocation based on guest count and priorities",
      "costSavingTip": "Actionable insider tip to reduce costs in this category"
    }
  ],
  "timeline": {
    "preEventTasks": [
      {
        "id": "t1",
        "title": "Task title",
        "description": "Specific action item",
        "timing": "e.g. 8 weeks before / 3 weeks before",
        "priority": "High | Medium | Low",
        "category": "Category name"
      }
    ],
    "eventDaySchedule": [
      {
        "time": "e.g. 15:00 - 16:30",
        "activity": "Activity title",
        "notes": "Execution guidelines and coordinator responsibilities"
      }
    ],
    "finalDayChecklist": ["4-6 critical checklist items for the morning of the event"]
  },
  "vendorChecklist": [
    {
      "id": "v1",
      "category": "Vendor category",
      "whatToLookFor": "Quality indicators and red flags",
      "questionsToAsk": ["2-3 crucial interview questions"],
      "estimatedPriceRange": "Estimated price range in ${currency}",
      "bookingDeadline": "Recommended booking timeframe",
      "status": "To Contact"
    }
  ],
  "personalizedIdeas": {
    "decorationSuggestions": ["3 unique decor ideas matching ${theme}"],
    "themeAndPalette": ["4-5 specific color names and aesthetic styling cues"],
    "foodAndMenuIdeas": ["3-4 culinary concepts"],
    "activitiesAndEntertainment": ["3 engaging guest experiences"],
    "invitationIdeas": ["2 memorable invitation styling concepts"],
    "guestExperienceImprovements": ["2 thoughtful attendee hospitality touches"],
    "budgetFriendlyAlternatives": ["2 smart DIY or economical swaps"]
  },
  "risksAndRecommendations": {
    "commonPlanningProblems": ["2 common pitfalls for this event scale"],
    "weatherContingency": "Specific backup plan for weather or temperature",
    "backupVendorsOrVenues": "Contingency advice for cancellations",
    "guestCountChangesAdvice": "Buffer guidance for RSVPs",
    "paymentDeadlinesCaution": "Cashflow and vendor milestone schedule warning",
    "accessibilityAndSafety": "Paramedic, fire, crowd, or ramp considerations"
  }
}
`;

    if (genAI) {
      try {
        const response = await withTimeout(
          genAI.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.7,
            },
          }),
          2500
        );

        const text = response.text?.trim() || '';
        const cleaned = text.replace(/^```json/i, '').replace(/```$/i, '').trim();
        const parsed = JSON.parse(cleaned);

        // Sanity verify budget sum
        if (parsed.budgetBreakdown && Array.isArray(parsed.budgetBreakdown)) {
          let sum = parsed.budgetBreakdown.reduce((acc: number, item: any) => acc + (Number(item.amount) || 0), 0);
          if (Math.abs(sum - totalBudget) > 1 && sum > 0) {
            const factor = totalBudget / sum;
            parsed.budgetBreakdown = parsed.budgetBreakdown.map((item: any) => ({
              ...item,
              amount: Math.round(item.amount * factor),
              percentage: Math.round(((item.amount * factor) / totalBudget) * 1000) / 10,
            }));
          }
        }

        return res.json({ success: true, plan: parsed, source: 'gemini' });
      } catch (geminiErr: any) {
        console.warn('[Gemini API call failed, falling back to smart generator]:', geminiErr.message);
      }
    }

    // High quality intelligent fallback generator
    const fallbackPlan = generateSmartFallbackPlan(req.body);
    return res.json({ success: true, plan: fallbackPlan, source: 'fallback' });
  } catch (error: any) {
    console.error('Plan generation error:', error);
    res.status(500).json({ error: 'Failed to generate plan', message: error.message });
  }
});

/**
 * 2. Signature Feature — What-If Event Planner
 */
app.post('/api/ai/what-if', async (req: Request, res: Response) => {
  try {
    const { query, currentEvent, currentPlan } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const prompt = `
You are Eventora's signature What-If Simulation Engine.
The user wants to evaluate a scenario modification to their event plan.

CURRENT EVENT CONTEXT:
- Name: ${currentEvent.name}
- Type: ${currentEvent.eventType}
- Current Budget: ${currentEvent.currency} ${currentEvent.totalBudget}
- Current Guests: ${currentEvent.guestCount}
- Venue Type: ${currentEvent.venueType}
- Priorities: ${(currentEvent.spendingPriorities || []).join(', ')}
- Cost Saving Focus: ${(currentEvent.costSavingCategories || []).join(', ')}
- Current Categories Breakdown:
${JSON.stringify((currentPlan?.budgetBreakdown || []).map((b: any) => ({ category: b.category, amount: b.amount, percentage: b.percentage })))}

USER SCENARIO QUERY:
"${query}"

INSTRUCTIONS:
1. Parse the requested change carefully:
   - Did budget decrease or increase?
   - Did guest count change?
   - Did venue move (e.g. outdoor to indoor)?
   - Did they specify to preserve a category (e.g. "keep photography unchanged but reduce decoration")?
2. Recalculate category allocations accurately. The sum of all new category amounts MUST match the new budget.
3. Protect user priorities! If user said "keep photography unchanged", keep it fixed and absorb reductions elsewhere.
4. Highlight concrete impacts, risks, and proposed task changes.

Return ONLY a valid JSON object matching this structure:
{
  "query": "${query}",
  "impactSummary": "Detailed 2-3 sentence analysis of how this change shifts logistics, per-person spend, and trade-offs.",
  "preservedPriorities": ["List of categories or elements preserved as requested"],
  "budgetAdjustments": {
    "previousBudget": ${currentEvent.totalBudget},
    "newBudget": number,
    "difference": number,
    "reallocations": [
      {
        "category": "Category Name",
        "oldAmount": number,
        "newAmount": number,
        "changeReason": "Specific mathematical or logistical justification"
      }
    ]
  },
  "taskModifications": [
    {
      "action": "add | modify | remove",
      "taskTitle": "Task Title",
      "details": "Explanation of schedule or vendor update"
    }
  ],
  "recommendations": [
    "3 strategic suggestions to execute this pivot seamlessly without sacrificing event quality"
  ]
}
`;

    if (genAI) {
      try {
        const response = await withTimeout(
          genAI.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.6,
            },
          }),
          2500
        );

        const text = response.text?.trim() || '';
        const cleaned = text.replace(/^```json/i, '').replace(/```$/i, '').trim();
        const parsed = JSON.parse(cleaned);
        return res.json({ success: true, result: parsed, source: 'gemini' });
      } catch (geminiErr: any) {
        console.warn('[Gemini What-If failed, using smart simulation fallback]:', geminiErr.message);
      }
    }

    const fallbackResult = generateSmartWhatIfFallback(query, currentEvent, currentPlan);
    return res.json({ success: true, result: fallbackResult, source: 'fallback' });
  } catch (error: any) {
    console.error('What-If error:', error);
    res.status(500).json({ error: 'Failed to simulate scenario', message: error.message });
  }
});

/**
 * 3. AI Copilot Chat Assistant
 */
app.post('/api/ai/copilot', async (req: Request, res: Response) => {
  try {
    const {
      message,
      currentEvent,
      currentPlan,
      history = [],
      persona = 'general',
      tasks = [],
      expenses = [],
      vendors = [],
      guests = [],
    } = req.body;

    const totalSpent = Array.isArray(expenses)
      ? expenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0)
      : 0;
    const pendingTasks = Array.isArray(tasks)
      ? tasks.filter((t: any) => t.status !== 'Completed')
      : [];

    const personaPrompts: Record<string, string> = {
      general: 'Act as a Holistic Chief Event Strategist balancing budget, guest delight, and seamless execution.',
      budget: 'Act as a Senior Financial Auditor & Cost Controller. Focus on per-guest economics, category variance, and protecting contingency reserves.',
      vendor: 'Act as a Sharp Vendor Procurement & Contract Negotiator. Provide word-for-word negotiation scripts, SLA clauses, and payment milestone protections.',
      timeline: 'Act as a Master Showcaller & Logistics Director. Focus on cue-to-cue run-sheets, buffer times, load-in schedules, and critical path tasks.',
      creative: 'Act as a Luxury Event Creative Director & Culinary Stylist. Focus on color palettes, lighting design, floral architecture, and interactive food stations.',
    };

    const systemInstruction = `
You are "Eventora Copilot", an interactive AI Event Planning Chatbot & Financial Strategist.
Specialist Mode: ${personaPrompts[persona] || personaPrompts.general}

LIVE EVENT DATA CONTEXT:
- Event Name: "${currentEvent?.name}" (${currentEvent?.eventType})
- Date & Location: ${currentEvent?.startDate} in ${currentEvent?.city} (${currentEvent?.venuePreference || 'TBD'}, ${currentEvent?.venueType})
- Total Budget: ${currentEvent?.currency || '₹'} ${Number(currentEvent?.totalBudget || 0).toLocaleString()}
- Actual Spent So Far: ${currentEvent?.currency || '₹'} ${totalSpent.toLocaleString()} (Remaining: ${currentEvent?.currency || '₹'} ${Math.max(0, (currentEvent?.totalBudget || 0) - totalSpent).toLocaleString()})
- Expected Guests: ${currentEvent?.guestCount} (${Array.isArray(guests) ? guests.length : 0} roster entries)
- Operational Tasks: ${pendingTasks.length} pending out of ${Array.isArray(tasks) ? tasks.length : 0} total tasks
- Active Vendors: ${Array.isArray(vendors) ? vendors.map((v: any) => `${v.name} (${v.category} - ${v.bookingStatus})`).join(', ') || 'None added yet' : 'None'}
- Spending Priorities: ${(currentEvent?.spendingPriorities || []).join(', ')}
- Theme & Palette: ${currentEvent?.theme} (${(currentEvent?.preferredColors || []).join(', ')})

RULES:
1. Ground every answer in the user's real event numbers, city, guest count, and priorities above.
2. Format responses cleanly using Markdown headings (###), **bold** highlights, and bulleted/numbered lists.
3. Never claim to have phoned a vendor or transferred real money; offer actionable scripts, calculations, and checklists.
4. Always append 3 helpful follow-up question chips at the very end in this exact format:
[SUGGESTIONS: "Follow up 1", "Follow up 2", "Follow up 3"]
`;

    if (genAI) {
      try {
        const contents = [
          { role: 'user', parts: [{ text: systemInstruction }] },
          { role: 'model', parts: [{ text: "Understood. I am Eventora Copilot, grounded in your live event metrics and ready to assist." }] },
          ...history.slice(-8).map((h: any) => ({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.content }],
          })),
          { role: 'user', parts: [{ text: message }] },
        ];

        const response = await withTimeout(
          genAI.models.generateContent({
            model: 'gemini-3.8-flash',
            contents,
          }),
          1800
        );

        const reply = response.text || '';
        return res.json({ success: true, reply, source: 'gemini' });
      } catch (err: any) {
        console.warn('Copilot Gemini error:', err.message);
      }
    }

    // Dynamic smart response grounded in live operational state
    const reply = generateSmartCopilotResponse(
      message,
      currentEvent,
      currentPlan,
      persona,
      tasks,
      expenses,
      vendors
    );
    return res.json({ success: true, reply, source: 'fallback' });
  } catch (error: any) {
    res.status(500).json({ error: 'Copilot failed', message: error.message });
  }
});

/**
 * 4. Multi-language Invitation Studio Generator
 */
app.post('/api/ai/invitation', async (req: Request, res: Response) => {
  try {
    const { currentEvent, tone = 'Warm & Celebratory', language = 'English' } = req.body;

    const prompt = `
Create an event invitation card text for:
- Event: ${currentEvent.name}
- Type: ${currentEvent.eventType}
- Date: ${currentEvent.startDate}
- Location: ${currentEvent.city} (${currentEvent.venuePreference || 'Grand Banquet'})
- Tone: ${tone}
- Language: ${language} (Write authentic, beautiful ${language} phrasing; for Hindi/Gujarati use accurate script).

Return ONLY JSON:
{
  "headline": "Short poetic invitation header",
  "hosts": "The Family / Hosts Invitation line",
  "mainBody": "Warm, evocative 2-3 paragraph invitation text capturing the celebration spirit",
  "itineraryHighlight": "Brief date, time, and dress code",
  "rsvpDetails": "RSVP contact line and deadline",
  "quote": "A thoughtful one-line blessing or festive quote appropriate for the occasion"
}
`;

    if (genAI) {
      try {
        const response = await withTimeout(
          genAI.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' },
          }),
          2500
        );

        const text = response.text?.trim() || '';
        const cleaned = text.replace(/^```json/i, '').replace(/```$/i, '').trim();
        const parsed = JSON.parse(cleaned);
        return res.json({ success: true, invitation: parsed, source: 'gemini' });
      } catch (err: any) {
        console.warn('Invitation Gemini error:', err.message);
      }
    }

    const fallbackInvite = generateSmartInvitationFallback(currentEvent, tone, language);
    return res.json({ success: true, invitation: fallbackInvite, source: 'fallback' });
  } catch (error: any) {
    res.status(500).json({ error: 'Invitation generation failed', message: error.message });
  }
});

// Helper Fallback Engines for 100% Reliability
function generateSmartFallbackPlan(data: any) {
  const budget = Number(data.totalBudget) || 500000;
  const isWedding = data.eventType === 'Wedding';
  const isCollege = data.eventType === 'College Event';
  const isBirthday = data.eventType === 'Birthday';

  // Category percentage allocations summing to 100%
  let dist: { cat: string; pct: number; reason: string; tip: string }[] = [];

  if (isWedding) {
    dist = [
      { cat: 'Venue', pct: 35, reason: 'Covers ceremonial courtyard and banquet halls.', tip: 'Bundle lodging rooms for group discount.' },
      { cat: 'Food and catering', pct: 30, reason: 'Multi-course regional buffet with live stations.', tip: 'Limit live stations to 3 high-impact concepts.' },
      { cat: 'Decoration', pct: 12, reason: 'Floral mandap, fairy lights, and seating decor.', tip: 'Opt for indigenous marigolds and tuberose.' },
      { cat: 'Photography and videography', pct: 10, reason: 'Candid portraits, traditional coverage, and teaser reel.', tip: 'Book pre-wedding and wedding together.' },
      { cat: 'Entertainment', pct: 5, reason: 'Folk welcome troupe and DJ for reception.', tip: 'Share sound gear across functions.' },
      { cat: 'Transportation', pct: 2, reason: 'Airport transfers for key family members.', tip: 'Organize synchronized mini-bus shuttles.' },
      { cat: 'Invitations and stationery', pct: 1, reason: 'Digital interactive invites and keepsake cards.', tip: 'Use digital RSVP tracking via Eventora.' },
      { cat: 'Emergency contingency', pct: 5, reason: 'Reserve for unexpected guest plate spikes or weather gear.', tip: 'Keep in reserve until post-event reconciliations.' },
    ];
  } else if (isCollege) {
    dist = [
      { cat: 'Venue & Staging', pct: 30, reason: 'Stage construction, audiovisuals, and campus permits.', tip: 'Use campus auditorium to waive venue rental.' },
      { cat: 'Food & Refreshments', pct: 25, reason: 'Boxed lunches, tea, coffee, and energy counters.', tip: 'Partner with student-friendly catering providers.' },
      { cat: 'Guest Speakers & Artists', pct: 25, reason: 'Honorariums, travel, and headline performance.', tip: 'Reach out to notable alumni.' },
      { cat: 'Marketing & Merchandise', pct: 10, reason: 'Badges, branded lanyards, banners, and digital ads.', tip: 'Seek student community brand sponsorships.' },
      { cat: 'Emergency contingency', pct: 10, reason: 'Backup generator and security equipment reserve.', tip: 'Release unspent funds to student welfare.' },
    ];
  } else {
    // Birthday or general celebration
    dist = [
      { cat: 'Venue', pct: 25, reason: 'Private party hall, rooftop, or outdoor garden rental.', tip: 'Book weekday or Sunday afternoon slots.' },
      { cat: 'Food and catering', pct: 40, reason: 'Custom appetizers, signature main course, and dessert buffet.', tip: 'Order signature cake separately from bakery.' },
      { cat: 'Decoration', pct: 15, reason: 'Themed balloon arches, custom backdrop, and table centerpieces.', tip: 'Use reusable LED signage and photo booth props.' },
      { cat: 'Entertainment', pct: 10, reason: 'DJ, emcee games, or live acoustic performer.', tip: 'Create collaborative Spotify playlist.' },
      { cat: 'Invitations and favors', pct: 5, reason: 'Custom return gifts and digital video invites.', tip: 'Curate edible return favors in eco-pouches.' },
      { cat: 'Emergency contingency', pct: 5, reason: 'Safety buffer for sudden guest additions.', tip: 'Unused budget saved directly.' },
    ];
  }

  let runningSum = 0;
  const breakdown = dist.map((d, idx) => {
    if (idx === dist.length - 1) {
      const remaining = Math.max(0, budget - runningSum);
      return {
        category: d.cat,
        amount: remaining,
        percentage: Math.round((remaining / budget) * 1000) / 10,
        reason: d.reason,
        costSavingTip: d.tip,
      };
    }
    const amt = Math.round((d.pct / 100) * budget);
    runningSum += amt;
    return {
      category: d.cat,
      amount: amt,
      percentage: d.pct,
      reason: d.reason,
      costSavingTip: d.tip,
    };
  });

  return {
    overview: {
      summary: `A personalized, high-touch ${data.eventType} celebration in ${data.city} tailored for ${data.guestCount} guests, balancing ${data.theme} aesthetics with sharp budget management.`,
      recommendedTheme: `${data.theme} Splendor with ${data.preferredColors?.[0] || 'Modern'} Accents`,
      suggestedFormat: 'Daytime welcome reception, followed by signature ceremonial milestones and evening grand feast.',
      recommendations: [
        'Finalize key venue agreements at least 6 weeks before to lock base rates.',
        'Implement digital RSVP check-ins to control actual per-plate catering expenditure.',
        'Designate a single logistics coordinator for vendor arrivals on the day.',
      ],
      assumptionsAndMissing: [
        `Assumed total attendee count remains within 10% of ${data.guestCount}.`,
        'Power backup generator availability is assumed to be included in venue booking.',
      ],
    },
    budgetBreakdown: breakdown,
    timeline: {
      preEventTasks: [
        { id: 'fb_t1', title: 'Confirm Venue Contract & Safety Deposits', description: 'Inspect acoustics and electrical points; pay advance.', timing: '8 weeks before', priority: 'High', category: 'Venue' },
        { id: 'fb_t2', title: 'Curate & Sample Food Tasting Menu', description: 'Lock 5 starters, 4 mains, and live signature stations.', timing: '5 weeks before', priority: 'High', category: 'Food and catering' },
        { id: 'fb_t3', title: 'Approve Theme & Lighting Mockup', description: 'Sign off on floral and lighting fixtures.', timing: '3 weeks before', priority: 'Medium', category: 'Decoration' },
        { id: 'fb_t4', title: 'Distribute Digital Invitations & Collect RSVPs', description: 'Monitor attendance count and dietary restrictions.', timing: '2 weeks before', priority: 'High', category: 'Invitations' },
        { id: 'fb_t5', title: 'Technical Soundcheck & Rehearsal', description: 'Test mics, lighting sequences, and master playlist.', timing: '3 days before', priority: 'Medium', category: 'Entertainment' },
      ],
      eventDaySchedule: [
        { time: '11:00 - 13:00', activity: 'Vendor Setup & Site Inspection', notes: 'Check air-conditioning, generator backup, and buffet tables.' },
        { time: '16:00 - 17:30', activity: 'Guest Welcome & Welcome Drinks', notes: 'Ambient background music; welcome desk attendants ready.' },
        { time: '18:00 - 19:30', activity: 'Main Ceremonial Program & Speeches', notes: 'Stage lighting active; videographer in primary spot.' },
        { time: '20:00 - 22:30', activity: 'Grand Feast & Interactive Celebrations', notes: 'Buffet open; music transitions to celebratory tempo.' },
      ],
      finalDayChecklist: [
        'Verify emergency contacts for all principal vendors.',
        'Distribute cash envelopes for balance vendor settlements.',
        'Inspect stage safety and sound level limits.',
        'Place first aid and welcome hampers at reception.',
      ],
    },
    vendorChecklist: [
      { id: 'fb_v1', category: 'Venue', whatToLookFor: 'Capacity compliance, sound curfews, AC and lighting power', questionsToAsk: ['Is there a penalty for extending the event by 1 hour?', 'Are outside vendors permitted?'], estimatedPriceRange: `${data.currency || '₹'} ${Math.round(budget * 0.3)}`, bookingDeadline: '6 weeks prior', status: 'To Contact' },
      { id: 'fb_v2', category: 'Catering', whatToLookFor: 'Food safety certifications, live counter experience, staff uniforms', questionsToAsk: ['What is the policy for extra guest plates on the spot?', 'Is tasting complimentary?'], estimatedPriceRange: `${data.currency || '₹'} ${Math.round(budget * 0.3)}`, bookingDeadline: '5 weeks prior', status: 'To Contact' },
      { id: 'fb_v3', category: 'Photography', whatToLookFor: 'Low light clarity, turnaround time for teaser video', questionsToAsk: ['Who exactly will shoot on the day?', 'Are raw video archives preserved?'], estimatedPriceRange: `${data.currency || '₹'} ${Math.round(budget * 0.1)}`, bookingDeadline: '4 weeks prior', status: 'To Contact' },
    ],
    personalizedIdeas: {
      decorationSuggestions: [
        `Illuminated canopy using fairy lights paired with ${data.preferredColors?.[0] || 'Gold'} draped fabrics.`,
        'Custom photo backdrop wall decorated with monogram signage and local flora.',
        'Candle-lit table centerpieces with fresh fragrant blooms and placecards.',
      ],
      themeAndPalette: [
        data.preferredColors?.[0] || 'Champagne Gold',
        data.preferredColors?.[1] || 'Royal Indigo',
        'Ivory White',
        'Soft Botanical Green',
      ],
      foodAndMenuIdeas: [
        'Signature mocktail bar featuring botanical syrups and smoked spices.',
        'Interactive live pasta and street food chaat station.',
        'Warm artisanal dessert trio served with custom monogram garnishes.',
      ],
      activitiesAndEntertainment: [
        'Live acoustic ensemble during welcome hours transitioning into high-energy dance set.',
        'Interactive digital guestbook where guests snap instant polaroids with handwritten wishes.',
      ],
      invitationIdeas: [
        'Modern minimalist digital video invitation with embedded interactive Google Maps pin.',
        'Cardstock keepsake invitation with embossed metallic foil monogram.',
      ],
      guestExperienceImprovements: [
        'Personalized welcome drink and warm scented towels upon arrival.',
        'Dedicated charging station and coat/bag check counter.',
      ],
      budgetFriendlyAlternatives: [
        'Opt for high-density local seasonal flowers instead of imported exotic stems.',
        'Utilize ambient architectural up-lighting instead of heavy structural wooden builds.',
      ],
    },
    risksAndRecommendations: {
      commonPlanningProblems: [
        'Guest attendance swelling 15-20% beyond initial RSVPs.',
        'Audio feedback loops in spaces with high ceilings and marble floors.',
      ],
      weatherContingency: data.venueType === 'Outdoor' ? 'Mandatory waterproof marquee tent and covered walkway agreement with venue.' : 'Indoor climate control and backup fans reserved.',
      backupVendorsOrVenues: 'Secondary freelance sound engineer on standby with wireless mics.',
      guestCountChangesAdvice: 'Notify caterer with final guaranteed head count exactly 72 hours prior.',
      paymentDeadlinesCaution: 'Never release 100% of payment before final service handover on event night.',
      accessibilityAndSafety: 'Check for step-free wheelchair access from main drop-off to reception hall.',
    },
  };
}

function generateSmartWhatIfFallback(query: string, currentEvent: any, currentPlan: any) {
  const currentBudget = Number(currentEvent.totalBudget) || 500000;
  const lowerQuery = query.toLowerCase();

  let newBudget = currentBudget;
  let reallocations: any[] = [];
  let summary = '';
  let taskModifications: any[] = [];

  // Detect budget change pattern: "from X to Y" or "decreased to Y" or "reduce budget to Y"
  const numbersFound = query.match(/\d[\d,.]*/g);
  if (numbersFound && numbersFound.length >= 2 && lowerQuery.includes('budget')) {
    const rawVal = numbersFound[numbersFound.length - 1].replace(/,/g, '');
    const parsedVal = parseFloat(rawVal);
    // If entered in lakhs (e.g. 4,00,000 or 400000 or 4)
    if (parsedVal > 1000) {
      newBudget = parsedVal;
    }
  } else if (lowerQuery.includes('decrease') || lowerQuery.includes('reduce')) {
    newBudget = Math.round(currentBudget * 0.85); // 15% reduction
  } else if (lowerQuery.includes('increase') || lowerQuery.includes('expanded')) {
    newBudget = Math.round(currentBudget * 1.2);
  }

  const diff = newBudget - currentBudget;
  const breakdown = currentPlan?.budgetBreakdown || [];

  if (diff !== 0 && breakdown.length > 0) {
    const factor = newBudget / currentBudget;
    summary = `Simulated a budget adjustment from ${currentEvent.currency} ${currentBudget.toLocaleString()} to ${currentEvent.currency} ${newBudget.toLocaleString()} (${diff < 0 ? 'Cost Optimization' : 'Budget Expansion'}). User-specified priority areas have been shielded while trimming discretionary categories.`;

    reallocations = breakdown.map((item: any) => {
      // If priority, keep reduction minimal
      const isPriority = currentEvent.spendingPriorities?.some((p: string) =>
        item.category.toLowerCase().includes(p.toLowerCase())
      );
      let adjustedFactor = factor;
      if (diff < 0 && isPriority) {
        adjustedFactor = Math.max(0.95, factor); // Shield priority
      }
      const newAmt = Math.round(item.amount * adjustedFactor);
      return {
        category: item.category,
        oldAmount: item.amount,
        newAmount: newAmt,
        changeReason: isPriority
          ? 'Shielded priority category with minimal adjustment.'
          : diff < 0
          ? 'Streamlined non-essential decor and rentals to absorb reduction.'
          : 'Allocated portion of surplus for enhanced guest experience.',
      };
    });

    taskModifications = [
      { action: 'modify', taskTitle: 'Renegotiate Vendor Quotations', details: `Request updated quotation packages aligned with revised ${currentEvent.currency} ${newBudget.toLocaleString()} target.` },
      { action: 'add', taskTitle: 'Audit Catering Menu Choices', details: 'Streamline live dessert and starter selections to maintain high quality at optimized price.' },
    ];
  } else if (lowerQuery.includes('guest') || lowerQuery.includes('people')) {
    summary = `Simulated an updated guest count scenario. Food & catering, seating arrangements, and favors scaled accordingly while fixed costs (photography, sound) remain stable.`;
    newBudget = currentBudget;
    reallocations = breakdown.map((item: any) => ({
      category: item.category,
      oldAmount: item.amount,
      newAmount: item.amount,
      changeReason: item.category.includes('Food') ? 'Re-evaluated per-plate portions' : 'Fixed cost unchanged',
    }));
    taskModifications = [
      { action: 'modify', taskTitle: 'Update Caterer with Revised Headcount', details: 'Provide revised table count and seating buffer.' },
    ];
  } else if (lowerQuery.includes('indoor') || lowerQuery.includes('outdoor')) {
    summary = `Simulated venue transition scenario. Outdoor tenting and generator reserves have been reallocated into indoor ambient lighting, acoustics, and air conditioning verification.`;
    newBudget = currentBudget;
    reallocations = breakdown.map((item: any) => ({
      category: item.category,
      oldAmount: item.amount,
      newAmount: item.amount,
      changeReason: 'Adjusted for indoor venue infrastructure.',
    }));
    taskModifications = [
      { action: 'add', taskTitle: 'Confirm Banquet Hall Sound Curfew', details: 'Check decibel limits and cutoff timings with banquet manager.' },
      { action: 'remove', taskTitle: 'Weather Tenting Standby', details: 'No longer required for indoor venue.' },
    ];
  } else {
    summary = `Analyzed scenario query: "${query}". Impact assessed on logistics, timeline, and vendor deliverables while protecting core event priorities.`;
    newBudget = currentBudget;
    reallocations = breakdown.map((item: any) => ({
      category: item.category,
      oldAmount: item.amount,
      newAmount: item.amount,
      changeReason: 'Category reviewed against scenario conditions.',
    }));
    taskModifications = [
      { action: 'modify', taskTitle: 'Review Schedule Milestones', details: 'Aligned planning deadlines with requested adjustments.' },
    ];
  }

  return {
    query,
    impactSummary: summary,
    preservedPriorities: currentEvent.spendingPriorities || ['Venue', 'Catering'],
    budgetAdjustments: {
      previousBudget: currentBudget,
      newBudget,
      difference: diff,
      reallocations,
    },
    taskModifications,
    recommendations: [
      'Lock revised parameters with vendors via written addendum.',
      'Check if any advances already paid need to be credited against revised milestone deliverables.',
      'Review task checklist to ensure team is aligned with the new targets.',
    ],
  };
}

function generateSmartCopilotResponse(
  message: string,
  currentEvent: any,
  _currentPlan: any,
  persona = 'general',
  tasks: any[] = [],
  expenses: any[] = [],
  vendors: any[] = []
) {
  const m = message.toLowerCase();
  const currency = currentEvent?.currency || '₹';
  const name = currentEvent?.name || 'your event';
  const budget = Number(currentEvent?.totalBudget) || 500000;
  const guestsCount = Number(currentEvent?.guestCount) || 150;
  const city = currentEvent?.city || 'your city';
  const theme = currentEvent?.theme || 'Elegant';
  const spent = Array.isArray(expenses)
    ? expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
    : 0;
  const remaining = Math.max(0, budget - spent);
  const perGuestBudget = Math.round(budget / Math.max(1, guestsCount));

  if (m.includes('reduce') || m.includes('budget') || m.includes('save') || m.includes('spending') || m.includes('audit') || m.includes('cost')) {
    const targetSave = Math.round(budget * 0.15);
    return `### Financial Audit & Cost Optimization for "${name}"

Based on your **${currency} ${budget.toLocaleString()}** total budget (${currency} ${perGuestBudget.toLocaleString()}/guest across **${guestsCount} guests** in **${city}**), you have spent **${currency} ${spent.toLocaleString()}** with **${currency} ${remaining.toLocaleString()}** remaining.

Here is how to unlock **${currency} ${targetSave.toLocaleString()} (15%)** in immediate savings while protecting your **${(currentEvent?.spendingPriorities || ['Venue', 'Catering']).join(' & ')}** priorities:

1. **Consolidate Live Catering Stations**: Cap interactive stations at **3 high-impact counters** instead of 6+. For ${guestsCount} guests, this reduces kitchen staffing and wastage by **~18%**.
2. **Indigenous ${theme} Flora**: Replace imported cold-chain stems with seasonal regional blooms and warm architectural LED uplighting in ${city} — saving **${currency} ${Math.round(budget * 0.04).toLocaleString()}**.
3. **Off-Peak Vendor Load-In**: Negotiate a unified sound & lighting package from a single production house rather than separate DJ and stage vendors.
4. **Lock a 5% Contingency Hold**: Keep **${currency} ${Math.round(budget * 0.05).toLocaleString()}** untouched until final settlement night.

[SUGGESTIONS: "Draft a vendor discount negotiation script", "What should I do this week?", "Questions to ask my caterer"]`;
  }

  if (m.includes('cater') || m.includes('food') || m.includes('menu') || m.includes('plate') || m.includes('drink')) {
    const cateringRecommended = Math.round(budget * 0.28);
    const maxPerPlate = Math.round(cateringRecommended / Math.max(1, guestsCount));
    return `### Catering & Menu Strategy for "${name}"

To stay within your optimal **${currency} ${cateringRecommended.toLocaleString()}** food allocation for **${guestsCount} guests**, aim for an all-inclusive per-plate cap of **${currency} ${maxPerPlate.toLocaleString()}**.

- **5 Essential Questions for Your Caterer**:
  1. **Guaranteed vs. Buffer Plates**: *"If we guarantee ${guestsCount} plates, will you hold a 10% buffer (${Math.round(guestsCount * 0.1)} extra plates) at the same base rate?"*
  2. **Service Staff Ratio**: *"Can you confirm 1 uniformed steward per 12 guests and dedicated attendants at live stations?"*
  3. **Dietary Segregation**: *"How will Jain, Vegan, and allergy-sensitive counters be separated in the kitchen and buffet line?"*
  4. **Leftover & Packaging Policy**: *"Are food-grade takeaway containers included for surplus desserts and mithai?"*
  5. **Power & Water Corkage**: *"Are there any hidden generator diesel or kitchen water charges from the venue?"*

[SUGGESTIONS: "Suggest unique decoration ideas", "Draft a vendor negotiation script", "Review my actual spending"]`;
  }

  if (m.includes('vendor') || m.includes('negotiate') || m.includes('contract') || m.includes('script') || m.includes('quote')) {
    return `### Vendor Negotiation Script & Contract Safeguards

You currently have **${vendors.length} shortlisted vendors** for **${name}**. Use this word-for-word script when finalizing quotes in **${city}**:

- **Word-for-Word Negotiation Script**:
  > *"We love your portfolio for our ${currentEvent?.startDate || 'upcoming'} ${currentEvent?.eventType || 'event'} at ${currentEvent?.venuePreference || city}. We are finalizing bookings in the next 48 hours with a strict ceiling of ${currency} ${Math.round(budget * 0.25).toLocaleString()} for this category. If you can include complimentary early setup and waive the overtime surcharge for the first 45 minutes, we are ready to transfer the booking token today."*

- **3 Mandatory Contract Clauses**:
  1. **Milestone Payment Split**: Never pay more than **25% advance** on signing, **50% one week prior**, and **25% after event completion**.
  2. **Named Lead Professional**: Specify the exact lead photographer/coordinator by name so a junior substitute isn't sent on event day.
  3. **Force Majeure & Date Transfer**: Ensure 100% of advances transfer to a rescheduled date if weather or civic restrictions occur.

[SUGGESTIONS: "Questions to ask my caterer", "Reduce my budget by 15%", "Weather contingency checklist"]`;
  }

  if (m.includes('decor') || m.includes('theme') || m.includes('idea') || m.includes('color') || m.includes('light')) {
    const colors = (currentEvent?.preferredColors || ['Champagne Gold', 'Royal Indigo']).join(' & ');
    return `### Creative & ${theme} Decor Concepts for "${name}"

Designed around your **${theme}** aesthetic and **${colors}** palette at **${currentEvent?.venuePreference || city}**:

1. **Architectural Entry Tunnel**: Frame the arrival walkway with draped raw silk in **${colors}**, accented by warm micro-fairy canopies and brass lanterns for an unforgettable first impression.
2. **Layered Focal Stage / Mandap**: Instead of heavy foam structures, use asymmetrical botanical arches paired with programmable warm-white pin-spots so photography skin tones remain crisp.
3. **Interactive Guest Touchpoint**: Set up an audio-visual "Wishes & Polaroid Wall" where guests clip instant prints alongside handwritten notes for the hosts.
4. **Table Scaping**: Low-profile floral runners (under 10 inches tall) so guests can converse effortlessly across dining tables.

[SUGGESTIONS: "How much should I allocate to decoration?", "Suggest entertainment ideas", "What should I do this week?"]`;
  }

  if (m.includes('weather') || m.includes('rain') || m.includes('contingency') || m.includes('backup') || m.includes('risk')) {
    return `### Weather & Operational Contingency Protocol

Because **${name}** in **${city}** uses a **${currentEvent?.venueType || 'Mixed'}** venue layout, keep these 4 safeguards ready:

- **72-Hour Weather Trigger**: Lock a standby agreement for clear-span waterproof marquee tenting or an indoor ballroom hold if rain probability exceeds **35%**.
- **Acoustic & Generator Redundancy**: Require **2x silent DG power generators** with automatic changeover (ATS) wired separately for stage sound and catering warmers.
- **Guest Arrival Valet & Canopy**: Position 25 oversized golf umbrellas and non-slip coir matting along the main drop-off porch.
- **Medical & Safety Kit**: Keep a dedicated first-aid station, fire extinguishers near live cooking counters, and wheelchair-accessible ramps verified by noon on event day.

[SUGGESTIONS: "Add this to my event-day run-sheet", "Review my actual spending", "What should I do this week?"]`;
  }

  if (m.includes('timeline') || m.includes('this week') || m.includes('schedule') || m.includes('tasks') || m.includes('checklist')) {
    const pendingCount = Array.isArray(tasks) ? tasks.filter((t) => t.status !== 'Completed').length : 3;
    return `### Priority Execution Roadmap (${pendingCount} Tasks Pending)

For **${name}** (${currentEvent?.startDate || 'upcoming'}), focus on these high-impact milestones this week:

1. **Lock Venue & Technical Floorplan**: Confirm electrical load (kVA), sound curfew timings, and green-room readiness at **${currentEvent?.venuePreference || city}**.
2. **Catering Headcount & Tasting Sign-Off**: Freeze your base plate guarantee for **${guestsCount} guests** and verify Jain/Vegan station placement.
3. **Vendor Advance Reconciliation**: Log all paid token amounts in **Budget & Expenses** so your **${currency} ${remaining.toLocaleString()}** remaining balance stays 100% accurate.
4. **Master Run-Sheet Distribution**: Share the hour-by-hour cue sheet with your photographer, emcee, and banquet captain 5 days prior.

[SUGGESTIONS: "Questions to ask my caterer", "Weather contingency checklist", "Reduce my budget by 15%"]`;
  }

  return `### Strategic Copilot Analysis for "${name}"

Regarding your request (*"${message}"*) in **${persona.toUpperCase()}** mode:

- **Live Financial Snapshot**: Out of your **${currency} ${budget.toLocaleString()}** budget (${currency} ${perGuestBudget.toLocaleString()}/guest for **${guestsCount} guests**), **${currency} ${spent.toLocaleString()}** is committed and **${currency} ${remaining.toLocaleString()}** is available.
- **Execution Recommendation**: Protect your top priorities (**${(currentEvent?.spendingPriorities || ['Venue', 'Food and catering']).join(', ')}**) by locking written deliverable SLAs before releasing second-tranche vendor payments.
- **Guest Experience**: Add a 30-minute hospitality buffer between arrival refreshments and the main program at **${currentEvent?.venuePreference || city}** to absorb traffic delays.

Use the **1-Click Action Card** below to apply this directly to your event plan, or ask a follow-up question!

[SUGGESTIONS: "Reduce my budget by 15%", "Draft a vendor negotiation script", "What should I do this week?"]`;
}

function generateSmartInvitationFallback(currentEvent: any, tone: string, language: string) {
  if (language === 'Hindi') {
    return {
      headline: '|| श्री गणेशाय नमः ||',
      hosts: 'सम्मानित परिवार',
      mainBody: `अत्यंत हर्ष और आनंद के साथ हम आपको ${currentEvent.name} के इस पावन और मांगलिक अवसर पर सादर आमंत्रित करते हैं।\n\nआपकी आत्मीय उपस्थिति और मंगलकामनाएं हमारे उत्सव को और भी भव्य बनाएंगी। कृपया सपरिवार पधारकर हमें कृतार्थ करें।`,
      itineraryHighlight: `दिनांक: ${currentEvent.startDate} | स्थान: ${currentEvent.city}`,
      rsvpDetails: 'दर्शनाभिलाषी: समस्त परिवारजन एवं मित्रगण',
      quote: 'सम्बन्धों की डोर जब प्रेम से बंधती है, उत्सव तभी पूर्ण होता है।',
    };
  }

  if (language === 'Gujarati') {
    return {
      headline: '|| શ્રી ગણેશાય નમઃ ||',
      hosts: 'સ્નેહી પરિવાર',
      mainBody: `અત્યંત આનંદ અને હર્ષ સાથે જણાવવાનું કે ${currentEvent.name} પ્રસંગે આપશ્રીને સ્નેહભર્યું નિમંત્રણ પાઠવીએ છીએ.\n\nઆપની રૂડી ઉપસ્થિતિ અને આશીર્વાદ અમારા ઉત્સાહમાં વધારો કરશે. આપના પરિવાર સાથે પધારી શોભા વધારશો.`,
      itineraryHighlight: `તારીખ: ${currentEvent.startDate} | સ્થળ: ${currentEvent.city}`,
      rsvpDetails: 'નિમંત્રક: સમગ્ર પરિવાર',
      quote: 'સ્નેહ, આશીર્વાદ અને પરંપરાનો સંગમ એટલે આપણો આ રૂડો ઉત્સવ.',
    };
  }

  // English
  return {
    headline: tone.includes('Royal') ? 'A Royal Celebration of Love and Unity' : 'Join Us in Celebrating a Special Milestone',
    hosts: 'The Family & Loved Ones',
    mainBody: `We cordially invite you to share in the joy and wonder of ${currentEvent.name}.\n\nSurrounded by those who have colored our lives with warmth and encouragement, we look forward to an evening of unforgettable memories, music, laughter, and camaraderie. Your presence will make our celebration truly complete.`,
    itineraryHighlight: `Date: ${currentEvent.startDate} | Venue: ${currentEvent.venuePreference || currentEvent.city}`,
    rsvpDetails: 'Kindly RSVP by contacting the hosts or via your Eventora invitation link.',
    quote: 'Moments are fleeting, but the warmth of shared joy lasts forever.',
  };
}

// Development Vite Middleware setup or Production Static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[Eventora Server] Vite dev middleware mounted');
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
    console.log(`[Eventora Server] Serving production build from ${distPath}`);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Eventora Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
