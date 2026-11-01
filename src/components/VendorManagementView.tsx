import React, { useState, useMemo } from 'react';
import {
  PlusCircle,
  Phone,
  Mail,
  Star,
  Trash2,
  Edit2,
  X,
} from 'lucide-react';
import { useEvents } from '../context/EventContext';
import { EventVendor, VendorStatus } from '../types';
import { formatCurrency } from '../utils/budgetCalculations';

export const VendorManagementView: React.FC = () => {
  const { activeEvent, vendors, addVendor, updateVendor, deleteVendor } = useEvents();

  const [activeTab, setActiveTab] = useState<'myVendors' | 'comparison' | 'discovery'>('myVendors');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<EventVendor | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('Venue');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [quotedAmount, setQuotedAmount] = useState<number>(0);
  const [advancePayment, setAdvancePayment] = useState<number>(0);
  const [bookingStatus, setBookingStatus] = useState<VendorStatus>('Evaluating');
  const [contractNotes, setContractNotes] = useState('');
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [error, setError] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    vendors.forEach((v) => set.add(v.category));
    return ['All', ...Array.from(set)];
  }, [vendors]);

  const filteredVendors = useMemo(() => {
    if (selectedCategory === 'All') return vendors;
    return vendors.filter((v) => v.category === selectedCategory);
  }, [vendors, selectedCategory]);

  if (!activeEvent) {
    return (
      <div className="p-8 text-center text-slate-500">
        No active event selected.
      </div>
    );
  }

  const handleOpenAdd = () => {
    setEditingVendor(null);
    setBusinessName('');
    setCategory('Venue');
    setPhone('');
    setEmail('');
    setAddress('');
    setQuotedAmount(0);
    setAdvancePayment(0);
    setBookingStatus('Evaluating');
    setContractNotes('');
    setPaymentDueDate(activeEvent.startDate);
    setRating(5);
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v: EventVendor) => {
    setEditingVendor(v);
    setBusinessName(v.businessName);
    setCategory(v.category);
    setPhone(v.contactInfo.phone || '');
    setEmail(v.contactInfo.email || '');
    setAddress(v.contactInfo.address || '');
    setQuotedAmount(v.quotedAmount);
    setAdvancePayment(v.advancePayment);
    setBookingStatus(v.bookingStatus);
    setContractNotes(v.contractNotes || '');
    setPaymentDueDate(v.paymentDueDate || '');
    setRating(v.rating || 5);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      setError('Business name is required.');
      return;
    }

    const remainingPayment = Math.max(0, quotedAmount - advancePayment);

    const payload = {
      businessName: businessName.trim(),
      category,
      contactInfo: {
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
      },
      quotedAmount: Number(quotedAmount),
      advancePayment: Number(advancePayment),
      remainingPayment,
      bookingStatus,
      contractNotes: contractNotes.trim() || undefined,
      paymentDueDate: paymentDueDate || undefined,
      rating: Number(rating),
    };

    if (editingVendor) {
      updateVendor(editingVendor.id, payload);
    } else {
      addVendor(payload);
    }

    setIsModalOpen(false);
  };

  // Demo discovery providers
  const demoMarketplace = [
    {
      name: 'Royal Heritage Palace & Lawns',
      category: 'Venue',
      priceRange: '₹4,50,000 - ₹6,00,000',
      rating: 4.9,
      tags: ['Verified Demo', 'Heritage Arch', 'Power Backup'],
    },
    {
      name: 'Spice Symphony Gourmet Catering',
      category: 'Food and catering',
      priceRange: '₹1,200 - ₹1,800 / plate',
      rating: 4.8,
      tags: ['Verified Demo', 'Live Counters', 'Jain Specialty'],
    },
    {
      name: 'Lumiere Cinematic Wedding Stories',
      category: 'Photography and videography',
      priceRange: '₹1,20,000 - ₹1,75,000',
      rating: 5.0,
      tags: ['Verified Demo', 'Drone Certified', '7-Day Teaser'],
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Vendor Roster & Quotations
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage signed contracts, advances paid, outstanding balances, and quote comparisons.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('myVendors')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'myVendors' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-500'
              }`}
            >
              My Vendors ({vendors.length})
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'comparison' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-500'
              }`}
            >
              Quote Comparison
            </button>
            <button
              onClick={() => setActiveTab('discovery')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'discovery' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-500'
              }`}
            >
              Discovery Hub
            </button>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Vendor</span>
          </button>
        </div>
      </div>

      {/* TAB 1: MY VENDORS */}
      {activeTab === 'myVendors' && (
        <div className="space-y-4">
          {/* Category Filter Pills */}
          {categories.length > 2 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-slate-400 font-medium">Filter:</span>
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCategory(c)}
                  className={`px-3 py-1 rounded-lg border transition-all ${
                    selectedCategory === c
                      ? 'bg-indigo-600 border-indigo-600 text-white font-semibold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {filteredVendors.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-xs text-slate-400">
              No vendors found for this category. Click "Add Vendor" to record one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVendors.map((v) => (
                <div
                  key={v.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                          {v.category}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                          {v.businessName}
                        </h3>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          v.bookingStatus === 'Fully Paid'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : v.bookingStatus === 'Advance Paid'
                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {v.bookingStatus}
                      </span>
                    </div>

                    {/* Financial Summary */}
                    <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Quoted:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatCurrency(v.quotedAmount, activeEvent.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Advance Paid:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          {formatCurrency(v.advancePayment, activeEvent.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-slate-400 font-medium">Balance Due:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatCurrency(v.remainingPayment, activeEvent.currency)}
                        </span>
                      </div>
                    </div>

                    {/* Contact & Notes */}
                    <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                      {v.contactInfo.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{v.contactInfo.phone}</span>
                        </div>
                      )}
                      {v.contactInfo.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{v.contactInfo.email}</span>
                        </div>
                      )}
                      {v.contractNotes && (
                        <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-100 dark:border-slate-800">
                          "{v.contractNotes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center text-amber-500">
                      {[...Array(v.rating || 5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                      ))}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(v)}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600"
                        aria-label="Edit vendor"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteVendor(v.id)}
                        className="p-1 rounded text-slate-400 hover:text-red-600"
                        aria-label="Delete vendor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: QUOTE COMPARISON */}
      {activeTab === 'comparison' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Category Quotation Comparison
          </h3>
          <p className="text-xs text-slate-500">
            Compare quotes side by side to make confident procurement decisions.
          </p>

          <div className="overflow-x-auto pt-2">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4 rounded-l-lg">Category</th>
                  <th className="py-2.5 px-4">Vendor Name</th>
                  <th className="py-2.5 px-4">Quoted Amount</th>
                  <th className="py-2.5 px-4">Advance Terms</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 rounded-r-lg">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {vendors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {v.category}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {v.businessName}
                    </td>
                    <td className="py-3 px-4 text-indigo-600 dark:text-indigo-400 font-bold">
                      {formatCurrency(v.quotedAmount, activeEvent.currency)}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {v.advancePayment > 0
                        ? `${formatCurrency(v.advancePayment, activeEvent.currency)} advance paid`
                        : 'No advance released'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {v.bookingStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-amber-500 font-bold">
                      ★ {v.rating || 5}.0
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DISCOVERY HUB */}
      {activeTab === 'discovery' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-800 dark:text-indigo-300">
            <span className="font-bold">Demonstration Showcase:</span> The listings below represent sample verified vendor categories for inspiration. Eventora never manufactures fake reviews or deceptive business contacts.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {demoMarketplace.map((d, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950">
                    {d.category}
                  </span>
                  <span className="text-xs font-bold text-amber-500">★ {d.rating}</span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{d.name}</h4>
                <p className="text-xs text-slate-500">{d.priceRange}</p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {d.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setBusinessName(d.name);
                    setCategory(d.category);
                    setIsModalOpen(true);
                  }}
                  className="w-full py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/40 transition-colors"
                >
                  + Add to My Event Roster
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Vendor Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={editingVendor ? 'Edit Vendor Record' : 'Record New Vendor'}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingVendor ? 'Edit Vendor Record' : 'Record New Vendor'}
              </h3>
              <button
                type="button"
                aria-label="Close vendor modal"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-2.5 rounded-lg bg-red-50 text-red-600 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label htmlFor="vendor-business-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Business / Vendor Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="vendor-business-name"
                  aria-label="Business or Vendor Name"
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Royal Rasoi Caterers"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="vendor-category-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  id="vendor-category-select"
                  aria-label="Vendor Category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Venue">Venue</option>
                  <option value="Food and catering">Food & Catering</option>
                  <option value="Decoration">Decoration & Florals</option>
                  <option value="Photography and videography">Photography & Videography</option>
                  <option value="Entertainment">Entertainment & DJ</option>
                  <option value="Invitations and stationery">Invitations & Keepsakes</option>
                  <option value="Transportation">Transportation & Shuttles</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="vendor-phone-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Contact
                  </label>
                  <input
                    id="vendor-phone-input"
                    aria-label="Vendor Phone Contact"
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98200 12345"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="vendor-email-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Contact
                  </label>
                  <input
                    id="vendor-email-input"
                    aria-label="Vendor Email Contact"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vendor@company.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="vendor-quoted-amount" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Quoted Amount ({activeEvent.currency})
                  </label>
                  <input
                    id="vendor-quoted-amount"
                    aria-label="Vendor Quoted Amount"
                    type="number"
                    min={0}
                    value={quotedAmount}
                    onChange={(e) => setQuotedAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="vendor-advance-payment" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Advance Payment
                  </label>
                  <input
                    id="vendor-advance-payment"
                    aria-label="Vendor Advance Payment"
                    type="number"
                    min={0}
                    value={advancePayment}
                    onChange={(e) => setAdvancePayment(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="vendor-booking-status" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Booking Status
                  </label>
                  <select
                    id="vendor-booking-status"
                    aria-label="Vendor Booking Status"
                    value={bookingStatus}
                    onChange={(e) => setBookingStatus(e.target.value as VendorStatus)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Evaluating">Evaluating</option>
                    <option value="Advance Paid">Advance Paid</option>
                    <option value="Fully Paid">Fully Paid</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="vendor-rating-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Rating (1-5 Stars)
                  </label>
                  <select
                    id="vendor-rating-select"
                    aria-label="Vendor Rating"
                    value={rating}
                    onChange={(e) => setRating(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={5}>★★★★★ (5 Stars)</option>
                    <option value={4}>★★★★☆ (4 Stars)</option>
                    <option value={3}>★★★☆☆ (3 Stars)</option>
                    <option value={2}>★★☆☆☆ (2 Stars)</option>
                    <option value={1}>★☆☆☆☆ (1 Star)</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="vendor-contract-notes" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Contract Deliverables & Notes
                </label>
                <textarea
                  id="vendor-contract-notes"
                  aria-label="Vendor Contract Deliverables and Notes"
                  rows={2}
                  value={contractNotes}
                  onChange={(e) => setContractNotes(e.target.value)}
                  placeholder="Key deliverables, cancellation clauses, or equipment included..."
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
                  Save Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
