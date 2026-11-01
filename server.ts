import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { fileURLToPath } from 'url';
import {
  sanitizeTextInput,
  generateSmartFallbackPlan,
  generateSmartWhatIfFallback,
  generateSmartCopilotResponse,
  generateSmartInvitationFallback,
} from './src/utils/event-plan-engine';
import { normalizeAllocationsToTotal } from './src/utils/budgetCalculations';
import {
  EventData,
  EventPlan,
  EventTask,
  EventExpense,
  EventVendor,
  EventGuest,
  BudgetItemAllocation,
} from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000;

// Disable Express server fingerprint header
app.disable('x-powered-by');

// Security headers middleware (compatible with AI Studio preview iframe)
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );
  next();
});

// Bounded JSON body parser (1MB max to prevent payload DoS)
app.use(express.json({ limit: '1mb' }));

// Lightweight per-IP sliding window rate limiter for /api/ai/* routes
const rateLimitWindowMs = 60_000;
const maxRequestsPerWindow = 60;
const ipRequestCounts = new Map<string, { count: number; resetAt: number }>();

app.use('/api/ai', (req: Request, res: Response, next: NextFunction) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'local';
  const now = Date.now();
  const entry = ipRequestCounts.get(clientIp);

  if (!entry || now > entry.resetAt) {
    ipRequestCounts.set(clientIp, { count: 1, resetAt: now + rateLimitWindowMs });
    return next();
  }

  if (entry.count >= maxRequestsPerWindow) {
    return res.status(429).json({
      error: 'Too many AI requests. Please wait a moment and try again.',
    });
  }

  entry.count += 1;
  return next();
});

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

interface ChatHistoryEntry {
  role: 'user' | 'assistant' | 'model';
  content: string;
}

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
    const body = (req.body || {}) as Partial<EventData>;
    const name = sanitizeTextInput(body.name || 'Untitled Celebration', 120);
    const eventType = sanitizeTextInput(body.eventType || 'Wedding', 60) as EventData['eventType'];
    const startDate = sanitizeTextInput(body.startDate || '', 30);
    const endDate = sanitizeTextInput(body.endDate || '', 30);
    const city = sanitizeTextInput(body.city || 'Mumbai', 80);
    const venuePreference = sanitizeTextInput(body.venuePreference || '', 120);
    const venueType = sanitizeTextInput(body.venueType || 'Mixed', 30) as EventData['venueType'];
    const rawGuests = Number(body.guestCount);
    const guestCount = Number.isFinite(rawGuests) && rawGuests > 0 ? Math.min(Math.round(rawGuests), 50000) : 150;
    const rawBudget = Number(body.totalBudget);
    const totalBudget = Number.isFinite(rawBudget) && rawBudget > 0 ? Math.round(rawBudget) : 500000;
    const currency = sanitizeTextInput(body.currency || 'INR', 10) as EventData['currency'];
    const budgetFlexibility = sanitizeTextInput(body.budgetFlexibility || 'Moderate', 30) as EventData['budgetFlexibility'];
    const spendingPriorities = Array.isArray(body.spendingPriorities)
      ? body.spendingPriorities.map((p) => sanitizeTextInput(p, 60)).filter(Boolean)
      : [];
    const costSavingCategories = Array.isArray(body.costSavingCategories)
      ? body.costSavingCategories.map((c) => sanitizeTextInput(c, 60)).filter(Boolean)
      : [];
    const theme = sanitizeTextInput(body.theme || 'Elegant', 60) as EventData['theme'];
    const preferredColors = Array.isArray(body.preferredColors)
      ? body.preferredColors.map((c) => sanitizeTextInput(c, 40)).filter(Boolean)
      : [];
    const foodPreferences = Array.isArray(body.foodPreferences)
      ? body.foodPreferences.map((f) => sanitizeTextInput(f, 80)).filter(Boolean)
      : [];
    const entertainmentPreferences = Array.isArray(body.entertainmentPreferences)
      ? body.entertainmentPreferences.map((e) => sanitizeTextInput(e, 80)).filter(Boolean)
      : [];
    const accessibilityRequirements = sanitizeTextInput(body.accessibilityRequirements || '', 250);
    const culturalPreferences = sanitizeTextInput(body.culturalPreferences || '', 250);
    const additionalInstructions = sanitizeTextInput(body.additionalInstructions || '', 350);

    const sanitizedPayload: Partial<EventData> = {
      name,
      eventType,
      startDate,
      endDate,
      city,
      venuePreference,
      venueType,
      guestCount,
      totalBudget,
      currency,
      budgetFlexibility,
      spendingPriorities,
      costSavingCategories,
      theme,
      preferredColors,
      foodPreferences,
      entertainmentPreferences,
      accessibilityRequirements,
      culturalPreferences,
      additionalInstructions,
    };

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
3. Adjust categories to fit the event type.
4. Provide realistic percentages and actionable cost-saving tips for each category.

