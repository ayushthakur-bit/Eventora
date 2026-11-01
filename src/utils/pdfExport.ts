import { jsPDF } from 'jspdf';
import { EventData, EventExpense, EventGuest, EventTask, EventVendor } from '../types';

/**
 * Sanitizes text for standard PDF Type1 fonts (Helvetica/WinAnsiEncoding)
 * so Unicode characters like ₹, •, —, or emojis never render as garbled glyphs.
 */
function sanitizePdfText(input: string | undefined | null): string {
  if (!input) return '';
  return String(input)
    .replace(/₹/g, 'Rs. ')
    .replace(/[—–]/g, ' - ')
    .replace(/[•·]/g, '|')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
    .trim();
}

/**
 * Formats currency using ASCII-safe prefixes for PDF rendering.
 */
function formatPdfCurrency(amount: number, currency: EventData['currency'] = 'INR'): string {
  const safeAmount = isNaN(amount) ? 0 : amount;
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  const prefixMap: Record<string, string> = {
    INR: 'Rs. ',
    USD: '$',
    EUR: 'EUR ',
    GBP: 'GBP ',
    AED: 'AED ',
  };
  const prefix = prefixMap[currency] || 'Rs. ';
  return `${prefix}${safeAmount.toLocaleString(locale, { maximumFractionDigits: 0 })}`;
}

/**
 * Triggers a synchronous browser file download using a Blob URL and mounted anchor element.
 * Preserves transient user activation in sandboxed iframes where jsPDF's async setTimeout save fails.
 */
function triggerPdfBlobDownload(doc: jsPDF, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const pdfArrayBuffer = doc.output('arraybuffer');
  const blob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 60000);
}

