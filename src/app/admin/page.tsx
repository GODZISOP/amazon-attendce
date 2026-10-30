'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminGuard } from '@/components/AdminGuard';
import { AdminHeader } from '@/components/AdminHeader';
import { AdminBottomNav } from '@/components/AdminBottomNav';
import { formatFullDayDate, getTodayDateString } from '@/lib/date-utils';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ClipboardCheck,
  History,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [todayStr, setTodayStr] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [presentToday, setPresentToday] = useState(0);
  const [absentToday, setAbsentToday] = useState(0);
  const [lateToday, setLateToday] = useState(0);

  useEffect(() => {
    const today = getTodayDateString();
    setTodayStr(today);
    fetchDashboardData(today);
  }, []);

  const fetchDashboardData = async (dateParam?: string) => {
    const date = dateParam || todayStr || getTodayDateString();
    setLoading(true);
    try {
      // 1. Fetch total employees count from API
      const empRes = await fetch('/api/students');
      const empData = await empRes.json();
      if (empData.success && empData.students) {
        setTotalEmployees(empData.students.length);
      }

      // 2. Fetch today's attendance records from API
      const attRes = await fetch(`/api/attendance?date=${date}`);
      const attData = await attRes.json();
      if (attData.success && attData.attendance) {
        const attList = attData.attendance;
        setPresentToday(attList.filter((a: any) => a.status === 'Present').length);
        setAbsentToday(attList.filter((a: any) => a.status === 'Absent').length);
        setLateToday(attList.filter((a: any) => a.status === 'Late').length);
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto w-full pb-24">
        {/* Header */}
        <AdminHeader
          title="Admin"
          subtitle="Attendance Portal"
          action={
            <button
              onClick={() => fetchDashboardData()}
              title="Refresh"
              className="p-2 text-slate-400 hover:text-slate-800 rounded-lg cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          }
        />

        <main className="p-4 space-y-5">
          {/* Today's Date Banner */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Today
              </span>
              <h2 className="text-base font-extrabold text-slate-900 mt-0.5">
                {todayStr ? formatFullDayDate(todayStr) : 'Today'}
              </h2>
            </div>
            <Link
              href="/admin/attendance"
              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg hover:bg-emerald-100 transition-colors"
            >
              Mark Now
            </Link>
          </div>

          {/* 4 Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Total Employees */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Total</span>
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-3xl font-black text-slate-900">
                {loading ? '—' : totalEmployees}
              </div>
              <span className="text-xs text-slate-400 mt-1 block">Employees</span>
            </div>

            {/* Present Today */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-emerald-800 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Present</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-3xl font-black text-emerald-700">
                {loading ? '—' : presentToday}
              </div>
              <span className="text-xs text-emerald-700 mt-1 block">Today</span>
            </div>

            {/* Absent Today */}
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-rose-800 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Absent</span>
                <XCircle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-3xl font-black text-rose-700">
                {loading ? '—' : absentToday}
              </div>
              <span className="text-xs text-rose-700 mt-1 block">Today</span>
            </div>

            {/* Late Today */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-amber-900 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Late</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-3xl font-black text-amber-800">
                {loading ? '—' : lateToday}
              </div>
              <span className="text-xs text-amber-800 mt-1 block">Today</span>
            </div>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              Actions
            </h3>

            {/* Mark Attendance (Primary) */}
            <Link
              href="/admin/attendance"
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white p-4 rounded-2xl shadow-md shadow-emerald-200 flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <ClipboardCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-base font-black">Mark Attendance</h4>
                  <p className="text-xs text-emerald-100">Take employee attendance for today</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5" />
            </Link>

            {/* Employees */}
            <Link
              href="/admin/students"
              className="w-full bg-white border border-slate-200 hover:border-slate-300 active:scale-[0.99] p-4 rounded-2xl shadow-sm flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Employees</h4>
                  <p className="text-xs text-slate-500">Add, edit, or remove employees</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>

            {/* History */}
            <Link
              href="/admin/history"
              className="w-full bg-white border border-slate-200 hover:border-slate-300 active:scale-[0.99] p-4 rounded-2xl shadow-sm flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">History & Sheets</h4>
                  <p className="text-xs text-slate-500">View and edit saved attendance sheets</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <AdminBottomNav />
      </div>
    </AdminGuard>
  );
}
