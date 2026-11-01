import React, { useState, useMemo } from 'react';
import {
  PlusCircle,
  Search,
  Trash2,
  Edit2,
  X,
} from 'lucide-react';
import { useEvents } from '../context/EventContext';
import { EventGuest, RSVPStatus, GuestGroup } from '../types';
import { computeGuestMetrics } from '../utils/data-management';

export const GuestManagementView: React.FC = () => {
  const {
    activeEvent,
    guests,
    addGuest,
    updateGuest,
    deleteGuest,
  } = useEvents();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRsvp, setFilterRsvp] = useState<string>('All');
  const [filterGroup, setFilterGroup] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<EventGuest | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [rsvpStatus, setRsvpStatus] = useState<RSVPStatus>('Pending');
  const [group, setGroup] = useState<GuestGroup>('General');
  const [dietaryRequirements, setDietaryRequirements] = useState('');
  const [attendanceCount, setAttendanceCount] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  // RSVP Metrics (computed via pure utility before early return)
  const metrics = useMemo(() => computeGuestMetrics(guests), [guests]);

  // Filtered List
  const filteredGuests = useMemo(() => {
    return guests.filter((g) => {
      const matchesSearch =
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.contactInfo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.dietaryRequirements || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRsvp = filterRsvp === 'All' || g.rsvpStatus === filterRsvp;
      const matchesGroup = filterGroup === 'All' || g.group === filterGroup;
      return matchesSearch && matchesRsvp && matchesGroup;
    });
  }, [guests, searchQuery, filterRsvp, filterGroup]);

  if (!activeEvent) {
    return (
      <div className="p-8 text-center text-slate-500">
        No active event selected.
      </div>
    );
  }

  const handleOpenAdd = () => {
    setEditingGuest(null);
    setName('');
    setContactInfo('');
    setRsvpStatus('Pending');
    setGroup('Family');
    setDietaryRequirements('');
    setAttendanceCount(1);
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (g: EventGuest) => {
    setEditingGuest(g);
    setName(g.name);
    setContactInfo(g.contactInfo || '');
    setRsvpStatus(g.rsvpStatus);
    setGroup(g.group);
    setDietaryRequirements(g.dietaryRequirements || '');
    setAttendanceCount(g.attendanceCount);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Guest name is required.');
      return;
    }

    const payload = {
      name: name.trim(),
      contactInfo: contactInfo.trim() || undefined,
      rsvpStatus,
      group,
      dietaryRequirements: dietaryRequirements.trim() || undefined,
      attendanceCount: Number(attendanceCount) || 1,
    };

    if (editingGuest) {
      updateGuest(editingGuest.id, payload);
    } else {
      addGuest(payload);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Guest List & RSVP Manager
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Organize attendee circles, track headcount for caterers, and manage dietary preferences.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Guest</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total In Invitations
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {metrics.totalGuests}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Invited households/contacts</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Confirmed Attending
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {metrics.attendingHeads} Heads
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Guaranteed plate count</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Pending RSVPs
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {metrics.pendingHeads} Heads
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Awaiting confirmation</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Special Dietary Needs
          </div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {metrics.specialDietCount}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Jain, Vegan, Allergies</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            id="guest-search-input"
            aria-label="Search guests by name, phone, or dietary notes"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guests by name, phone, or dietary notes..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            id="guest-filter-rsvp"
            aria-label="Filter guests by RSVP status"
            value={filterRsvp}
            onChange={(e) => setFilterRsvp(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            <option value="All">All RSVP Statuses</option>
            <option value="Attending">Attending</option>
            <option value="Pending">Pending</option>
            <option value="Declined">Declined</option>
            <option value="Tentative">Tentative</option>
          </select>

          <select
            id="guest-filter-group"
            aria-label="Filter guests by circle or group"
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            <option value="All">All Circles</option>
            <option value="Family">Family</option>
            <option value="Friends">Friends</option>
            <option value="Colleagues">Colleagues</option>
            <option value="VIP">VIP</option>
            <option value="General">General</option>
          </select>
        </div>
      </div>

      {/* Guest Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        {filteredGuests.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No guests found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4 rounded-l-lg">Guest / Household Name</th>
                  <th className="py-2.5 px-4">Circle / Group</th>
                  <th className="py-2.5 px-4">Contact</th>
                  <th className="py-2.5 px-4">RSVP Status</th>
                  <th className="py-2.5 px-4">Heads</th>
                  <th className="py-2.5 px-4">Dietary Notes</th>
                  <th className="py-2.5 px-4 text-right rounded-r-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredGuests.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {g.name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                        {g.group}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{g.contactInfo || '—'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          g.rsvpStatus === 'Attending'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : g.rsvpStatus === 'Declined'
                            ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {g.rsvpStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {g.attendanceCount} {g.attendanceCount === 1 ? 'person' : 'people'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                      {g.dietaryRequirements ? (
                        <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                          {g.dietaryRequirements}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEdit(g)}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 mr-1"
                        aria-label={`Edit guest ${g.name}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteGuest(g.id)}
                        className="p-1 rounded text-slate-400 hover:text-red-600"
                        aria-label={`Delete guest ${g.name}`}
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

      {/* Add / Edit Guest Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={editingGuest ? 'Edit Guest' : 'Add New Guest'}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingGuest ? 'Edit Guest' : 'Add New Guest'}
              </h3>
              <button
                type="button"
                aria-label="Close guest modal"
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
                <label htmlFor="guest-name-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Guest / Household Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="guest-name-input"
                  aria-label="Guest or Household Name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh & Sunita Gupta"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="guest-group-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Circle / Group
                  </label>
                  <select
                    id="guest-group-select"
                    aria-label="Guest Circle or Group"
                    value={group}
                    onChange={(e) => setGroup(e.target.value as GuestGroup)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Family">Family</option>
                    <option value="Friends">Friends</option>
                    <option value="Colleagues">Colleagues</option>
                    <option value="VIP">VIP</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="guest-rsvp-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    RSVP Status
                  </label>
                  <select
                    id="guest-rsvp-select"
                    aria-label="Guest RSVP Status"
                    value={rsvpStatus}
                    onChange={(e) => setRsvpStatus(e.target.value as RSVPStatus)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Attending">Attending</option>
                    <option value="Pending">Pending</option>
                    <option value="Declined">Declined</option>
                    <option value="Tentative">Tentative</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="guest-contact-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contact (Phone or Email)
                  </label>
                  <input
                    id="guest-contact-input"
                    aria-label="Guest Contact Info"
                    type="text"
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                    placeholder="+91 98110 12345"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="guest-heads-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Attending Heads
                  </label>
                  <input
                    id="guest-heads-input"
                    aria-label="Attending Heads"
                    type="number"
                    min={1}
                    value={attendanceCount}
                    onChange={(e) => setAttendanceCount(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="guest-dietary-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Dietary Requirements (Optional)
                </label>
                <input
                  id="guest-dietary-input"
                  aria-label="Dietary Requirements"
                  type="text"
                  value={dietaryRequirements}
                  onChange={(e) => setDietaryRequirements(e.target.value)}
                  placeholder="e.g. Pure Vegetarian / Jain meal, Nut allergy"
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
                  Save Guest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
