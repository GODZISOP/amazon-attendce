import Link from 'next/link';
import { CalendarCheck, ShieldCheck, UserCheck, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 max-w-md mx-auto w-full">
      {/* Header */}
      <div className="pt-8 pb-6 text-center">
        <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
          <CalendarCheck className="w-9 h-9 text-white" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Attendance Portal
        </h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">
          Simple & fast daily attendance
        </p>
      </div>

      {/* Main Action Cards */}
      <div className="flex-1 flex flex-col justify-center space-y-4 my-6">
        {/* Student Check Attendance Card */}
        <Link
          href="/check-attendance"
          className="group block bg-white border-2 border-emerald-500 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <UserCheck className="w-6 h-6" />
            </div>
            <ArrowRight className="w-5 h-5 text-emerald-600 transform group-hover:translate-x-1 transition-transform" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Check Attendance
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Students: Enter your Student ID to view your attendance status and history.
          </p>
          <div className="mt-4 inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg">
            No login required
          </div>
        </Link>

        {/* Admin Login Card */}
        <Link
          href="/admin/login"
          className="group block bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-slate-300 hover:shadow-md transition-all active:scale-[0.98]"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 transform group-hover:translate-x-1 transition-transform" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Admin Portal
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Administrators: Sign in to record daily attendance, manage students, and view history.
          </p>
          <div className="mt-4 inline-flex items-center text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
            Admin login only
          </div>
        </Link>
      </div>

      {/* Footer */}
      <footer className="text-center py-4 border-t border-slate-200 text-xs text-slate-400">
        Attendance Portal &bull; Mobile-First
      </footer>
    </main>
  );
}
