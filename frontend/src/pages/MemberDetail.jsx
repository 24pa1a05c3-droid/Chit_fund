import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Layers,
  PiggyBank,
  Award,
  CreditCard,
  Eye,
  PlusCircle
} from 'lucide-react';
import api from '../services/api';
import ReceiptModal from '../components/ReceiptModal';
import PayoutVoucherModal from '../components/PayoutVoucherModal';
import { useToast } from '../context/ToastContext';

export default function MemberDetail() {
  const { id } = useParams();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const { showToast } = useToast();

  const fetchMember = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/members/${id}`);
      if (res.data.success) {
        setMember(res.data.data);
      }
    } catch (error) {
      console.error('Fetch member error:', error);
      showToast('Could not load member details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMember();
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="h-6 w-32 bg-slate-200 rounded animate-pulse"></div>
        <div className="h-44 bg-white rounded-3xl border border-slate-200 animate-pulse"></div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-center py-16">
        <h2 className="text-xl font-bold text-slate-800">Member Not Found</h2>
        <Link to="/members" className="mt-3 inline-block text-xs font-semibold text-blue-600 hover:underline">
          &larr; Back to Members
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Back button */}
      <div>
        <Link
          to="/members"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Member Directory</span>
        </Link>
      </div>

      {/* Member Profile Summary Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-xs flex flex-col md:flex-row gap-6 md:items-center justify-between">
        <div className="flex items-start md:items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center text-2xl font-black shadow-md shadow-blue-500/20 flex-shrink-0">
            {member.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{member.full_name}</h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  member.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {member.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {member.phone}
              </span>
              {member.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {member.email}
                </span>
              )}
              {member.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {member.address}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Joined: {new Date(member.join_date).toLocaleDateString()}
              </span>
            </div>
            {member.notes && (
              <p className="text-xs text-slate-400 italic pt-1">Note: {member.notes}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to={`/payments?memberId=${member.id}&new=1`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all hover:scale-102"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record Contribution</span>
          </Link>
        </div>
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Contributed</span>
            <PiggyBank className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            ₹ {Number(member.totalContributed || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-slate-400 mt-1">{member.payments?.length || 0} verified installment receipts</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-indigo-600 mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Payouts Received</span>
            <Award className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            ₹ {Number(member.totalPayouts || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-slate-400 mt-1">{member.payouts?.length || 0} chit pool payouts awarded</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Net Balance Position</span>
            <CreditCard className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            ₹ {Number(member.netBalance || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-slate-400 mt-1">Total Contributions minus Payouts</p>
        </div>
      </div>

      {/* Enrolled Groups Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-900">Savings Groups Enrolled ({member.groups?.length || 0})</h2>
        </div>

        {member.groups?.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4">This member is not enrolled in any savings group yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {member.groups?.map((g) => (
              <div key={g.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <Link to={`/groups/${g.id}`} className="font-bold text-slate-900 hover:text-blue-600 text-sm">
                    {g.name}
                  </Link>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Monthly Contribution: ₹{Number(g.monthly_contribution).toLocaleString('en-IN')} • Seat #{g.seat_number}
                  </p>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mt-1 inline-block">
                    Contributed: ₹{Number(g.member_group_contribution || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <Link
                  to={`/groups/${g.id}`}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                >
                  View Group
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment History Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">
              Contribution & Payment History ({member.payments?.length || 0})
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 px-3">Receipt No</th>
                <th className="pb-3 px-3">Date</th>
                <th className="pb-3 px-3">Group Name</th>
                <th className="pb-3 px-3">Installment</th>
                <th className="pb-3 px-3">Payment Method</th>
                <th className="pb-3 px-3 text-right">Amount</th>
                <th className="pb-3 px-3 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {member.payments?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                    No payments recorded for this member.
                  </td>
                </tr>
              ) : (
                member.payments?.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-800">{p.receipt_number}</td>
                    <td className="py-3 px-3 whitespace-nowrap">{new Date(p.payment_date).toLocaleDateString()}</td>
                    <td className="py-3 px-3 font-medium text-slate-900">{p.group_name}</td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-blue-700">Cycle #{p.installment_no}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      ₹ {Number(p.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => setSelectedReceipt({
                          ...p,
                          member_name: member.full_name,
                          member_phone: member.phone,
                          member_address: member.address
                        })}
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

      {/* Payouts Received Section */}
      {member.payouts?.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              Chit Payouts & Prize Awards ({member.payouts.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3 px-3">Voucher No</th>
                  <th className="pb-3 px-3">Payout Date</th>
                  <th className="pb-3 px-3">Group Name</th>
                  <th className="pb-3 px-3">Cycle Awarded</th>
                  <th className="pb-3 px-3">Payment Method</th>
                  <th className="pb-3 px-3 text-right">Lump Sum Amount</th>
                  <th className="pb-3 px-3 text-center">Voucher</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {member.payouts.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-indigo-900">{po.voucher_number}</td>
                    <td className="py-3 px-3">{new Date(po.payout_date).toLocaleDateString()}</td>
                    <td className="py-3 px-3 font-medium text-slate-900">{po.group_name}</td>
                    <td className="py-3 px-3 font-semibold text-indigo-700">Cycle #{po.installment_no}</td>
                    <td className="py-3 px-3">{po.payment_method}</td>
                    <td className="py-3 px-3 text-right font-black text-slate-900">
                      ₹ {Number(po.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => setSelectedVoucher({
                          ...po,
                          member_name: member.full_name,
                          member_phone: member.phone
                        })}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedReceipt && (
        <ReceiptModal receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
      )}
      {selectedVoucher && (
        <PayoutVoucherModal voucher={selectedVoucher} onClose={() => setSelectedVoucher(null)} />
      )}
    </div>
  );
}