export function exportEventToPdf(
  event: EventData,
  tasks: EventTask[] = [],
  expenses: EventExpense[] = [],
  vendors: EventVendor[] = [],
  _guests: EventGuest[] = []
): boolean {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    let yPos = 20;

    const ensureSpace = (neededHeight: number) => {
      if (yPos + neededHeight > pageHeight - 18) {
        doc.addPage();
        yPos = 20;
      }
    };

    const drawSectionHeader = (number: number, title: string) => {
      ensureSpace(16);
      doc.setFillColor(238, 242, 255); // Indigo 50
      doc.rect(margin, yPos, contentWidth, 8, 'F');
      doc.setFillColor(79, 70, 229); // Indigo 600 accent bar
      doc.rect(margin, yPos, 2.5, 8, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(49, 46, 129); // Indigo 900
      doc.text(sanitizePdfText(`${number}. ${title}`), margin + 6, yPos + 5.5);
      yPos += 12;
    };

    // -------------------------------------------------------------------------
    // Top Cover Banner
    // -------------------------------------------------------------------------
    doc.setFillColor(67, 56, 202); // Indigo 700
    doc.rect(0, 0, pageWidth, 34, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('Eventora - Master Event Blueprint', margin, 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(224, 231, 255);
    doc.text(
      sanitizePdfText(
        `Comprehensive Event Plan & Financial Schedule | Generated on ${new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })}`
      ),
      margin,
      23
    );
    doc.text(
      sanitizePdfText(`Status: ${event.status} | Currency: ${event.currency} | Flexibility: ${event.budgetFlexibility}`),
      margin,
      29
    );

    yPos = 42;

    // -------------------------------------------------------------------------
    // Event Summary Box
    // -------------------------------------------------------------------------
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, yPos, contentWidth, 28, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(sanitizePdfText(event.name), margin + 4, yPos + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(
      sanitizePdfText(
        `Event Type: ${event.eventType}   |   Date: ${event.startDate}${event.endDate ? ` to ${event.endDate}` : ''}   |   City: ${event.city}`
      ),
      margin + 4,
      yPos + 14
    );
    doc.text(
      sanitizePdfText(
        `Venue: ${event.venuePreference || 'Curated Venue'} (${event.venueType})   |   Guests: ${event.guestCount}   |   Theme: ${event.theme}`
      ),
      margin + 4,
      yPos + 20
    );

    const totalSpent = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
    const remainingBudget = Math.max(0, event.totalBudget - totalSpent);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(67, 56, 202);
    doc.text(
      sanitizePdfText(
        `Total Planned Budget: ${formatPdfCurrency(event.totalBudget, event.currency)}   |   Actual Spent: ${formatPdfCurrency(
          totalSpent,
          event.currency
        )}   |   Remaining: ${formatPdfCurrency(remainingBudget, event.currency)}`
      ),
      margin + 4,
      yPos + 26
    );

    yPos += 35;

    // -------------------------------------------------------------------------
    // 1. Executive Concept & Strategic Overview
    // -------------------------------------------------------------------------
    if (event.plan?.overview) {
      drawSectionHeader(1, 'Executive Concept & Strategic Overview');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      const summaryLines = doc.splitTextToSize(
        sanitizePdfText(event.plan.overview.summary),
        contentWidth
      );
      ensureSpace(summaryLines.length * 4.8 + 4);
      doc.text(summaryLines, margin, yPos);
      yPos += summaryLines.length * 4.8 + 3;

      if (event.plan.overview.recommendedTheme || event.plan.overview.suggestedFormat) {
        const formatText = sanitizePdfText(
          `Recommended Theme: ${event.plan.overview.recommendedTheme || event.theme}  |  Suggested Format: ${
            event.plan.overview.suggestedFormat || 'Standard'
          }`
        );
        const formatLines = doc.splitTextToSize(formatText, contentWidth);
        ensureSpace(formatLines.length * 4.5 + 3);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(67, 56, 202);
        doc.text(formatLines, margin, yPos);
        yPos += formatLines.length * 4.5 + 2;
      }

      if (event.plan.overview.recommendations && event.plan.overview.recommendations.length > 0) {
        ensureSpace(10);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);
        doc.text('Key Strategic Recommendations:', margin, yPos);
        yPos += 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.8);
        event.plan.overview.recommendations.forEach((rec) => {
          const lines = doc.splitTextToSize(sanitizePdfText(`- ${rec}`), contentWidth - 4);
          ensureSpace(lines.length * 4.4 + 1.5);
          doc.text(lines, margin + 2, yPos);
          yPos += lines.length * 4.4 + 1;
        });
        yPos += 3;
      }
    }

    // -------------------------------------------------------------------------
    // 2. Budget Allocation Blueprint
    // -------------------------------------------------------------------------
    if (event.plan?.budgetBreakdown && event.plan.budgetBreakdown.length > 0) {
      drawSectionHeader(2, 'Budget Allocation Blueprint');

      ensureSpace(12);
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, yPos, contentWidth, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('Category', margin + 2, yPos + 4.8);
      doc.text('Allocation', margin + 62, yPos + 4.8);
      doc.text('Share', margin + 98, yPos + 4.8);
      doc.text('Cost-Saving Tip', margin + 116, yPos + 4.8);
      yPos += 9;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);

      event.plan.budgetBreakdown.forEach((item, idx) => {
        const tipLines = doc.splitTextToSize(
          sanitizePdfText(item.costSavingTip || item.reason || 'Standard allocation'),
          contentWidth - 118
        );
        const rowHeight = Math.max(6.5, tipLines.length * 4.2 + 2);
        ensureSpace(rowHeight + 2);

        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, yPos - 3.5, contentWidth, rowHeight, 'F');
        }

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(sanitizePdfText(item.category), margin + 2, yPos);

        doc.setFont('helvetica', 'normal');
        doc.text(formatPdfCurrency(item.amount, event.currency), margin + 62, yPos);
        doc.text(`${item.percentage}%`, margin + 98, yPos);
        doc.setTextColor(71, 85, 105);
        doc.text(tipLines, margin + 116, yPos);

        yPos += rowHeight;
      });
      yPos += 4;
    }

    // -------------------------------------------------------------------------
    // 3. Timeline & Event-Day Schedule
    // -------------------------------------------------------------------------
    if (event.plan?.timeline) {
      drawSectionHeader(3, 'Timeline & Event-Day Itinerary');

      if (event.plan.timeline.preEventTasks && event.plan.timeline.preEventTasks.length > 0) {
        ensureSpace(10);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(30, 41, 59);
        doc.text('Pre-Event Preparation Milestones:', margin, yPos);
        yPos += 5.5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        event.plan.timeline.preEventTasks.forEach((taskItem) => {
          const phaseLines = doc.splitTextToSize(
            sanitizePdfText(`[${taskItem.timing}] ${taskItem.title} (${taskItem.priority} Priority): ${taskItem.description}`),
            contentWidth - 4
          );
          ensureSpace(phaseLines.length * 4.3 + 2);
          doc.setTextColor(51, 65, 85);
          doc.text(phaseLines, margin + 2, yPos);
          yPos += phaseLines.length * 4.3 + 1.5;
        });
        yPos += 3;
      }

      if (event.plan.timeline.eventDaySchedule && event.plan.timeline.eventDaySchedule.length > 0) {
        ensureSpace(10);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(30, 41, 59);
        doc.text('Event-Day Run of Show:', margin, yPos);
        yPos += 5.5;

        event.plan.timeline.eventDaySchedule.forEach((slot) => {
          const noteSuffix = slot.notes ? ` (${slot.notes})` : '';
          const activityLines = doc.splitTextToSize(
            sanitizePdfText(`${slot.activity}${noteSuffix}`),
            contentWidth - 32
          );
          const rowHeight = Math.max(5.5, activityLines.length * 4.3 + 1.5);
          ensureSpace(rowHeight + 1);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(67, 56, 202);
          doc.text(sanitizePdfText(slot.time), margin + 2, yPos);

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 41, 59);
          doc.text(activityLines, margin + 30, yPos);
          yPos += rowHeight;
        });
        yPos += 4;
      }
    }

    // -------------------------------------------------------------------------
    // 4. Vendor Sourcing & Checklist
    // -------------------------------------------------------------------------
    if (
      (event.plan?.vendorChecklist && event.plan.vendorChecklist.length > 0) ||
      vendors.length > 0
    ) {
      drawSectionHeader(4, 'Vendor Sourcing & Checklist');

      if (event.plan?.vendorChecklist && event.plan.vendorChecklist.length > 0) {
        event.plan.vendorChecklist.forEach((vendorItem) => {
          const recText = sanitizePdfText(
            `${vendorItem.category} [${vendorItem.status}] - Est. ${vendorItem.estimatedPriceRange} (Deadline: ${vendorItem.bookingDeadline}): ${vendorItem.whatToLookFor}`
          );
          const lines = doc.splitTextToSize(recText, contentWidth - 4);
          ensureSpace(lines.length * 4.4 + 2.5);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(51, 65, 85);
          doc.text(lines, margin + 2, yPos);
          yPos += lines.length * 4.4 + 2;
        });
        yPos += 2;
      }
    }

    // -------------------------------------------------------------------------
    // 5. Creative Ideas (Decor, Menu & Entertainment)
    // -------------------------------------------------------------------------
    if (event.plan?.personalizedIdeas) {
      drawSectionHeader(5, 'Creative Ideas (Decor, Menu & Entertainment)');

      const ideaGroups = [
        { label: 'Theme & Decor Suggestions', items: event.plan.personalizedIdeas.decorationSuggestions || [] },
        { label: 'Food & Menu Curation', items: event.plan.personalizedIdeas.foodAndMenuIdeas || [] },
        {
          label: 'Guest Engagement & Entertainment',
          items: event.plan.personalizedIdeas.activitiesAndEntertainment || [],
        },
        {
          label: 'Budget-Friendly Alternatives',
          items: event.plan.personalizedIdeas.budgetFriendlyAlternatives || [],
        },
      ];

      ideaGroups.forEach((group) => {
        if (group.items.length === 0) return;
        ensureSpace(9);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text(sanitizePdfText(group.label), margin + 2, yPos);
        yPos += 4.5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        group.items.forEach((idea) => {
          const lines = doc.splitTextToSize(sanitizePdfText(`- ${idea}`), contentWidth - 6);
          ensureSpace(lines.length * 4.2 + 1.5);
          doc.text(lines, margin + 4, yPos);
          yPos += lines.length * 4.2 + 1;
        });
        yPos += 2;
      });
    }

    // -------------------------------------------------------------------------
    // 6. Risk Analysis & Contingency Blueprint
    // -------------------------------------------------------------------------
    if (event.plan?.risksAndRecommendations) {
      drawSectionHeader(6, 'Risk Analysis & Contingency Plan');

      const risks = event.plan.risksAndRecommendations;
      if (risks.commonPlanningProblems && risks.commonPlanningProblems.length > 0) {
        risks.commonPlanningProblems.forEach((problem) => {
          const lines = doc.splitTextToSize(sanitizePdfText(`- ${problem}`), contentWidth - 4);
          ensureSpace(lines.length * 4.4 + 1.5);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(51, 65, 85);
          doc.text(lines, margin + 2, yPos);
          yPos += lines.length * 4.4 + 1.2;
        });
        yPos += 2;
      }

      const contingencyDetails = [
        risks.weatherContingency ? `Weather Contingency: ${risks.weatherContingency}` : '',
        risks.backupVendorsOrVenues ? `Backup Vendors/Venues: ${risks.backupVendorsOrVenues}` : '',
        risks.accessibilityAndSafety ? `Accessibility & Safety: ${risks.accessibilityAndSafety}` : '',
      ].filter(Boolean);

      contingencyDetails.forEach((detail) => {
        const lines = doc.splitTextToSize(sanitizePdfText(detail), contentWidth - 4);
        ensureSpace(lines.length * 4.4 + 2);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        doc.text(lines, margin + 2, yPos);
        yPos += lines.length * 4.4 + 1.5;
      });
      yPos += 2;
    }

    // -------------------------------------------------------------------------
    // 7. Action Tasks & Execution Checklist
    // -------------------------------------------------------------------------
    if (tasks.length > 0) {
      drawSectionHeader(7, 'Action Tasks & Execution Milestones');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);

      tasks.forEach((task) => {
        const statusMark =
          task.status === 'Completed'
            ? '[COMPLETED]'
            : task.status === 'In Progress'
            ? '[IN PROGRESS]'
            : '[PENDING]';
        const lineText = sanitizePdfText(
          `${statusMark} ${task.title} | Category: ${task.category} | Due: ${task.dueDate || 'TBD'} | Priority: ${task.priority}`
        );
        const lines = doc.splitTextToSize(lineText, contentWidth - 4);
        ensureSpace(lines.length * 4.3 + 1.5);
        doc.text(lines, margin + 2, yPos);
        yPos += lines.length * 4.3 + 1.2;
      });
    }

    // -------------------------------------------------------------------------
    // Page Numbers & Footer on Every Page
    // -------------------------------------------------------------------------
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        sanitizePdfText(`${event.name} - Eventora Blueprint`),
        margin,
        pageHeight - 7
      );
      doc.text(
        `Page ${i} of ${totalPages}`,
        pageWidth - margin - 18,
        pageHeight - 7
      );
    }

    const safeFileName = `${event.name.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '') || 'Event'}_Blueprint.pdf`;
    triggerPdfBlobDownload(doc, safeFileName);
    return true;
  } catch (err) {
    console.error('PDF generation error:', err);
    return false;
  }
}

