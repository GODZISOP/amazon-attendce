'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, ArrowLeft, KeyRound, AlertCircle, ArrowRight } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const entered = password.trim();

    if (entered === '25801') {
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_logged_in', 'true');
      }
      router.push('/admin');
    } else {
      setError('Wrong password. Please enter 25801');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between max-w-md mx-auto w-full p-4 sm:p-6">
      {/* Top Bar */}
      <header className="flex items-center justify-between pt-2">
        <Link
          href="/"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Home
        </Link>
        <span className="text-xs font-bold text-slate-700 bg-slate-200 px-2.5 py-1 rounded-full">
          Admin Portal
        </span>
      </header>

      {/* Main Login Card */}
      <main className="my-auto py-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Admin Login
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Enter Admin Password to continue
          </p>
        </div>

        <form onSubmit={handleLogin} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="admin-password"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2"
            >
              Password
            </label>
            <div className="relative">
              <KeyRound className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                id="admin-password"
                type="password"
                inputMode="numeric"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="25801"
                required
                autoFocus
                className="w-full pl-11 pr-4 py-3.5 text-lg font-mono tracking-widest bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 px-4 bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.99] text-base cursor-pointer"
          >
            <span>Login</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 pb-2">
        Simple Attendance Admin
      </footer>
    </div>
  );
}
