import React from 'react';
import { Menu, PlusCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Navbar({ title, setMobileOpen, onQuickPayment }) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 py-3.5 flex items-center justify-between">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
        </div>
      </div>

      {/* Right: Quick Actions & Manager Pill */}
      <div className="flex items-center gap-3">
        {onQuickPayment ? (
          <button
            onClick={onQuickPayment}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Record Payment</span>
            <span className="sm:hidden">Pay</span>
          </button>
        ) : (
          <Link
            to="/payments?new=1"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Record Payment</span>
            <span className="sm:hidden">Pay</span>
          </Link>
        )}

        <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-xs">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'M'}
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-slate-800">{user?.name || 'Manager'}</p>
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Authenticated
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
