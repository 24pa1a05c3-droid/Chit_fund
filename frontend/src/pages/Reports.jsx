import React, { useState, useEffect } from 'react';
import {
  FileBarChart2,
  Download,
  Calendar,
  AlertCircle,
  Users,
  CreditCard,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  RefreshCw
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export default function Reports() {
  const [activeReport, setActiveReport] = useState('collections'); // 'collections' | 'pending' | 'members' | 'transactions'
  const [data, setData] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterGroup, setFilterGroup] = useState('All');
  const [filterYear, setFilterYear] = useState('');
  const [txType, setTxType] = useState('All');

  // Pending summary stats
  const [pendingSummary, setPendingSummary] = useState({ count: 0, amount: 0 });

  const { showToast } = useToast();

  const fetchGroups = async () => {
    try {
      const res = await api.get('/groups');
      if (res.data.success) {
        setGroups(res.data.data);
      }
    } catch (error) {
      console.error('Failed to load groups for filter:', error);
    }
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      if (activeReport === 'collections') {
        const params = {};
        if (filterGroup !== 'All') params.group_id = filterGroup;
        if (filterYear) params.year = filterYear;
        const res = await api.get('/reports/collections', { params });
        if (res.data.success) setData(res.data.data);
      } else if (activeReport === 'pending') {
        const params = {};
        if (filterGroup !== 'All') params.group_id = filterGroup;
        const res = await api.get('/reports/pending', { params });
        if (res.data.success) {
          setData(res.data.data);
          setPendingSummary({
            count: res.data.totalPendingCount || 0,
            amount: res.data.totalPendingAmount || 0
          });
        }
      } else if (activeReport === 'members') {
        const res = await api.get('/reports/members-summary');
        if (res.data.success) setData(res.data.data);
      } else if (activeReport === 'transactions') {
        const params = {};
        if (filterGroup !== 'All') params.group_id = filterGroup;
        if (txType !== 'All') params.type = txType;
        const res = await api.get('/reports/transactions', { params });
        if (res.data.success) setData(res.data.data);
      }
    } catch (error) {
      console.error('Fetch report error:', error);
      showToast('Failed to load report data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [activeReport, filterGroup, filterYear, txType]);

  // Client-side & backend CSV Export trigger
  const handleExportCSV = () => {
    let reportKey = 'monthly-collections';
    if (activeReport === 'pending') reportKey = 'pending';
    if (activeReport === 'members') reportKey = 'members-summary';
    if (activeReport === 'transactions') reportKey = 'transactions';

    // Direct browser download from the API endpoint with token
    const token = localStorage.getItem('token');
    fetch(`/api/reports/export-csv?reportType=${reportKey}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chitfund-${reportKey}-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showToast('CSV report downloaded successfully.', 'success');
      })
      .catch((err) => {
        console.error('CSV export failed:', err);
        showToast('Failed to export CSV report.', 'error');
      });
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Financial Reports & Audits</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Export collections, pending dues, member balances, and full transaction ledgers
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all hover:scale-102"
        >
          <Download className="w-4 h-4" />
          <span>Export Report to CSV</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-1 text-xs font-bold">
        {[
          { key: 'collections', label: 'Monthly Collections', icon: Calendar },
          { key: 'pending', label: 'Pending Dues Report', icon: AlertCircle },
          { key: 'members', label: 'Member-wise Savings', icon: Users },
          { key: 'transactions', label: 'Transaction Audit Ledger', icon: CreditCard }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveReport(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
                activeReport === tab.key
                  ? 'bg-blue-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Row */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-600">Filters:</span>

          {activeReport !== 'members' && (
            <select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium"
            >
              <option value="All">All Savings Groups</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}

          {activeReport === 'collections' && (
            <input
              type="number"
              placeholder="Year (e.g. 2026)"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 w-32"
            />
          )}

          {activeReport === 'transactions' && (
            <select
              value={txType}
              onChange={(e) => setTxType(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium"
            >
              <option value="All">All Types (Credit & Debit)</option>
              <option value="Collection">Collections (Credits)</option>
              <option value="Payout">Payouts (Debits)</option>
            </select>
          )}
        </div>

        <button
          onClick={fetchReportData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Pending Summary Banner (If activeReport is pending) */}
      {activeReport === 'pending' && (
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <div>
              <p className="font-bold text-amber-950">Active Overdue Installments Summary</p>
              <p className="text-amber-800 text-[11px]">
                Members with unrecorded payments up to current elapsed cycles
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm font-black text-amber-950">
              ₹ {Number(pendingSummary.amount).toLocaleString('en-IN')}
            </span>
            <p className="text-[11px] text-amber-700 font-semibold">{pendingSummary.count} Pending Installments</p>
          </div>
        </div>
      )}

      {/* Report Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {/* 1. Monthly Collections Table */}
          {activeReport === 'collections' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Collection Month</th>
                  <th className="py-3.5 px-4">Savings Group</th>
                  <th className="py-3.5 px-4 text-center">Receipts / Payments Count</th>
                  <th className="py-3.5 px-4 text-right">Total Amount Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">Loading collection report...</td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 italic">No collections found for filter.</td>
                  </tr>
                ) : (
                  data.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{row.month}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">{row.group_name}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-blue-700">{row.payment_count}</td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900">
                        ₹ {Number(row.total_amount).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* 2. Pending Payments Table */}
          {activeReport === 'pending' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Member Name</th>
                  <th className="py-3.5 px-4">Phone</th>
                  <th className="py-3.5 px-4">Group Name</th>
                  <th className="py-3.5 px-4">Installment</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Amount Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">Loading pending dues...</td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-emerald-600 font-semibold italic">
                      All member payments are up to date! Zero overdue installments.
                    </td>
                  </tr>
                ) : (
                  data.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{row.member_name}</td>
                      <td className="py-3.5 px-4 text-slate-600">{row.phone}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">{row.group_name}</td>
                      <td className="py-3.5 px-4 font-semibold text-blue-700">Cycle #{row.installment_no}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">{row.due_date}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                          {row.overdue_days > 0 ? `${row.overdue_days} Days Overdue` : 'Due this cycle'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-rose-700">
                        ₹ {Number(row.amount_due).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* 3. Member Savings Table */}
          {activeReport === 'members' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Member Name</th>
                  <th className="py-3.5 px-4">Phone</th>
                  <th className="py-3.5 px-4 text-center">Groups</th>
                  <th className="py-3.5 px-4 text-right">Total Contributed</th>
                  <th className="py-3.5 px-4 text-right">Total Payouts Won</th>
                  <th className="py-3.5 px-4 text-right">Net Savings Balance</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">Loading member report...</td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 italic">No members found.</td>
                  </tr>
                ) : (
                  data.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{row.full_name}</td>
                      <td className="py-3.5 px-4 text-slate-600">{row.phone}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">{row.groups_count}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                        ₹ {Number(row.total_saved).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-indigo-700">
                        ₹ {Number(row.total_payouts_received).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900">
                        ₹ {Number(row.net_balance).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* 4. Transactions Ledger Table */}
          {activeReport === 'transactions' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Reference No</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Member</th>
                  <th className="py-3.5 px-4">Group & Cycle</th>
                  <th className="py-3.5 px-4">Payment Method</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">Loading audit ledger...</td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 italic">No transactions found.</td>
                  </tr>
                ) : (
                  data.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4">
                        {tx.transaction_type === 'Collection' ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <ArrowDownLeft className="w-3 h-3" />
                            Credit
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                            <ArrowUpRight className="w-3 h-3" />
                            Debit
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{tx.reference_number}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                        {new Date(tx.transaction_date).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{tx.member_name}</td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <span className="font-medium text-slate-900">{tx.group_name}</span>
                        <span className="text-slate-400 block text-[11px]">Cycle #{tx.installment_no}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 text-[11px]">
                          {tx.payment_method}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                        {tx.transaction_type === 'Collection' ? '+' : '-'}₹ {Number(tx.amount).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
