import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Banknote,
  Award,
  PlusCircle,
  Search,
  Filter,
  Eye,
  Calendar,
  Layers,
  Users,
  ShieldCheck,
  AlertTriangle,
  X,
  Printer,
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import api from '../services/api';
import PayoutVoucherModal from '../components/PayoutVoucherModal';
import { useToast } from '../context/ToastContext';

export default function Payouts() {
  const [searchParams] = useSearchParams();
  const [payouts, setPayouts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterGroup, setFilterGroup] = useState('All');
  const [search, setSearch] = useState('');
  const [totalDisbursedAmount, setTotalDisbursedAmount] = useState(0);

  // Balance inspector widget
  const [inspectorGroupId, setInspectorGroupId] = useState('');
  const [groupBalanceData, setGroupBalanceData] = useState(null);

  // Record Modal
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    group_id: '',
    member_id: '',
    installment_no: 1,
    amount: '',
    payout_date: new Date().toISOString().split('T')[0],
    payment_method: 'Bank Transfer',
    notes: '',
    manager_confirmed: false
  });

  const { showToast } = useToast();

  const fetchGroups = async () => {
    try {
      const res = await api.get('/groups');
      if (res.data.success) {
        setGroups(res.data.data);
        if (res.data.data.length > 0 && !inspectorGroupId) {
          setInspectorGroupId(String(res.data.data[0].id));
        }
      }
    } catch (error) {
      console.error('Fetch groups error:', error);
    }
  };

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterGroup !== 'All') params.group_id = filterGroup;
      if (search) params.search = search;

      const res = await api.get('/payouts', { params });
      if (res.data.success) {
        setPayouts(res.data.data);
        setTotalDisbursedAmount(res.data.totalDisbursed || 0);
      }
    } catch (error) {
      console.error('Fetch payouts error:', error);
      showToast('Failed to load payout history.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadGroupBalance = async (groupId) => {
    if (!groupId) return;
    try {
      const res = await api.get(`/payouts/group-balance/${groupId}`);
      if (res.data.success) {
        setGroupBalanceData(res.data.data);
      }
    } catch (error) {
      console.error('Load group balance error:', error);
    }
  };

  useEffect(() => {
    fetchGroups();
    const groupParam = searchParams.get('groupId');
    const cycleParam = searchParams.get('cycle');
    if (searchParams.get('new') === '1') {
      setIsRecordModalOpen(true);
      if (groupParam) {
        handleModalGroupChange(groupParam);
        if (cycleParam) {
          setFormData(prev => ({ ...prev, installment_no: cycleParam }));
        }
      }
    }
  }, []);

  useEffect(() => {
    fetchPayouts();
  }, [filterGroup, search]);

  useEffect(() => {
    if (inspectorGroupId) {
      loadGroupBalance(inspectorGroupId);
    }
  }, [inspectorGroupId]);

  const handleModalGroupChange = async (groupId) => {
    setFormData(prev => ({
      ...prev,
      group_id: groupId,
      member_id: '',
      manager_confirmed: false
    }));

    if (!groupId) return;
    await loadGroupBalance(groupId);
  };

  const handleRecordPayout = async (e) => {
    e.preventDefault();

    if (!formData.manager_confirmed) {
      showToast('Manager confirmation checkbox is required to authorize disbursement.', 'error');
      return;
    }

    if (!formData.group_id || !formData.member_id || !formData.installment_no || !formData.amount || !formData.payout_date) {
      showToast('Please fill all mandatory disbursement fields.', 'error');
      return;
    }

    try {
      setActionLoading(true);
      const res = await api.post('/payouts', formData);
      if (res.data.success) {
        showToast('Payout recorded and voucher issued successfully!', 'success');
        setIsRecordModalOpen(false);
        fetchPayouts();
        loadGroupBalance(formData.group_id);
        if (res.data.voucher) {
          setSelectedVoucher(res.data.voucher);
        }
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to record payout.';
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Payout & Disbursement Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Distribute monthly prize pools, verify group liquidity, and issue official vouchers
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({
              group_id: groups.length > 0 ? String(groups[0].id) : '',
              member_id: '',
              installment_no: 1,
              amount: '',
              payout_date: new Date().toISOString().split('T')[0],
              payment_method: 'Bank Transfer',
              notes: '',
              manager_confirmed: false
            });
            if (groups.length > 0) {
              loadGroupBalance(String(groups[0].id));
            }
            setIsRecordModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all hover:scale-102"
        >
          <Award className="w-4 h-4" />
          <span>Record Member Payout</span>
        </button>
      </div>

      {/* Group Balance Inspector Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
              Liquidity & Vault Checker
            </span>
            <h2 className="text-base font-bold text-slate-900">Check Available Group Balance</h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Group:</span>
            <select
              value={inspectorGroupId}
              onChange={(e) => setInspectorGroupId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {groupBalanceData && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
              <span className="text-emerald-700 font-semibold uppercase text-[10px]">Total Collected</span>
              <p className="text-xl font-bold text-emerald-950 mt-1">
                ₹ {Number(groupBalanceData.totalCollected).toLocaleString('en-IN')}
              </p>
              <p className="text-emerald-600 text-[11px] mt-0.5">Sum of all member payments</p>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80">
              <span className="text-rose-700 font-semibold uppercase text-[10px]">Total Disbursed</span>
              <p className="text-xl font-bold text-rose-950 mt-1">
                ₹ {Number(groupBalanceData.totalDisbursed).toLocaleString('en-IN')}
              </p>
              <p className="text-rose-600 text-[11px] mt-0.5">Prior winning payouts</p>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80">
              <span className="text-indigo-700 font-semibold uppercase text-[10px]">Current Available Pool</span>
              <p className="text-xl font-black text-indigo-950 mt-1">
                ₹ {Number(groupBalanceData.remainingBalance).toLocaleString('en-IN')}
              </p>
              <p className="text-indigo-600 text-[11px] mt-0.5">Ready for next payout</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-500 font-semibold uppercase text-[10px]">Target Monthly Pool</span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                ₹ {Number(groupBalanceData.monthlyPoolTarget).toLocaleString('en-IN')}
              </p>
              <p className="text-slate-500 text-[11px] mt-0.5">{groupBalanceData.totalMembers} Members in Circle</p>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search voucher number, member, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500">Group:</span>
          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="All">All Groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Payouts Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Voucher No</th>
                <th className="py-3.5 px-4">Disbursement Date</th>
                <th className="py-3.5 px-4">Recipient Member</th>
                <th className="py-3.5 px-4">Savings Group</th>
                <th className="py-3.5 px-4 text-center">Cycle #</th>
                <th className="py-3.5 px-4">Mode</th>
                <th className="py-3.5 px-4 text-right">Disbursed Amount</th>
                <th className="py-3.5 px-4 text-center">Approved By</th>
                <th className="py-3.5 px-4 text-center">Voucher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading payouts...</span>
                    </div>
                  </td>
                </tr>
              ) : payouts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 italic">
                    No payout vouchers found matching criteria.
                  </td>
                </tr>
              ) : (
                payouts.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-900">
                      {po.voucher_number}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                      {new Date(po.payout_date).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <Link to={`/members/${po.member_id}`} className="hover:text-indigo-600">
                        {po.member_name}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <Link to={`/groups/${po.group_id}`} className="hover:text-indigo-600 font-medium">
                        {po.group_name}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Cycle #{po.installment_no}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                        {po.payment_method}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                      ₹ {Number(po.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-600">
                      <span className="flex items-center justify-center gap-1 text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        {po.approved_by}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setSelectedVoucher(po)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Voucher</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payout Modal with Manager Confirmation Gate */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between p-6 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Record & Disburse Chit Payout</h3>
              </div>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayout} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Savings Group <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.group_id}
                    onChange={(e) => handleModalGroupChange(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                  >
                    <option value="">-- Choose Savings Group --</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Balance preview in modal */}
                {groupBalanceData && (
                  <div className="sm:col-span-2 p-3 bg-indigo-50/70 rounded-2xl border border-indigo-200 text-xs text-indigo-900 flex items-center justify-between">
                    <div>
                      <span className="font-medium">Available Group Balance:</span>
                      <p className="text-[11px] text-slate-500">
                        Total collected: ₹{Number(groupBalanceData.totalCollected).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <span className="text-base font-black text-indigo-950">
                      ₹ {Number(groupBalanceData.remainingBalance).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Recipient Member <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    disabled={!formData.group_id}
                    value={formData.member_id}
                    onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white disabled:bg-slate-100"
                  >
                    <option value="">
                      {!formData.group_id ? 'First choose group' : '-- Select Eligible Recipient --'}
                    </option>
                    {groupBalanceData?.enrolledMembers?.map((m) => (
                      <option
                        key={m.id}
                        value={m.id}
                        disabled={m.hasReceivedPayout}
                      >
                        Seat #{m.seat_number}: {m.full_name} {m.hasReceivedPayout ? '⚠️ (Already Won Prior Cycle)' : '✅ (Eligible)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Installment Cycle # <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={groupBalanceData?.durationMonths || 100}
                    required
                    value={formData.installment_no}
                    onChange={(e) => setFormData({ ...formData, installment_no: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payout Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="50"
                    min="1"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payout Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.payout_date}
                    onChange={(e) => setFormData({ ...formData, payout_date: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Disbursement Method <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                    <option value="Cheque">Account Payee Cheque</option>
                    <option value="Cash">Cash Handover</option>
                    <option value="UPI">UPI Direct Transfer</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Auction / Bid Notes or Remarks
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Month 3 auction bid discount of ₹2,500; transfer ref RTGS-928131..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  ></textarea>
                </div>
              </div>

              {/* MANAGER CONFIRMATION GATE */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>Manager Authorization Required</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  This financial transaction debits money from the group liquidity pool and generates a legal disbursement voucher. Please confirm that the recipient has been verified.
                </p>
                <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.manager_confirmed}
                    onChange={(e) => setFormData({ ...formData, manager_confirmed: e.target.checked })}
                    className="w-4 h-4 mt-0.5 rounded border-amber-400 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-bold text-xs text-slate-900">
                    I confirm that I am authorized to disburse this amount and have verified the group balance.
                  </span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !formData.manager_confirmed}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Disbursing...' : 'Confirm & Disburse Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Voucher Modal */}
      {selectedVoucher && (
        <PayoutVoucherModal
          voucher={selectedVoucher}
          onClose={() => setSelectedVoucher(null)}
        />
      )}
    </div>
  );
}