Return ONLY valid JSON matching the EventPlan schema without markdown backticks.
`;

    if (genAI) {
      try {
        const response = await withTimeout(
          genAI.models.generateContent({
            model: 'gemini-2.5-flash',
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
        const parsed = JSON.parse(cleaned) as EventPlan;

        if (parsed.budgetBreakdown && Array.isArray(parsed.budgetBreakdown)) {
          parsed.budgetBreakdown = normalizeAllocationsToTotal(
            parsed.budgetBreakdown as BudgetItemAllocation[],
            totalBudget
          );
        }

        return res.json({ success: true, plan: parsed, source: 'gemini' });
      } catch (geminiErr: unknown) {
        const msg = geminiErr instanceof Error ? geminiErr.message : 'Unknown error';
        console.warn('[Gemini API call failed, falling back to smart generator]:', msg);
      }
    }

    const fallbackPlan = generateSmartFallbackPlan(sanitizedPayload);
    return res.json({ success: true, plan: fallbackPlan, source: 'fallback' });
  } catch (error: unknown) {
    console.error('Plan generation error:', error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'Failed to generate event plan.' });
  }
});

/**
 * 2. Signature Feature — What-If Event Planner
 */
app.post('/api/ai/what-if', async (req: Request, res: Response) => {
  try {
    const body = (req.body || {}) as {
      query?: string;
      currentEvent?: Partial<EventData>;
      currentPlan?: Partial<EventPlan>;
    };

    const query = sanitizeTextInput(body.query, 400);
    if (!query) {
      return res.status(400).json({ error: 'Scenario query is required.' });
    }

    const currentEvent = body.currentEvent || {};
    const currentPlan = body.currentPlan || {};

    if (genAI) {
      try {
        const prompt = `
You are Eventora's signature What-If Simulation Engine.
Evaluate this scenario modification: "${query}"
Current Event: ${sanitizeTextInput(currentEvent.name, 100)} (${sanitizeTextInput(currentEvent.eventType, 50)})
Current Budget: ${sanitizeTextInput(currentEvent.currency, 10)} ${Number(currentEvent.totalBudget) || 500000}
Current Guests: ${Number(currentEvent.guestCount) || 150}
Priorities: ${(currentEvent.spendingPriorities || []).join(', ')}
Current Breakdown: ${JSON.stringify(currentPlan.budgetBreakdown || [])}

Return ONLY valid JSON matching the WhatIfSimulationResult structure where reallocations sum to newBudget.
`;
        const response = await withTimeout(
          genAI.models.generateContent({
            model: 'gemini-2.5-flash',
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
      } catch (geminiErr: unknown) {
        const msg = geminiErr instanceof Error ? geminiErr.message : 'Unknown error';
        console.warn('[Gemini What-If failed, using smart simulation fallback]:', msg);
      }
    }

    const fallbackResult = generateSmartWhatIfFallback(query, currentEvent, currentPlan);
    return res.json({ success: true, result: fallbackResult, source: 'fallback' });
  } catch (error: unknown) {
    console.error('What-If error:', error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'Failed to simulate scenario.' });
  }
});

/**
 * 3. AI Copilot Chat Assistant
 */
app.post('/api/ai/copilot', async (req: Request, res: Response) => {
  try {
    const body = (req.body || {}) as {
      message?: string;
      currentEvent?: Partial<EventData>;
      currentPlan?: Partial<EventPlan>;
      history?: ChatHistoryEntry[];
      persona?: string;
      tasks?: EventTask[];
      expenses?: EventExpense[];
      vendors?: EventVendor[];
      guests?: EventGuest[];
    };

    const message = sanitizeTextInput(body.message, 500);
    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const currentEvent = body.currentEvent || {};
    const currentPlan = body.currentPlan || {};
    const history = Array.isArray(body.history) ? body.history : [];
    const persona = sanitizeTextInput(body.persona || 'general', 30) || 'general';
    const tasks = Array.isArray(body.tasks) ? body.tasks : [];
    const expenses = Array.isArray(body.expenses) ? body.expenses : [];
    const vendors = Array.isArray(body.vendors) ? body.vendors : [];
    const guests = Array.isArray(body.guests) ? body.guests : [];

    const totalSpent = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const pendingTasks = tasks.filter((t) => t.status !== 'Completed');

    const personaPrompts: Record<string, string> = {
      general: 'Act as a Holistic Chief Event Strategist balancing budget, guest delight, and seamless execution.',
      budget: 'Act as a Senior Financial Auditor & Cost Controller. Focus on per-guest economics, category variance, and protecting contingency reserves.',
      vendor: 'Act as a Sharp Vendor Procurement & Contract Negotiator. Provide word-for-word negotiation scripts, SLA clauses, and payment milestone protections.',
      timeline: 'Act as a Master Showcaller & Logistics Director. Focus on cue-to-cue run-sheets, buffer times, load-in schedules, and critical path tasks.',
      creative: 'Act as a Luxury Event Creative Director & Culinary Stylist. Focus on color palettes, lighting design, floral architecture, and interactive food stations.',
    };

    if (genAI) {
      try {
        const systemInstruction = `
