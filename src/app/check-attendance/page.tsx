'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, ArrowLeft, Calendar, Clock, AlertCircle, Sparkles, Loader2, User } from 'lucide-react';
import { PublicStudentAttendanceResult } from '@/types/attendance';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDisplayDate } from '@/lib/date-utils';

export default function CheckAttendancePage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PublicStudentAttendanceResult | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setError('Please enter your Student Name or ID.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/attendance/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentCode: query.trim(),
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || 'Student not found. Please check name or ID.');
        setData(null);
      } else {
        setData(json);
        setError(null);
      }
    } catch {
      setError('Could not connect to server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setData(null);
    setQuery('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto w-full pb-10">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-20 flex items-center justify-between shadow-2xs">
        <Link
          href="/"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Home
        </Link>
        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
          Attendance Portal
        </span>
      </header>

      <main className="p-4 space-y-4 flex-1">
        {!data ? (
          /* Search Form View */
          <div className="mt-4 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-xs">
                <Search className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Check Your Attendance
              </h1>
              <p className="text-sm text-slate-600 max-w-xs mx-auto">
                Enter your Name or Student ID to see your attendance.
              </p>
            </div>

            <form onSubmit={handleSearch} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
              <div>
                <label htmlFor="student-search-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Student Name or ID
                </label>
                <input
                  id="student-search-input"
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setError(null);
                  }}
                  placeholder="e.g. Hammad or ST001"
                  autoFocus
                  className="w-full px-4 py-3.5 text-base font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:font-normal placeholder:text-slate-400"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-xl shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2 active:scale-[0.99] text-base cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    <span>Check Attendance</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Student Attendance Results View */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={handleReset}
                className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs cursor-pointer active:scale-95 transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Search Another
              </button>
              <span className="text-xs text-slate-400">
                Attendance Report
              </span>
            </div>

            {/* Student Info Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xl">
                  {data.student?.name ? data.student.name.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 leading-tight">
                    {data.student?.name}
                  </h2>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    Student ID: <span className="font-mono text-emerald-700">{data.student?.student_code}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Today's Attendance Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Today&apos;s Attendance
                  </h3>
                </div>
                {data.today ? (
                  <StatusBadge status={data.today.status} size="sm" />
                ) : (
                  <span className="text-xs font-medium text-slate-400 italic">Not marked yet</span>
                )}
              </div>

              {data.today ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">
                        Check In
                      </span>
                      <span className="text-sm font-bold text-slate-800 flex items-center gap-1 mt-0.5 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {data.today.check_in || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">
                        Check Out
                      </span>
                      <span className="text-sm font-bold text-slate-800 flex items-center gap-1 mt-0.5 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {data.today.check_out || '—'}
                      </span>
                    </div>
                  </div>

                  {data.today.notes && (
                    <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-lg">
                      <span className="font-semibold">Note:</span> {data.today.notes}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-slate-500">
                  Attendance for today has not been recorded yet.
                </div>
              )}
            </div>

            {/* This Month Summary Card */}
            {data.this_month && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    This Month
                  </h3>
                  <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{data.this_month.percentage}% Attendance</span>
                  </div>
                </div>

                {/* Stat pills */}
                <div className="grid grid-cols-4 gap-2 text-center pt-1">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2">
                    <div className="text-base font-black text-emerald-700">{data.this_month.present}</div>
                    <div className="text-[10px] font-bold text-emerald-800 uppercase mt-0.5">Present</div>
                  </div>
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-2">
                    <div className="text-base font-black text-rose-700">{data.this_month.absent}</div>
                    <div className="text-[10px] font-bold text-rose-800 uppercase mt-0.5">Absent</div>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-2">
                    <div className="text-base font-black text-amber-800">{data.this_month.late}</div>
                    <div className="text-[10px] font-bold text-amber-800 uppercase mt-0.5">Late</div>
                  </div>
                  <div className="bg-sky-50 border border-sky-100 rounded-xl p-2">
                    <div className="text-base font-black text-sky-700">{data.this_month.leave}</div>
                    <div className="text-[10px] font-bold text-sky-800 uppercase mt-0.5">Leave</div>
                  </div>
                </div>
              </div>
            )}

            {/* Attendance History Section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                History
              </h3>

              {data.history && data.history.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {data.history.map((record) => (
                    <div key={record.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-800">
                          {formatDisplayDate(record.attendance_date)}
                        </span>
                        <StatusBadge status={record.status} size="sm" />
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-mono">
                          {record.check_in || record.check_out
                            ? `${record.check_in || '—'} - ${record.check_out || '—'}`
                            : 'No Time'}
                        </span>
                        {record.notes && (
                          <span className="text-slate-400 italic text-[11px] truncate max-w-[150px]">
                            {record.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  No attendance history found.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
