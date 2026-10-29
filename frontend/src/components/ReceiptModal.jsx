import React from 'react';
import { X, Printer, CheckCircle, Building2 } from 'lucide-react';

export default function ReceiptModal({ receipt, onClose }) {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = receipt.payment_date 
    ? new Date(receipt.payment_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200 no-print">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold text-slate-800 text-sm">Official Payment Receipt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Content */}
        <div id="printable-receipt" className="p-8 font-sans text-slate-800 bg-white">
          {/* Header */}
          <div className="text-center pb-6 border-b-2 border-slate-800">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-700 mb-2 border border-blue-200">
              <Building2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-wider text-slate-900">
              Savings Group (Chit Fund) Manager
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Community Savings & Credit Mutual Fund System
            </p>
            <div className="inline-block mt-3 px-3 py-1 bg-slate-100 rounded-full text-xs font-mono font-bold text-slate-800 border border-slate-300">
              RECEIPT NO: {receipt.receipt_number || 'RCP-PENDING'}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 py-5 border-b border-slate-200 text-xs">
            <div>
              <p className="text-slate-400 font-semibold uppercase text-[10px]">Payment Date</p>
              <p className="font-bold text-slate-800 text-sm mt-0.5">{formattedDate}</p>
            </div>
            <div>
              <p className="text-slate-400 font-semibold uppercase text-[10px]">Payment Method</p>
              <p className="font-bold text-slate-800 text-sm mt-0.5">
                {receipt.payment_method || 'Cash'}
                {receipt.reference_no && <span className="text-slate-500 font-normal"> ({receipt.reference_no})</span>}
              </p>
            </div>
            <div>
              <p className="text-slate-400 font-semibold uppercase text-[10px]">Member Details</p>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{receipt.member_name || 'Member'}</p>
              {receipt.member_phone && <p className="text-slate-600">{receipt.member_phone}</p>}
              {receipt.member_address && <p className="text-slate-500 truncate max-w-xs">{receipt.member_address}</p>}
            </div>
            <div>
              <p className="text-slate-400 font-semibold uppercase text-[10px]">Savings Group & Cycle</p>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{receipt.group_name || 'Savings Group'}</p>
              <p className="text-blue-700 font-semibold mt-0.5">
                Installment Cycle: #{receipt.installment_no}
              </p>
            </div>
          </div>

          {/* Amount Box */}
          <div className="my-6 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Amount Received</p>
              <p className="text-xs text-slate-400 italic mt-0.5">
                Contribution for Installment #{receipt.installment_no}
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                ₹ {Number(receipt.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <p className="text-[10px] font-semibold text-emerald-600 uppercase">Paid & Verified</p>
            </div>
          </div>

          {receipt.notes && (
            <div className="mb-6 p-3 bg-amber-50/60 rounded-lg border border-amber-200/60 text-xs text-amber-900">
              <span className="font-semibold">Note:</span> {receipt.notes}
            </div>
          )}

          {/* Signatures & Verification */}
          <div className="pt-6 grid grid-cols-2 gap-8 items-end border-t border-slate-200 text-xs">
            <div>
              <p className="text-slate-400 text-[10px] uppercase font-semibold">Recorded By</p>
              <p className="font-bold text-slate-800">{receipt.recorded_by_name || 'Finance Manager'}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Authorized Signatory</p>
            </div>
            <div className="text-right">
              <div className="h-10 border-b border-dashed border-slate-400 inline-block w-36 mb-1"></div>
              <p className="text-slate-400 text-[10px] uppercase font-semibold">Member Signature</p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-[10px] text-slate-400 border-t border-slate-100 pt-3">
            Computer-generated receipt from Savings Group (Chit Fund) Manager. Valid without physical stamp.
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
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
}
