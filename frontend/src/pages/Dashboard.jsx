import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Banknote,
  PiggyBank,
  Users,
  Layers,
  AlertCircle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  PlusCircle,
  Eye,
  RefreshCw
} from 'lucide-react';
import api from '../services/api';
import StatCard from '../components/StatCard';
import ReceiptModal from '../components/ReceiptModal';
import PayoutVoucherModal from '../components/PayoutVoucherModal';
import { useToast } from '../context/ToastContext';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const { showToast } = useToast();

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/stats');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      showToast('Could not load dashboard statistics.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleViewTransaction = (tx) => {
    if (tx.type === 'Collection') {
      setSelectedReceipt({
        id: tx.id,
        receipt_number: tx.ref_no,
        amount: tx.amount,
        payment_date: tx.date,
        payment_method: tx.payment_method,
        member_name: tx.member_name,
        group_name: tx.group_name,
        installment_no: tx.installment_no,
        recorded_by_name: 'Finance Manager'
      });
    } else {
      setSelectedVoucher({
        id: tx.id,
        voucher_number: tx.ref_no,
        amount: tx.amount,
        payout_date: tx.date,
        payment_method: tx.payment_method,
        member_name: tx.member_name,
        group_name: tx.group_name,
        installment_no: tx.installment_no,
        approved_by: 'Finance Manager'
      });
    }
  };

  if (loading && !data) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-slate-200 p-5 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl shadow-slate-900/10 relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-semibold backdrop-blur-md mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-blue-300" />
            Live Financial Overview
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Savings & Chit Fund Dashboard</h1>
          <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-xl">
            Real-time tracking of contributions, group liquidity, pending installments, and member prize payouts.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchStats}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/payments?new=1"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/30 transition-all hover:scale-102"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record Payment</span>
          </Link>
          <Link
            to="/payouts?new=1"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/30 transition-all hover:scale-102"
          >
            <Banknote className="w-4 h-4" />
            <span>Disburse Payout</span>
          </Link>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <StatCard
          title="Total Savings Collected"
          value={`₹ ${Number(data?.totalSavings || 0).toLocaleString('en-IN')}`}
          subtitle="All-time verified member installments"
          icon={PiggyBank}
          color="emerald"
          trend="Credit"
        />

        <StatCard
          title="Total Amount Distributed"
          value={`₹ ${Number(data?.totalDistributed || 0).toLocaleString('en-IN')}`}
          subtitle="All-time pool payouts & lump-sums awarded"
          icon={Banknote}
          color="purple"
          trend="Disbursed"
        />

        <StatCard
          title="Available Net Pool Balance"
          value={`₹ ${Number(data?.netBalance || 0).toLocaleString('en-IN')}`}
          subtitle="Collections minus disbursements in vault"
          icon={TrendingUp}
          color="blue"
          trend="Liquidity"
        />

        <StatCard
          title="Pending Payments Dues"
          value={`₹ ${Number(data?.pendingAmount || 0).toLocaleString('en-IN')}`}
          subtitle={`${data?.pendingPaymentsCount || 0} overdue installments across active groups`}
          icon={AlertCircle}
          color="amber"
          trend="Overdue"
        />

        <StatCard
          title="Active Savings Groups"
          value={String(data?.activeGroups || 0)}
          subtitle={`${data?.completedGroups || 0} completed chit fund cycles`}
          icon={Layers}
          color="blue"
        />

        <StatCard
          title="Registered Members"
          value={String(data?.totalMembers || 0)}
          subtitle="Active community savers & contributors"
          icon={Users}
          color="emerald"
        />
      </div>

      {/* Group Snapshot & Quick Progress */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Active Savings Groups Snapshot</h2>
            <p className="text-xs text-slate-500">Collection progress and available pool balance</p>
          </div>
          <Link
            to="/groups"
            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
          >
            <span>View All Groups</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data?.groupOverview?.map((group) => {
            const totalTarget = group.capacity * group.monthly_contribution * group.duration_months;
            const progress = totalTarget > 0 ? Math.min(100, Math.round((group.total_collected / totalTarget) * 100)) : 0;
            const balance = Number(group.total_collected) - Number(group.total_payouts);

            return (
              <div key={group.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <Link to={`/groups/${group.id}`} className="font-bold text-slate-900 text-sm hover:text-blue-600 transition-colors">
                      {group.name}
                    </Link>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ₹{Number(group.monthly_contribution).toLocaleString('en-IN')}/mo • {group.duration_months} Months • {group.enrolled_count}/{group.capacity} Members
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                    {group.status}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                    <span>Collected: ₹{Number(group.total_collected).toLocaleString('en-IN')}</span>
                    <span className="font-bold text-blue-700">{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Available Pool Balance:</span>
                  <span className="font-bold text-slate-900">
                    ₹{Number(balance).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Recent Financial Transactions</h2>
            <p className="text-xs text-slate-500">Latest installment collections and member payouts</p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/payments"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              All Payments
            </Link>
            <Link
              to="/payouts"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              All Payouts
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 px-3">Type</th>
                <th className="pb-3 px-3">Reference No</th>
                <th className="pb-3 px-3">Date</th>
                <th className="pb-3 px-3">Member Name</th>
                <th className="pb-3 px-3">Group & Cycle</th>
                <th className="pb-3 px-3">Method</th>
                <th className="pb-3 px-3 text-right">Amount</th>
                <th className="pb-3 px-3 text-center">Receipt / Voucher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {data?.recentTransactions?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                    No transactions recorded yet.
                  </td>
                </tr>
              ) : (
                data?.recentTransactions?.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3">
                      {tx.type === 'Collection' ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <ArrowDownLeft className="w-3 h-3" />
                          Collection
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                          <ArrowUpRight className="w-3 h-3" />
                          Payout
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 font-mono font-medium text-slate-800">
                      {tx.ref_no}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap text-slate-600">
                      {new Date(tx.date).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-slate-900">
                      <Link to={`/members/${tx.member_id}`} className="hover:text-blue-600">
                        {tx.member_name}
                      </Link>
                    </td>
                    <td className="py-3.5 px-3 text-slate-600">
                      <span className="font-medium text-slate-800">{tx.group_name}</span>
                      <span className="text-slate-400 block text-[11px]">Installment #{tx.installment_no}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] text-slate-700 font-medium">
                        {tx.payment_method}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                      {tx.type === 'Collection' ? '+' : '-'}₹ {Number(tx.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <button
                        onClick={() => handleViewTransaction(tx)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipts and Voucher Modals */}
      {selectedReceipt && (
        <ReceiptModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}

      {selectedVoucher && (
        <PayoutVoucherModal
          voucher={selectedVoucher}
          onClose={() => setSelectedVoucher(null)}
        />
      )}
    </div>
  );
}