You are "Eventora Copilot", an interactive AI Event Planning Chatbot & Financial Strategist.
Specialist Mode: ${personaPrompts[persona] || personaPrompts.general}

LIVE EVENT DATA CONTEXT:
- Event Name: "${sanitizeTextInput(currentEvent.name, 100)}" (${sanitizeTextInput(currentEvent.eventType, 50)})
- Date & Location: ${sanitizeTextInput(currentEvent.startDate, 30)} in ${sanitizeTextInput(currentEvent.city, 60)}
- Total Budget: ${sanitizeTextInput(currentEvent.currency || '₹', 10)} ${Number(currentEvent.totalBudget || 0).toLocaleString()}
- Actual Spent So Far: ${totalSpent.toLocaleString()}
- Expected Guests: ${Number(currentEvent.guestCount) || 150} (${guests.length} roster entries)
- Operational Tasks: ${pendingTasks.length} pending out of ${tasks.length} total tasks
- Always append 3 helpful follow-up question chips at the end: [SUGGESTIONS: "Follow up 1", "Follow up 2", "Follow up 3"]
`;
        const contents = [
          { role: 'user', parts: [{ text: systemInstruction }] },
          {
            role: 'model',
            parts: [
              {
                text: 'Understood. I am Eventora Copilot, grounded in your live event metrics and ready to assist.',
              },
            ],
          },
          ...history.slice(-8).map((h) => ({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: sanitizeTextInput(h.content, 600) }],
          })),
          { role: 'user', parts: [{ text: message }] },
        ];

        const response = await withTimeout(
          genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents,
          }),
          1800
        );

        const reply = response.text || '';
        if (reply) {
          return res.json({ success: true, reply, source: 'gemini' });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.warn('Copilot Gemini error:', msg);
      }
    }

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
  } catch (error: unknown) {
    console.error('Copilot error:', error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'Copilot request failed.' });
  }
});

/**
 * 4. Multi-language Invitation Studio Generator
 */
app.post('/api/ai/invitation', async (req: Request, res: Response) => {
  try {
    const body = (req.body || {}) as {
      currentEvent?: Partial<EventData>;
      tone?: string;
      language?: string;
    };

    const currentEvent = body.currentEvent || {};
    const tone = sanitizeTextInput(body.tone || 'Warm & Celebratory', 60) || 'Warm & Celebratory';
    const language = sanitizeTextInput(body.language || 'English', 30) || 'English';

    if (genAI) {
      try {
        const prompt = `
Create an event invitation card text for:
- Event: ${sanitizeTextInput(currentEvent.name, 100)}
- Type: ${sanitizeTextInput(currentEvent.eventType, 50)}
- Date: ${sanitizeTextInput(currentEvent.startDate, 30)}
- Location: ${sanitizeTextInput(currentEvent.city, 60)} (${sanitizeTextInput(currentEvent.venuePreference || 'Grand Banquet', 80)})
- Tone: ${tone}
- Language: ${language}

Return ONLY JSON with keys: headline, hosts, mainBody, itineraryHighlight, rsvpDetails, quote.
`;
        const response = await withTimeout(
          genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' },
          }),
          2500
        );

        const text = response.text?.trim() || '';
        const cleaned = text.replace(/^```json/i, '').replace(/```$/i, '').trim();
        const parsed = JSON.parse(cleaned);
        return res.json({ success: true, invitation: parsed, source: 'gemini' });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.warn('Invitation Gemini error:', msg);
      }
    }

    const fallbackInvite = generateSmartInvitationFallback(currentEvent, tone, language);
    return res.json({ success: true, invitation: fallbackInvite, source: 'fallback' });
  } catch (error: unknown) {
    console.error('Invitation error:', error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'Invitation generation failed.' });
  }
});

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