export type InvitationTemplateStyle = 'royal' | 'festive' | 'minimal' | 'emerald' | 'rose';

export interface InvitationCardPdfPayload {
  eventName: string;
  templateStyle: InvitationTemplateStyle;
  emblem?: string;
  language?: string;
  tone?: string;
  invitationData: {
    headline: string;
    hosts: string;
    mainBody: string;
    itineraryHighlight: string;
    rsvpDetails: string;
    quote: string;
  };
}

/**
 * Helper to word-wrap a paragraph on a 2D Canvas context while respecting explicit newlines.
 */
function wrapCanvasParagraphs(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const paragraphs = (text || '').split('\n');
  const lines: string[] = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) {
      lines.push('');
      continue;
    }
    const words = trimmed.split(/\s+/);
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
      const candidate = `${currentLine} ${words[i]}`;
      if (ctx.measureText(candidate).width <= maxWidth) {
        currentLine = candidate;
      } else {
        lines.push(currentLine);
        currentLine = words[i];
      }
    }
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Renders the designed invitation card (supporting Royal, Festive, Minimal, Emerald, and Rose themes
 * and multi-lingual English/Hindi/Gujarati scripts via HTML5 Canvas) into a crisp PDF
 * and downloads it immediately.
 */
export function exportInvitationCardToPdf(payload: InvitationCardPdfPayload): boolean {
  try {
    const { eventName, templateStyle, emblem = '❦', invitationData } = payload;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Render high-DPI invitation card on HTML5 Canvas when running in browser
    let renderedViaCanvas = false;
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      const width = 1240;
      const height = 1754; // A4 aspect ratio at ~150 DPI
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        renderedViaCanvas = true;

        // 1. Background Theme Gradient
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        if (templateStyle === 'royal') {
          grad.addColorStop(0, '#451a03'); // amber-950
          grad.addColorStop(0.5, '#0f172a'); // slate-900
          grad.addColorStop(1, '#451a03'); // amber-950
        } else if (templateStyle === 'festive') {
          grad.addColorStop(0, '#2e1065'); // violet-950
          grad.addColorStop(0.5, '#1e1b4b'); // indigo-950
          grad.addColorStop(1, '#020617'); // slate-950
        } else if (templateStyle === 'emerald') {
          grad.addColorStop(0, '#022c22'); // emerald-950
          grad.addColorStop(0.5, '#0f172a'); // slate-900
          grad.addColorStop(1, '#022c22'); // emerald-950
        } else if (templateStyle === 'rose') {
          grad.addColorStop(0, '#4c0519'); // rose-950
          grad.addColorStop(0.5, '#1e1b4b'); // indigo-950
          grad.addColorStop(1, '#4c0519'); // rose-950
        } else {
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(1, '#f8fafc');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Theme palette colors
        const isMinimal = templateStyle === 'minimal';
        const borderColor =
          templateStyle === 'royal'
            ? 'rgba(217, 119, 6, 0.55)'
            : templateStyle === 'festive'
            ? 'rgba(139, 92, 246, 0.55)'
            : templateStyle === 'emerald'
            ? 'rgba(16, 185, 129, 0.55)'
            : templateStyle === 'rose'
            ? 'rgba(244, 63, 94, 0.55)'
            : '#cbd5e1';
        const accentColor =
          templateStyle === 'royal'
            ? '#fcd34d'
            : templateStyle === 'festive'
            ? '#c4b5fd'
            : templateStyle === 'emerald'
            ? '#6ee7b7'
            : templateStyle === 'rose'
            ? '#fda4af'
            : '#4f46e5';
        const primaryTextColor =
          templateStyle === 'royal'
            ? '#fef3c7'
            : templateStyle === 'festive'
            ? '#e0e7ff'
            : templateStyle === 'emerald'
            ? '#ecfdf5'
            : templateStyle === 'rose'
            ? '#fff1f2'
            : '#0f172a';
        const mutedTextColor =
          templateStyle === 'royal'
            ? 'rgba(254, 243, 199, 0.8)'
            : templateStyle === 'festive'
            ? 'rgba(224, 231, 255, 0.82)'
            : templateStyle === 'emerald'
            ? 'rgba(236, 253, 245, 0.82)'
            : templateStyle === 'rose'
            ? 'rgba(255, 241, 242, 0.82)'
            : '#475569';
        const dividerColor = isMinimal ? '#e2e8f0' : 'rgba(255, 255, 255, 0.2)';

        // 2. Outer & Inner Ornamental Card Frames
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 8;
        ctx.strokeRect(56, 56, width - 112, height - 112);

        ctx.lineWidth = 2;
        ctx.strokeRect(76, 76, width - 152, height - 152);

        const centerX = width / 2;
        const maxTextWidth = width - 280;

        // 3. Top Ornamental Emblem Circle
        const emblemY = 210;
        ctx.beginPath();
        ctx.arc(centerX, emblemY, 44, 0, Math.PI * 2);
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = accentColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '42px Georgia, "Times New Roman", serif';
        ctx.fillText(emblem, centerX, emblemY + 2);

        // 4. Headline & Hosts
        let cursorY = 310;
        ctx.fillStyle = primaryTextColor;
        ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
        const headlineLines = wrapCanvasParagraphs(
          ctx,
          (invitationData.headline || '').toUpperCase(),
          maxTextWidth
        );
        for (const line of headlineLines) {
          ctx.fillText(line, centerX, cursorY);
          cursorY += 38;
        }

        cursorY += 10;
        ctx.fillStyle = mutedTextColor;
        ctx.font = '600 22px system-ui, -apple-system, sans-serif';
        const hostLines = wrapCanvasParagraphs(
          ctx,
          (invitationData.hosts || '').toUpperCase(),
          maxTextWidth
        );
        for (const line of hostLines) {
          ctx.fillText(line, centerX, cursorY);
          cursorY += 34;
        }

        // 5. Event Title
        cursorY += 70;
        ctx.fillStyle = primaryTextColor;
        ctx.font = 'bold 56px Georgia, "Times New Roman", serif';
        const titleLines = wrapCanvasParagraphs(ctx, eventName, maxTextWidth);
        for (const line of titleLines) {
          ctx.fillText(line, centerX, cursorY);
          cursorY += 70;
        }

        // 6. Main Invitation Body
        cursorY += 35;
        ctx.fillStyle = primaryTextColor;
        ctx.font = '30px system-ui, -apple-system, sans-serif';
        const bodyLines = wrapCanvasParagraphs(ctx, invitationData.mainBody || '', maxTextWidth);
        for (const line of bodyLines) {
          if (!line) {
            cursorY += 26;
          } else {
            ctx.fillText(line, centerX, cursorY);
            cursorY += 48;
          }
        }

        // 7. Divider & Itinerary Highlight + RSVP Details
        cursorY = Math.max(cursorY + 50, 1180);
        ctx.strokeStyle = dividerColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX - 340, cursorY);
        ctx.lineTo(centerX + 340, cursorY);
        ctx.stroke();

        cursorY += 55;
        ctx.fillStyle = accentColor;
        ctx.font = 'bold 27px system-ui, -apple-system, sans-serif';
        const itineraryLines = wrapCanvasParagraphs(
          ctx,
          invitationData.itineraryHighlight || '',
          maxTextWidth
        );
        for (const line of itineraryLines) {
          ctx.fillText(line, centerX, cursorY);
          cursorY += 40;
        }

        cursorY += 14;
        ctx.fillStyle = mutedTextColor;
        ctx.font = '23px system-ui, -apple-system, sans-serif';
        const rsvpLines = wrapCanvasParagraphs(
          ctx,
          invitationData.rsvpDetails || '',
          maxTextWidth
        );
        for (const line of rsvpLines) {
          ctx.fillText(line, centerX, cursorY);
          cursorY += 36;
        }

        // 8. Bottom Blessing Quote
        const footerDividerY = height - 220;
        ctx.strokeStyle = dividerColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(centerX - 380, footerDividerY);
        ctx.lineTo(centerX + 380, footerDividerY);
        ctx.stroke();

        let quoteY = footerDividerY + 52;
        ctx.fillStyle = mutedTextColor;
        ctx.font = 'italic 23px Georgia, "Times New Roman", serif';
        const quoteLines = wrapCanvasParagraphs(
          ctx,
          `"${invitationData.quote || ''}"`,
          maxTextWidth
        );
        for (const line of quoteLines) {
          ctx.fillText(line, centerX, quoteY);
          quoteY += 34;
        }

        const imgData = canvas.toDataURL('image/png', 1.0);
        doc.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
      }
    }

    // Vector fallback if Canvas 2D is unavailable (e.g., headless Node environment)
    if (!renderedViaCanvas) {
      if (templateStyle === 'royal') {
        doc.setFillColor(69, 26, 3);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        doc.setDrawColor(217, 119, 6);
        doc.setTextColor(254, 243, 199);
      } else if (templateStyle === 'festive') {
        doc.setFillColor(46, 16, 101);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        doc.setDrawColor(139, 92, 246);
        doc.setTextColor(224, 231, 255);
      } else {
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.setTextColor(15, 23, 42);
      }

      doc.setLineWidth(1.2);
      doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(sanitizePdfText(invitationData.headline), pageWidth / 2, 42, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(sanitizePdfText(invitationData.hosts), pageWidth / 2, 52, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text(sanitizePdfText(eventName), pageWidth / 2, 80, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      const bodyLines = doc.splitTextToSize(sanitizePdfText(invitationData.mainBody), pageWidth - 50);
      doc.text(bodyLines, pageWidth / 2, 105, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(sanitizePdfText(invitationData.itineraryHighlight), pageWidth / 2, 185, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(sanitizePdfText(invitationData.rsvpDetails), pageWidth / 2, 196, { align: 'center' });

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.text(sanitizePdfText(`"${invitationData.quote}"`), pageWidth / 2, 255, { align: 'center' });
    }

    const safeFileName = `${eventName.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '') || 'Event'}_Invitation_Card.pdf`;
    triggerPdfBlobDownload(doc, safeFileName);
    return true;
  } catch (err) {
    console.error('Invitation PDF export error:', err);
    return false;
  }
}

