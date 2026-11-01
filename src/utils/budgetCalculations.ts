/**
 * Core mathematical and validation utilities for event budgeting and financial tracking.
 * Adheres strictly to requirements:
 * - Remaining budget = Total budget - Total actual expenses
 * - Category variance = Actual spending - Planned allocation
 * - Budget utilization = (Actual expenses / Total budget) * 100
 * Handles zero budgets, float precision, and currency formatting.
 */

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'AED ',
};

export interface BudgetItemAllocation {
  category: string;
  amount: number;
  percentage?: number;
}

/**
 * Calculates remaining available budget.
 * Returns 0 if totalBudget is 0 or negative, safe against NaN.
 */
export function calculateRemainingBudget(totalBudget: number, totalExpenses: number): number {
  if (isNaN(totalBudget) || totalBudget <= 0) return 0;
  if (isNaN(totalExpenses) || totalExpenses < 0) totalExpenses = 0;
  return Math.round((totalBudget - totalExpenses) * 100) / 100;
}

/**
 * Calculates category variance:
 * Positive value means overspent (Actual > Planned).
 * Negative value means under budget / saved.
 */
export function calculateCategoryVariance(actualSpending: number, plannedAllocation: number): number {
  const actual = isNaN(actualSpending) ? 0 : actualSpending;
  const planned = isNaN(plannedAllocation) ? 0 : plannedAllocation;
  return Math.round((actual - planned) * 100) / 100;
}

/**
 * Calculates budget utilization as a percentage.
 * Safely caps or handles division by zero.
 */
export function calculateBudgetUtilization(actualExpenses: number, totalBudget: number): number {
  if (isNaN(totalBudget) || totalBudget <= 0) return 0;
  if (isNaN(actualExpenses) || actualExpenses <= 0) return 0;
  const ratio = (actualExpenses / totalBudget) * 100;
  return Math.round(ratio * 10) / 10;
}

/**
 * Normalizes allocation amounts so their sum matches totalBudget exactly (handles rounding residue on contingency).
 */
export function normalizeAllocationsToTotal(
  allocations: { category: string; amount: number; percentage: number; reason?: string; costSavingTip?: string }[],
  totalBudget: number
) {
  if (!allocations.length || totalBudget <= 0) return allocations;

  // Recalculate amounts based on percentages if they don't add up
  const currentSum = allocations.reduce((acc, item) => acc + (item.amount || 0), 0);
  if (Math.abs(currentSum - totalBudget) < 1) {
    return allocations;
  }

  const factor = totalBudget / (currentSum || 1);
  let runningSum = 0;

  const adjusted = allocations.map((item, index) => {
    if (index === allocations.length - 1) {
      // Last item absorbs any tiny penny rounding error
      const remaining = Math.max(0, Math.round(totalBudget - runningSum));
      const percentage = Math.round((remaining / totalBudget) * 1000) / 10;
      return { ...item, amount: remaining, percentage };
    }
    const newAmount = Math.round(item.amount * factor);
    runningSum += newAmount;
    const percentage = Math.round((newAmount / totalBudget) * 1000) / 10;
    return { ...item, amount: newAmount, percentage };
  });

  return adjusted;
}

/**
 * Formats a currency amount nicely with commas according to locale.
 * Default locale is Indian (en-IN) for INR, and en-US for USD etc.
 */
export function formatCurrency(amount: number, currency: CurrencyCode = 'INR'): string {
  if (isNaN(amount)) amount = 0;
  const symbol = CURRENCY_SYMBOLS[currency] || '₹';
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';

  const formattedNum = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(Math.round(amount));

  return `${symbol}${formattedNum}`;
}
