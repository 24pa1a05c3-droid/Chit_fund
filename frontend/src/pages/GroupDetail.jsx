import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Layers,
  Users,
  Coins,
  Calendar,
  CreditCard,
  PlusCircle,
  Eye,
  CheckCircle,
  Clock,
  Award,
  UserPlus,
  Trash2,
  X,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';
import ReceiptModal from '../components/ReceiptModal';
import PayoutVoucherModal from '../components/PayoutVoucherModal';
import { useToast } from '../context/ToastContext';

export default function GroupDetail() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tracker'); // 'tracker' | 'members' | 'payouts'

  // Cycle tracker state
  const [selectedCycle, setSelectedCycle] = useState(1);
  const [cycleData, setCycleData] = useState(null);
  const [cycleLoading, setCycleLoading] = useState(false);

  // Modals state
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [allAvailableMembers, setAllAvailableMembers] = useState([]);

  // Forms
  const [enrollMemberId, setEnrollMemberId] = useState('');
  const [enrollSeatNo, setEnrollSeatNo] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Quick Payment Modal for a pending member
  const [paymentForm, setPaymentForm] = useState({
    member_id: '',
    member_name: '',
    installment_no: 1,
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'UPI',
    reference_no: '',
    notes: ''
  });

  const { showToast } = useToast();

  const fetchGroup = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/groups/${id}`);
      if (res.data.success) {
        setGroup(res.data.data);
      }
    } catch (error) {
      console.error('Fetch group error:', error);
      showToast('Could not load savings group details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCycleData = async (cycleNum) => {
    try {
      setCycleLoading(true);
      const res = await api.get(`/groups/${id}/installments/${cycleNum}`);
      if (res.data.success) {
        setCycleData(res.data.data);
      }
    } catch (error) {
      console.error('Fetch cycle error:', error);
    } finally {
      setCycleLoading(false);
    }
  };

  useEffect(() => {
    fetchGroup();
  }, [id]);

  useEffect(() => {
    if (group) {
      fetchCycleData(selectedCycle);
    }
  }, [id, selectedCycle, group?.total_collected]);

  const loadAvailableMembers = async () => {
    try {
      const res = await api.get('/members?status=Active');
      if (res.data.success) {
        // Filter out members already enrolled
        const enrolledIds = group?.members?.map(m => m.id) || [];
        const available = res.data.data.filter(m => !enrolledIds.includes(m.id));
        setAllAvailableMembers(available);
      }
    } catch (error) {
      console.error('Load available members error:', error);
    }
  };

  const handleOpenEnroll = () => {
    loadAvailableMembers();
    setEnrollMemberId('');
    setEnrollSeatNo(String((group?.members?.length || 0) + 1));
    setIsEnrollModalOpen(true);
  };

  const handleEnrollMember = async (e) => {
    e.preventDefault();
    if (!enrollMemberId) {
      showToast('Please select a member to enroll.', 'error');
      return;
    }

    try {
      setActionLoading(true);
      const res = await api.post(`/groups/${id}/members`, {
        member_id: enrollMemberId,
        seat_number: enrollSeatNo ? parseInt(enrollSeatNo, 10) : undefined
      });
      if (res.data.success) {
        showToast('Member enrolled successfully!', 'success');
        setIsEnrollModalOpen(false);
        fetchGroup();
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to enroll member.';
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenQuickPayment = (memberRow) => {
    setPaymentForm({
      member_id: memberRow.member_id,
      member_name: memberRow.full_name,
      installment_no: selectedCycle,
      amount: group?.monthly_contribution || 5000,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'UPI',
      reference_no: '',
      notes: `Installment #${selectedCycle} for ${group?.name}`
    });
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const payload = {
        group_id: parseInt(id, 10),
        member_id: parseInt(paymentForm.member_id, 10),
        installment_no: parseInt(paymentForm.installment_no, 10),
        amount: parseFloat(paymentForm.amount),
        payment_date: paymentForm.payment_date,
        payment_method: paymentForm.payment_method,
        reference_no: paymentForm.reference_no,
        notes: paymentForm.notes
      };

      const res = await api.post('/payments', payload);
      if (res.data.success) {
        showToast('Payment recorded successfully! Receipt generated.', 'success');
        setIsPaymentModalOpen(false);
        fetchGroup();
        fetchCycleData(selectedCycle);
        if (res.data.receipt) {
          setSelectedReceipt(res.data.receipt);
        }
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to record payment.';
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !group) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="h-6 w-32 bg-slate-200 rounded animate-pulse"></div>
        <div className="h-48 bg-white rounded-3xl border border-slate-200 animate-pulse"></div>
      </div>
    );
  }

  const enrollmentCapacity = group.total_members;
  const enrolledCount = group.members?.length || 0;
  const isFull = enrolledCount >= enrollmentCapacity;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Back button */}
      <div>
        <Link
          to="/groups"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Savings Groups</span>
        </Link>
      </div>

      {/* Hero Overview */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  group.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {group.status}
              </span>
              <span className="text-xs font-semibold text-slate-400">ID: #{group.id}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{group.name}</h1>
            {group.description && (
              <p className="text-xs text-slate-500 max-w-2xl">{group.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {!isFull && (
              <button
                onClick={handleOpenEnroll}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all hover:scale-102"
              >
                <UserPlus className="w-4 h-4" />
                <span>Enroll Member ({enrolledCount}/{enrollmentCapacity})</span>
              </button>
            )}
            <Link
              to={`/payouts?groupId=${group.id}&new=1`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all hover:scale-102"
            >
              <Award className="w-4 h-4" />
              <span>Award Payout</span>
            </Link>
          </div>
        </div>

        {/* Financial KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-slate-400 font-semibold uppercase text-[10px]">Monthly Contribution</span>
            <p className="text-xl font-bold text-slate-900 mt-1">
              ₹ {Number(group.monthly_contribution).toLocaleString('en-IN')}
            </p>
            <p className="text-slate-500 text-[11px] mt-0.5">Due: {group.collection_day}th of month</p>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80">
            <span className="text-blue-500 font-semibold uppercase text-[10px]">Monthly Pool Pot</span>
            <p className="text-xl font-bold text-blue-900 mt-1">
              ₹ {Number(group.total_pool_per_month).toLocaleString('en-IN')}
            </p>
            <p className="text-blue-700 text-[11px] mt-0.5">{group.total_members} Members × Contribution</p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
            <span className="text-emerald-600 font-semibold uppercase text-[10px]">Total Collected</span>
            <p className="text-xl font-bold text-emerald-900 mt-1">
              ₹ {Number(group.total_collected || 0).toLocaleString('en-IN')}
            </p>
            <p className="text-emerald-700 text-[11px] mt-0.5">All verified installments</p>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/80">
            <span className="text-purple-600 font-semibold uppercase text-[10px]">Remaining Balance</span>
            <p className="text-xl font-bold text-purple-900 mt-1">
              ₹ {Number(group.remaining_balance || 0).toLocaleString('en-IN')}
            </p>
            <p className="text-purple-700 text-[11px] mt-0.5">
              Disbursed: ₹{Number(group.total_payouts || 0).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('tracker')}
          className={`pb-3 transition-colors flex items-center gap-1.5 border-b-2 ${
            activeTab === 'tracker'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Monthly Installment Tracker</span>
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`pb-3 transition-colors flex items-center gap-1.5 border-b-2 ${
            activeTab === 'members'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Enrolled Members ({enrolledCount}/{enrollmentCapacity})</span>
        </button>

        <button
          onClick={() => setActiveTab('payouts')}
          className={`pb-3 transition-colors flex items-center gap-1.5 border-b-2 ${
            activeTab === 'payouts'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Payout History ({group.payouts?.length || 0})</span>
        </button>
      </div>

      {/* TAB 1: Monthly Installment Tracker */}
      {activeTab === 'tracker' && (
        <div className="space-y-6">
          {/* Cycle Picker bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
              <span className="text-xs font-bold text-slate-600 mr-1 flex-shrink-0">Installment Cycle:</span>
              {[...Array(group.duration_months)].map((_, i) => {
                const cycleNum = i + 1;
                return (
                  <button
                    key={cycleNum}
                    onClick={() => setSelectedCycle(cycleNum)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                      selectedCycle === cycleNum
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Month #{cycleNum}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5" />
                {cycleData?.paidCount || 0} Paid
              </span>
              <span className="flex items-center gap-1 text-amber-700 font-semibold bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                <Clock className="w-3.5 h-3.5" />
                {cycleData?.pendingCount || 0} Pending
              </span>
            </div>
          </div>

          {/* Cycle Payout banner */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">
                Prize Pool Disbursement for Cycle #{selectedCycle}
              </p>
              {cycleData?.payout ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-bold text-slate-900 text-sm">
                    Awarded to: {cycleData.payout.recipient_name}
                  </span>
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    ₹{Number(cycleData.payout.amount).toLocaleString('en-IN')} (Voucher: {cycleData.payout.voucher_number})
                  </span>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic mt-0.5">
                  Pool not yet disbursed for this cycle. Available pool collected so far: ₹{Number(cycleData?.totalCollectedForCycle || 0).toLocaleString('en-IN')}.
                </p>
              )}
            </div>

            {!cycleData?.payout && (
              <Link
                to={`/payouts?groupId=${group.id}&cycle=${selectedCycle}&new=1`}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
              >
                Award Payout for Cycle #{selectedCycle}
              </Link>
            )}
          </div>

          {/* Installment Members Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Seat #</th>
                    <th className="py-3 px-4">Member Name</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4 text-center">Payment Status</th>
                    <th className="py-3 px-4">Receipt Number</th>
                    <th className="py-3 px-4">Paid Date</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {cycleLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Loading cycle data...
                      </td>
                    </tr>
                  ) : cycleData?.members?.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                        No members enrolled in this group yet. Please enroll members first.
                      </td>
                    </tr>
                  ) : (
                    cycleData?.members?.map((m) => (
                      <tr key={m.member_id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          #{m.seat_number || '—'}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <Link to={`/members/${m.member_id}`} className="hover:text-blue-600">
                            {m.full_name}
                          </Link>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">{m.phone}</td>
                        <td className="py-3.5 px-4 text-center">
                          {m.status === 'Paid' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle className="w-3 h-3" />
                              Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                              <Clock className="w-3 h-3" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-700">
                          {m.receipt_number || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {m.payment_date ? new Date(m.payment_date).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          {m.payment_method ? (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                              {m.payment_method}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {m.status === 'Paid' ? (
                            <button
                              onClick={() => setSelectedReceipt({
                                id: m.payment_id,
                                receipt_number: m.receipt_number,
                                amount: m.paid_amount,
                                payment_date: m.payment_date,
                                payment_method: m.payment_method,
                                member_name: m.full_name,
                                member_phone: m.phone,
                                group_name: group.name,
                                installment_no: selectedCycle,
                                recorded_by_name: 'Finance Manager'
                              })}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View Receipt</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenQuickPayment(m)}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
                            >
                              <PlusCircle className="w-3 h-3" />
                              <span>Record Payment</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Enrolled Members */}
      {activeTab === 'members' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Enrolled Members Roster</h2>
              <p className="text-xs text-slate-500">Seat assignments and contribution statistics for this group</p>
            </div>
            {!isFull && (
              <button
                onClick={handleOpenEnroll}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Member</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Seat #</th>
                  <th className="py-3.5 px-4">Member Name</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Joined Group Date</th>
                  <th className="py-3.5 px-4 text-center">Paid Installments</th>
                  <th className="py-3.5 px-4 text-right">Total Contributed</th>
                  <th className="py-3.5 px-4 text-center">Payout Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {group.members?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                      No members enrolled in this group yet.
                    </td>
                  </tr>
                ) : (
                  group.members?.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4 font-bold text-slate-900">#{m.seat_number}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <Link to={`/members/${m.id}`} className="hover:text-blue-600">
                          {m.full_name}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{m.phone}</td>
                      <td className="py-3.5 px-4">{new Date(m.joined_date).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                        {m.installments_paid_count} / {group.duration_months}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        ₹ {Number(m.total_paid).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {m.payout_voucher ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800">
                            Won (₹{Number(m.payout_amount).toLocaleString('en-IN')})
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                            Eligible
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Payout History */}
      {activeTab === 'payouts' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Group Payout Disbursements</h2>
              <p className="text-xs text-slate-500">Prize pot vouchers awarded across cycles</p>
            </div>
            <Link
              to={`/payouts?groupId=${group.id}&new=1`}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Award className="w-4 h-4" />
              <span>Record New Payout</span>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Cycle</th>
                  <th className="py-3 px-4">Voucher No</th>
                  <th className="py-3 px-4">Disbursement Date</th>
                  <th className="py-3 px-4">Recipient Member</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4 text-right">Lump Sum Amount</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {group.payouts?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                      No payouts recorded for this group yet.
                    </td>
                  </tr>
                ) : (
                  group.payouts?.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4 font-bold text-indigo-700">Cycle #{po.installment_no}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{po.voucher_number}</td>
                      <td className="py-3.5 px-4">{new Date(po.payout_date).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{po.member_name}</td>
                      <td className="py-3.5 px-4">{po.payment_method}</td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900">
                        ₹ {Number(po.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedVoucher({
                            ...po,
                            group_name: group.name
                          })}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
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
      )}

      {/* Enroll Member Modal */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between p-6 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Enroll Member into {group.name}</h3>
              </div>
              <button
                onClick={() => setIsEnrollModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEnrollMember} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Member <span className="text-rose-500">*</span>
                </label>
                {allAvailableMembers.length === 0 ? (
                  <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    All active registered members are already enrolled, or none are available. Please create a new member first in Member Management.
                  </p>
                ) : (
                  <select
                    required
                    value={enrollMemberId}
                    onChange={(e) => setEnrollMemberId(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                  >
                    <option value="">-- Choose Member --</option>
                    {allAvailableMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.phone})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Seat Number in Circle
                </label>
                <input
                  type="number"
                  min="1"
                  max={group.total_members}
                  value={enrollSeatNo}
                  onChange={(e) => setEnrollSeatNo(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Capacity: {enrolledCount} / {enrollmentCapacity} seats filled
                </span>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || allAvailableMembers.length === 0}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Enrolling...' : 'Enroll Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Record Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between p-6 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Record Installment Payment</h3>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200/80 text-xs text-blue-900">
                <div className="font-bold text-sm text-slate-900">{paymentForm.member_name}</div>
                <div className="text-slate-500 mt-0.5">
                  Group: {group.name} • Installment Cycle #{paymentForm.installment_no}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="50"
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Method <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                  >
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="Cash">Cash Deposit</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Online">Online Gateway</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reference / UTR Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-98213812"
                    value={paymentForm.reference_no}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference_no: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Remarks / Receipt Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Paid on schedule by cash"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Recording...' : 'Generate Receipt & Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipts and Voucher Modals */}
      {selectedReceipt && (
        <ReceiptModal receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
      )}
      {selectedVoucher && (
        <PayoutVoucherModal voucher={selectedVoucher} onClose={() => setSelectedVoucher(null)} />
      )}
    </div>
  );
}
