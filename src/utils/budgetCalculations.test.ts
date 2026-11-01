import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRemainingBudget,
  calculateCategoryVariance,
  calculateBudgetUtilization,
  normalizeAllocationsToTotal,
  formatCurrency,
} from './budgetCalculations';

test('calculateRemainingBudget correctly subtracts expenses', () => {
  assert.equal(calculateRemainingBudget(500000, 200000), 300000);
  assert.equal(calculateRemainingBudget(10000, 10000), 0);
  assert.equal(calculateRemainingBudget(50000, 60000), -10000); // deficit
});

test('calculateRemainingBudget safely handles zero and negative budgets', () => {
  assert.equal(calculateRemainingBudget(0, 500), 0);
  assert.equal(calculateRemainingBudget(-100, 50), 0);
  assert.equal(calculateRemainingBudget(NaN, 50), 0);
});

test('calculateCategoryVariance reports overruns and savings', () => {
  // Overspent: actual (150,000) > planned (100,000) = +50,000
  assert.equal(calculateCategoryVariance(150000, 100000), 50000);
  // Underspent: actual (80,000) < planned (100,000) = -20,000
  assert.equal(calculateCategoryVariance(80000, 100000), -20000);
  // Equal
  assert.equal(calculateCategoryVariance(50000, 50000), 0);
});

test('calculateBudgetUtilization calculates percentage safely', () => {
  assert.equal(calculateBudgetUtilization(250000, 500000), 50);
  assert.equal(calculateBudgetUtilization(500000, 500000), 100);
  assert.equal(calculateBudgetUtilization(600000, 500000), 120);
  // Division by zero safety
  assert.equal(calculateBudgetUtilization(1000, 0), 0);
  assert.equal(calculateBudgetUtilization(0, 50000), 0);
});

test('normalizeAllocationsToTotal balances sum precisely to total budget', () => {
  const sample = [
    { category: 'Venue', amount: 200000, percentage: 40 },
    { category: 'Catering', amount: 150000, percentage: 30 },
    { category: 'Decor', amount: 80000, percentage: 16 },
    { category: 'Contingency', amount: 40000, percentage: 8 },
  ]; // Sum is 470,000, target is 500,000
  const normalized = normalizeAllocationsToTotal(sample, 500000);
  const total = normalized.reduce((acc, curr) => acc + curr.amount, 0);
  assert.equal(total, 500000);
});

test('formatCurrency handles INR and other currencies properly', () => {
  const inr = formatCurrency(500000, 'INR');
  assert.ok(inr.includes('₹'));
  assert.ok(inr.includes('5,00,000') || inr.includes('500,000'));

  const usd = formatCurrency(12500, 'USD');
  assert.ok(usd.includes('$'));
  assert.ok(usd.includes('12,500'));
});
