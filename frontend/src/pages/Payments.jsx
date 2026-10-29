import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  CreditCard,
  PlusCircle,
  Search,
  Filter,
  Eye,
  Trash2,
  Calendar,
  Layers,
  Users,
  CheckCircle,
  X,
  AlertTriangle,
  Printer
} from 'lucide-react';
import api from '../services/api';
import ReceiptModal from '../components/ReceiptModal';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../context/ToastContext';

export default function Payments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [payments, setPayments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterGroup, setFilterGroup] = useState('All');
  const [filterMethod, setFilterMethod] = useState('All');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Total amount from backend
  const [totalFilteredAmount, setTotalFilteredAmount] = useState(0);

  // Modals
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // New Payment Form
  const [formData, setFormData] = useState({
    group_id: '',
    member_id: '',
    installment_no: 1,
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'UPI',
    reference_no: '',
    notes: ''
  });

  const { showToast } = useToast();

  const fetchFiltersData = async () => {
    try {
      const [gRes, mRes] = await Promise.all([
        api.get('/groups'),
        api.get('/members')
      ]);
      if (gRes.data.success) setGroups(gRes.data.data);
      if (mRes.data.success) setMembers(mRes.data.data);
    } catch (error) {
      console.error('Failed to load filter choices:', error);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterGroup !== 'All') params.group_id = filterGroup;
      if (filterMethod !== 'All') params.payment_method = filterMethod;
      if (search) params.search = search;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await api.get('/payments', { params });
      if (res.data.success) {
        setPayments(res.data.data);
        setTotalFilteredAmount(res.data.totalAmount || 0);
      }
    } catch (error) {
      console.error('Fetch payments error:', error);
      showToast('Failed to load payment transactions.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiltersData();
    if (searchParams.get('new') === '1') {
      setIsRecordModalOpen(true);
      const memberParam = searchParams.get('memberId');
      if (memberParam) {
        setFormData(prev => ({ ...prev, member_id: memberParam }));
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPayments();
    }, 250);
    return () => clearTimeout(timer);
  }, [filterGroup, filterMethod, search, dateFrom, dateTo]);

  // When group is selected in form, populate members and prefill amount
  const handleGroupSelectChange = async (groupId) => {
    setFormData(prev => ({
      ...prev,
      group_id: groupId,
      member_id: ''
    }));

    if (!groupId) {
      setGroupMembers([]);
      return;
    }

    const selectedG = groups.find(g => String(g.id) === String(groupId));
    if (selectedG) {
      setFormData(prev => ({
        ...prev,
        amount: selectedG.monthly_contribution
      }));
    }

    try {
      const res = await api.get(`/groups/${groupId}`);
      if (res.data.success) {
        setGroupMembers(res.data.data.members || []);
      }
    } catch (error) {
      console.error('Load group members error:', error);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!formData.group_id || !formData.member_id || !formData.installment_no || !formData.amount || !formData.payment_date) {
      showToast('Please fill all mandatory fields.', 'error');
      return;
    }

    try {
      setActionLoading(true);
      const res = await api.post('/payments', formData);
      if (res.data.success) {
        showToast('Payment recorded successfully! Receipt generated.', 'success');
        setIsRecordModalOpen(false);
        fetchPayments();
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

  const handleConfirmDelete = async () => {
    if (!paymentToDelete) return;
    try {
      setActionLoading(true);
      const res = await api.delete(`/payments/${paymentToDelete.id}`);
      if (res.data.success) {
        showToast('Payment record removed successfully.', 'success');
        setDeleteModalOpen(false);
        setPaymentToDelete(null);
        fetchPayments();
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to delete payment.';
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
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Payment Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Record member contributions, issue payment receipts, and maintain transaction ledger
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({
              group_id: '',
              member_id: '',
              installment_no: 1,
              amount: '',
              payment_date: new Date().toISOString().split('T')[0],
              payment_method: 'UPI',
              reference_no: '',
              notes: ''
            });
            setIsRecordModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all hover:scale-102"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Record Contribution</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search receipt, member, ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
          </div>

          {/* Group Filter */}
          <div>
            <select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="All">All Savings Groups</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Method Filter */}
          <div>
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="All">All Payment Methods</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Cheque">Cheque</option>
              <option value="Online">Online Gateway</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 text-[11px]"
              title="From Date"
            />
            <span className="text-slate-400 font-bold">-</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 text-[11px]"
              title="To Date"
            />
          </div>
        </div>

        {/* Results counter pill */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
          <span className="text-slate-500 font-medium">
            Showing <strong className="text-slate-900">{payments.length}</strong> transactions
          </span>
          <span className="text-slate-700 font-bold">
            Filtered Total: <span className="text-emerald-700 font-black">₹ {Number(totalFilteredAmount).toLocaleString('en-IN')}</span>
          </span>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Receipt Number</th>
                <th className="py-3.5 px-4">Payment Date</th>
                <th className="py-3.5 px-4">Member Name</th>
                <th className="py-3.5 px-4">Savings Group</th>
                <th className="py-3.5 px-4 text-center">Cycle #</th>
                <th className="py-3.5 px-4">Payment Method</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading payment records...</span>
                    </div>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 italic">
                    No payment records found matching the specified filters.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {p.receipt_number}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                      {new Date(p.payment_date).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <Link to={`/members/${p.member_id}`} className="hover:text-blue-600 transition-colors">
                        {p.member_name}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <Link to={`/groups/${p.group_id}`} className="hover:text-blue-600 font-medium">
                        {p.group_name}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        Month #{p.installment_no}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                      ₹ {Number(p.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedReceipt(p)}
                          title="Print Receipt"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
                        <button
                          onClick={() => {
                            setPaymentToDelete(p);
                            setDeleteModalOpen(true);
                          }}
                          title="Void Payment"
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between p-6 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Record Member Contribution</h3>
              </div>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Savings Group <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.group_id}
                    onChange={(e) => handleGroupSelectChange(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                  >
                    <option value="">-- Choose Group --</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} (₹{Number(g.monthly_contribution).toLocaleString('en-IN')}/mo)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Member <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    disabled={!formData.group_id}
                    value={formData.member_id}
                    onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white disabled:bg-slate-100"
                  >
                    <option value="">
                      {!formData.group_id ? 'First select a savings group' : '-- Choose Enrolled Member --'}
                    </option>
                    {groupMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        Seat #{m.seat_number}: {m.full_name} ({m.phone})
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
                    max="120"
                    required
                    value={formData.installment_no}
                    onChange={(e) => setFormData({ ...formData, installment_no: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="50"
                    min="1"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
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
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Method <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                  >
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="Cash">Cash Deposit</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Online">Online Gateway</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reference / UTR / Cheque Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR18293123 or Cheque #4928"
                    value={formData.reference_no}
                    onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Receipt Notes / Remarks
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Optional remarks printed on receipt..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  ></textarea>
                </div>
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
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Record Payment & Generate Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {selectedReceipt && (
        <ReceiptModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}

      {/* Confirm Delete / Void Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Void Payment Record"
        message={`Are you sure you want to void payment ${paymentToDelete?.receipt_number} for ₹${paymentToDelete?.amount}? This will permanently remove this contribution from the accounting ledger.`}
        confirmText="Void Payment"
        isDanger={true}
        loading={actionLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setPaymentToDelete(null);
        }}
      />
    </div>
  );
}
