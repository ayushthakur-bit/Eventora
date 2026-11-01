import React, { useState, useMemo } from 'react';
import {
  Wallet,
  PlusCircle,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Trash2,
  Edit2,
  X,
  PieChart as PieChartIcon,
  BarChart2,
  Lightbulb,
} from 'lucide-react';
import { useEvents } from '../context/EventContext';
import {
  formatCurrency,
  calculateRemainingBudget,
  calculateCategoryVariance,
  calculateBudgetUtilization,
} from '../utils/budgetCalculations';
import { EventExpense, PaymentStatus } from '../types';

export const BudgetManagementView: React.FC = () => {
  const { activeEvent, expenses, addExpense, updateExpense, deleteExpense } = useEvents();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<EventExpense | null>(null);

  // Form Fields
  const [category, setCategory] = useState('Venue');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [vendorName, setVendorName] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Advance Paid');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!activeEvent) {
    return (
      <div className="p-8 text-center text-slate-500">
        No active event selected.
      </div>
    );
  }

  // Core Math
  const totalPlanned = activeEvent.totalBudget;
  const totalSpent = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
  const remainingBudget = calculateRemainingBudget(totalPlanned, totalSpent);
  const utilization = calculateBudgetUtilization(totalSpent, totalPlanned);
  const isOverrun = totalSpent > totalPlanned;

  // Categories from plan or defaults
  const categories = useMemo(() => {
    if (activeEvent.plan?.budgetBreakdown) {
      return activeEvent.plan.budgetBreakdown.map((b) => b.category);
    }
    return [
      'Venue',
      'Food and catering',
      'Decoration',
      'Photography and videography',
      'Entertainment',
      'Invitations and stationery',
      'Transportation',
      'Emergency contingency',
    ];
  }, [activeEvent]);

  // Category-wise Breakdown Calculations
  const categoryStats = useMemo(() => {
    return categories.map((cat) => {
      const plannedItem = activeEvent.plan?.budgetBreakdown.find(
        (b) => b.category.toLowerCase() === cat.toLowerCase()
      );
      const plannedAmount = plannedItem ? plannedItem.amount : 0;
      const actualAmount = expenses
        .filter((e) => e.category.toLowerCase() === cat.toLowerCase())
        .reduce((sum, e) => sum + e.amount, 0);
      const variance = calculateCategoryVariance(actualAmount, plannedAmount);
      const pctUtilized = plannedAmount > 0 ? Math.round((actualAmount / plannedAmount) * 100) : 0;

      return {
        category: cat,
        plannedAmount,
        actualAmount,
        variance,
        pctUtilized,
        reason: plannedItem?.reason,
      };
    });
  }, [categories, activeEvent, expenses]);

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setCategory(categories[0] || 'Venue');
    setAmount(0);
    setDate(new Date().toISOString().split('T')[0]);
    setVendorName('');
    setPaymentStatus('Advance Paid');
    setNotes('');
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (exp: EventExpense) => {
    setEditingExpense(exp);
    setCategory(exp.category);
    setAmount(exp.amount);
    setDate(exp.date);
    setVendorName(exp.vendorName);
    setPaymentStatus(exp.paymentStatus);
    setNotes(exp.notes || '');
    setError(null);
    setIsModalOpen(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }
    if (!vendorName.trim()) {
      setError('Please provide the vendor or recipient name.');
      return;
    }

    if (editingExpense) {
      updateExpense(editingExpense.id, {
        category,
        amount: Number(amount),
        date,
        vendorName: vendorName.trim(),
        paymentStatus,
        notes: notes.trim(),
      });
    } else {
      addExpense({
        category,
        amount: Number(amount),
        date,
        vendorName: vendorName.trim(),
        paymentStatus,
        notes: notes.trim(),
      });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Planned Budget
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {formatCurrency(totalPlanned, activeEvent.currency)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Allocated baseline</div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Actual Spending
          </div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {formatCurrency(totalSpent, activeEvent.currency)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Across {expenses.length} logged expense items
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Remaining Budget
          </div>
          <div
            className={`text-2xl font-bold mt-1 ${
              remainingBudget < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {formatCurrency(remainingBudget, activeEvent.currency)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {remainingBudget < 0 ? 'Over budget!' : 'Available for remaining tasks'}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Budget Utilization
          </div>
          <div
            className={`text-2xl font-bold mt-1 ${
              utilization > 100 ? 'text-red-500' : 'text-slate-900 dark:text-white'
            }`}
          >
            {utilization}%
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {totalSpent <= totalPlanned ? 'Within target safety margin' : 'Action required'}
          </div>
        </div>
      </div>

      {/* Budget Overrun Warning Banner */}
      {isOverrun && (
        <div className="p-5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-red-900 dark:text-red-200">
                Budget Deficit Warning ({formatCurrency(Math.abs(remainingBudget), activeEvent.currency)} Overrun)
              </h4>
              <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                Actual expenses currently exceed your planned budget. We recommend streamlining stationery, favors, or running a What-If scenario.
              </p>
            </div>
          </div>
          <button
            onClick={() => {}}
            className="self-start sm:self-center px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm shrink-0"
          >
            Auto-Adjust Plan
          </button>
        </div>
      )}

      {/* Action Header & Log Expense Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Category Breakdown & Variance Audit
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Compare planned allocations against actual vendor invoices.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm flex items-center gap-2 self-start sm:self-center transition-all hover:scale-105 active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Log New Expense</span>
        </button>
      </div>

      {/* Category Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categoryStats.map((item, idx) => (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {item.category}
                </h4>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    item.variance > 0
                      ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-300'
                      : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}
                >
                  {item.variance > 0 ? `+${formatCurrency(item.variance, activeEvent.currency)} Over` : 'Within Budget'}
                </span>
              </div>

              <div className="mt-2 flex items-baseline justify-between text-xs">
                <div>
                  <span className="text-slate-400">Spent: </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatCurrency(item.actualAmount, activeEvent.currency)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Planned: </span>
                  <span className="text-slate-600 dark:text-slate-300">
                    {formatCurrency(item.plannedAmount, activeEvent.currency)}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    item.pctUtilized > 100
                      ? 'bg-red-500'
                      : item.pctUtilized > 80
                      ? 'bg-amber-500'
                      : 'bg-indigo-600'
                  }`}
                  style={{ width: `${Math.min(item.pctUtilized, 100)}%` }}
                />
              </div>
            </div>

            <div className="mt-3 text-[11px] text-slate-400">
              {item.pctUtilized}% utilized of category budget
            </div>
          </div>
        ))}
      </div>

      {/* Expense History Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Expense History & Invoices
            </h3>
            <p className="text-xs text-slate-500">
              Individual payments and advances logged for this celebration.
            </p>
          </div>
        </div>

        {expenses.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No expenses logged yet. Click "Log New Expense" to record a payment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4 rounded-l-lg">Date</th>
                  <th className="py-2.5 px-4">Vendor / Payee</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Amount</th>
                  <th className="py-2.5 px-4">Payment Status</th>
                  <th className="py-2.5 px-4">Notes</th>
                  <th className="py-2.5 px-4 text-right rounded-r-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{exp.date}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {exp.vendorName}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {formatCurrency(exp.amount, activeEvent.currency)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          exp.paymentStatus === 'Paid'
                            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : exp.paymentStatus === 'Advance Paid'
                            ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                            : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {exp.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                      {exp.notes || '—'}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEdit(exp)}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 mr-1"
                        aria-label="Edit expense"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteExpense(exp.id)}
                        className="p-1 rounded text-slate-400 hover:text-red-600"
                        aria-label="Delete expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingExpense ? 'Edit Expense' : 'Log New Expense'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-2.5 rounded-lg bg-red-50 text-red-600 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Budget Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vendor or Payee Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="e.g. Royal Caterers or City Banquet"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount ({activeEvent.currency}) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Status
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Advance Paid">Advance Paid</option>
                  <option value="Paid">Fully Paid</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. 1st installment cheque #4982"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
