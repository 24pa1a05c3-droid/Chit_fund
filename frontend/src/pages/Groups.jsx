import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  PlusCircle,
  Search,
  Filter,
  Calendar,
  Users,
  Coins,
  TrendingUp,
  Clock,
  ArrowRight,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');

  // Create Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    total_members: 10,
    monthly_contribution: 5000,
    duration_months: 10,
    start_date: new Date().toISOString().split('T')[0],
    collection_day: 5,
    status: 'Active'
  });

  const { showToast } = useToast();

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'All') params.status = statusFilter;
      if (search) params.search = search;

      const res = await api.get('/groups', { params });
      if (res.data.success) {
        setGroups(res.data.data);
      }
    } catch (error) {
      console.error('Fetch groups error:', error);
      showToast('Failed to load savings groups.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchGroups();
    }, 250);
    return () => clearTimeout(timer);
  }, [statusFilter, search]);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.total_members || !formData.monthly_contribution || !formData.duration_months || !formData.start_date) {
      showToast('Please fill all required group details.', 'error');
      return;
    }

    try {
      setActionLoading(true);
      const res = await api.post('/groups', formData);
      if (res.data.success) {
        showToast('Savings group created successfully!', 'success');
        setIsCreateModalOpen(false);
        fetchGroups();
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to create group.';
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const calculatedMonthlyPool = Number(formData.total_members || 0) * Number(formData.monthly_contribution || 0);
  const calculatedTotalVolume = calculatedMonthlyPool * Number(formData.duration_months || 0);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Savings Group (Chit Fund) Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize savings circles, define contribution rules, track pools and collection dates
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all hover:scale-102"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create Savings Group</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search groups by name or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500">Filter:</span>
          {['All', 'Active', 'Completed'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === s
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Groups Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-64 bg-white rounded-3xl border border-slate-200 p-6 animate-pulse"></div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Savings Groups Found</h3>
          <p className="text-xs text-slate-500 mt-1">
            Get started by creating your first Chit Fund or Savings Circle.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700"
          >
            Create New Group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((g) => {
            const totalTarget = g.total_members * g.monthly_contribution * g.duration_months;
            const collectionPct = totalTarget > 0 ? Math.min(100, Math.round((g.total_collected / totalTarget) * 100)) : 0;
            const enrollmentPct = Math.round((g.enrolled_count / g.total_members) * 100);

            return (
              <div
                key={g.id}
                className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-blue-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        g.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {g.status}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      ID: #{g.id}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 leading-snug">
                    <Link to={`/groups/${g.id}`} className="hover:text-blue-600 transition-colors">
                      {g.name}
                    </Link>
                  </h3>
                  {g.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{g.description}</p>
                  )}

                  {/* Financial Highlights */}
                  <div className="grid grid-cols-2 gap-3 my-4 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-semibold">Monthly Dues</span>
                      <p className="font-bold text-slate-900 mt-0.5">
                        ₹ {Number(g.monthly_contribution).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-semibold">Monthly Pool</span>
                      <p className="font-bold text-blue-700 mt-0.5">
                        ₹ {Number(g.total_pool_per_month).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-semibold">Duration</span>
                      <p className="font-medium text-slate-800 mt-0.5">{g.duration_months} Months</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-semibold">Collection Day</span>
                      <p className="font-medium text-slate-800 mt-0.5">{g.collection_day}th of month</p>
                    </div>
                  </div>

                  {/* Enrollment & Collection Progress */}
                  <div className="space-y-3 text-xs mb-4">
                    <div>
                      <div className="flex justify-between text-slate-600 mb-1">
                        <span className="flex items-center gap-1 font-medium">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          Enrolled Members
                        </span>
                        <span className="font-bold text-slate-800">
                          {g.enrolled_count} / {g.total_members}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-1.5 rounded-full"
                          style={{ width: `${enrollmentPct}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-600 mb-1">
                        <span className="flex items-center gap-1 font-medium">
                          <Coins className="w-3.5 h-3.5 text-slate-400" />
                          Collected Funds
                        </span>
                        <span className="font-bold text-blue-700">{collectionPct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full"
                          style={{ width: `${collectionPct}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer with Balance & Action */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                      Remaining Pool
                    </span>
                    <span className="text-sm font-black text-slate-900">
                      ₹ {Number(g.remaining_balance || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <Link
                    to={`/groups/${g.id}`}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-blue-600 text-white transition-colors"
                  >
                    <span>Manage Group</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Group Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between p-6 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Create New Savings Group</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Group Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Gold Chit Fund"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Group Description / Objectives
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe purpose, eligible members, or auction terms..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Members (Seats) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="100"
                    required
                    value={formData.total_members}
                    onChange={(e) => setFormData({ ...formData, total_members: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monthly Contribution (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="100"
                    min="100"
                    required
                    value={formData.monthly_contribution}
                    onChange={(e) => setFormData({ ...formData, monthly_contribution: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Duration (Months) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    required
                    value={formData.duration_months}
                    onChange={(e) => setFormData({ ...formData, duration_months: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monthly Collection Day <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={formData.collection_day}
                    onChange={(e) => setFormData({ ...formData, collection_day: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Upcoming">Upcoming</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Calculated Summary Preview Box */}
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900 space-y-1">
                <div className="flex justify-between">
                  <span className="font-medium text-blue-700">Estimated Monthly Pool (Pot):</span>
                  <span className="font-bold">₹ {calculatedMonthlyPool.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-blue-700">Total Group Financial Volume:</span>
                  <span className="font-bold">₹ {calculatedTotalVolume.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {actionLoading ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
