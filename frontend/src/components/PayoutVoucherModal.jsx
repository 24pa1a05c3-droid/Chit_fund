import React from 'react';
import { X, Printer, Award, ShieldCheck } from 'lucide-react';

export default function PayoutVoucherModal({ voucher, onClose }) {
  if (!voucher) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = voucher.payout_date
    ? new Date(voucher.payout_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200 no-print">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            <span className="font-semibold text-slate-800 text-sm">Disbursement Payout Voucher</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Voucher</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Content */}
        <div id="printable-receipt" className="p-8 font-sans text-slate-800 bg-white">
          {/* Header */}
          <div className="text-center pb-6 border-b-2 border-indigo-900">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 mb-2 border border-indigo-200">
              <Award className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-wider text-slate-900">
              Savings Group Payout Disbursement Voucher
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Authorized Chit Fund Lump-Sum Distribution
            </p>
            <div className="inline-block mt-3 px-3 py-1 bg-indigo-50 text-indigo-900 rounded-full text-xs font-mono font-bold border border-indigo-200">
              VOUCHER NO: {voucher.voucher_number || 'VCH-PENDING'}
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4 py-5 border-b border-slate-200 text-xs">
            <div>
              <p className="text-slate-400 font-semibold uppercase text-[10px]">Disbursement Date</p>
              <p className="font-bold text-slate-800 text-sm mt-0.5">{formattedDate}</p>
            </div>
            <div>
              <p className="text-slate-400 font-semibold uppercase text-[10px]">Payment Mode</p>
              <p className="font-bold text-slate-800 text-sm mt-0.5">{voucher.payment_method || 'Bank Transfer'}</p>
            </div>
            <div>
              <p className="text-slate-400 font-semibold uppercase text-[10px]">Recipient Member</p>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{voucher.member_name || 'Member'}</p>
              {voucher.member_phone && <p className="text-slate-600">{voucher.member_phone}</p>}
            </div>
            <div>
              <p className="text-slate-400 font-semibold uppercase text-[10px]">Savings Group & Cycle</p>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{voucher.group_name || 'Savings Group'}</p>
              <p className="text-indigo-700 font-semibold mt-0.5">
                Awarded for Cycle #{voucher.installment_no}
              </p>
            </div>
          </div>

          {/* Amount Box */}
          <div className="my-6 p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-indigo-900 uppercase">Total Amount Disbursed</p>
              <p className="text-xs text-slate-500 italic mt-0.5">
                Pool lump sum payout for Chit Cycle #{voucher.installment_no}
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-indigo-950 tracking-tight">
                ₹ {Number(voucher.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <p className="text-[10px] font-semibold text-emerald-600 uppercase flex items-center justify-end gap-1">
                <ShieldCheck className="w-3 h-3" />
                Manager Approved
              </p>
            </div>
          </div>

          {voucher.notes && (
            <div className="mb-6 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700">
              <span className="font-semibold text-slate-900">Remarks / Auction Details:</span> {voucher.notes}
            </div>
          )}

          {/* Signatures */}
          <div className="pt-6 grid grid-cols-2 gap-8 items-end border-t border-slate-200 text-xs">
            <div>
              <p className="text-slate-400 text-[10px] uppercase font-semibold">Approved By</p>
              <p className="font-bold text-slate-800">{voucher.approved_by || 'Finance Manager'}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Management Authority</p>
            </div>
            <div className="text-right">
              <div className="h-10 border-b border-dashed border-slate-400 inline-block w-36 mb-1"></div>
              <p className="text-slate-400 text-[10px] uppercase font-semibold">Recipient Signature</p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-[10px] text-slate-400 border-t border-slate-100 pt-3">
            Financial record generated by Savings Group (Chit Fund) Manager. Certified authentic.
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Voucher</span>
          </button>
        </div>
      </div>
    </div>
  );
}
