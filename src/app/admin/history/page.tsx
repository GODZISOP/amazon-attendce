'use client';

import React, { useEffect, useState } from 'react';
import { AdminGuard } from '@/components/AdminGuard';
import { AdminHeader } from '@/components/AdminHeader';
import { AdminBottomNav } from '@/components/AdminBottomNav';
import { StatusBadge } from '@/components/StatusBadge';
import { Student, AttendanceStatus, AttendanceRecord } from '@/types/attendance';
import {
  getTodayDateString,
  formatFullDayDate,
  formatDisplayDate,
} from '@/lib/date-utils';
import {
  Calendar,
  Search,
  Clock,
  Edit3,
  X,
  Check,
  Loader2,
  AlertCircle,
  FileText,
  ChevronRight,
  ArrowLeft,
  Share2,
} from 'lucide-react';

interface SheetSummary {
  date: string;
  total: number;
  present: number;
  absent: number;
  late: number;
}

export default function AdminHistoryPage() {
  const [sheets, setSheets] = useState<SheetSummary[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dateRecords, setDateRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Edit Modal State
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState<AttendanceStatus>('Present');
  const [editTime, setEditTime] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Load all recorded sheets (latest on top)
  const fetchAllSheets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/attendance');
      const data = await res.json();
      const records = data.records || [];

      // Group records by attendance_date
      const map: Record<string, { present: number; absent: number; late: number; total: number }> = {};
      records.forEach((r: any) => {
        const d = r.attendance_date;
        if (!map[d]) {
          map[d] = { present: 0, absent: 0, late: 0, total: 0 };
        }
        map[d].total += 1;
        if (r.status === 'Present') map[d].present += 1;
        else if (r.status === 'Absent') map[d].absent += 1;
        else if (r.status === 'Late') map[d].late += 1;
      });

      // Sort dates with latest on top
      const sortedDates = Object.keys(map).sort((a, b) => b.localeCompare(a));
      const summaryList: SheetSummary[] = sortedDates.map((date) => ({
        date,
        total: map[date].total,
        present: map[date].present,
        absent: map[date].absent,
        late: map[date].late,
      }));

      setSheets(summaryList);
    } catch (err) {
      console.error('Failed to load history sheets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllSheets();
  }, []);

  // When a specific date sheet is clicked, load all employee records for that date
  const openSheetForDate = async (date: string) => {
    setSelectedDate(date);
    setLoading(true);
    try {
      const [empRes, attRes] = await Promise.all([
        fetch('/api/students'),
        fetch(`/api/attendance?date=${date}`),
      ]);
      const empData = await empRes.json();
      const attData = await attRes.json();

      const emps: Student[] = empData.students || [];
      const atts: any[] = attData.attendance || [];
      const attMap = new Map(atts.map((a: any) => [a.student_id, a]));

      const combined = emps.map((emp) => {
        const a = attMap.get(emp.id);
        return {
          student_id: emp.id,
          name: emp.name,
          student_code: emp.student_code,
          status: a?.status || 'Present',
          check_in: a?.check_in || '',
          notes: a?.notes || '',
        };
      });

      setDateRecords(combined);
    } catch (err) {
      console.error('Failed to load date records:', err);
    } finally {
      setLoading(false);
    }
  };

  // Edit single employee timing/status on past date
  const openEdit = (row: any) => {
    setEditingRow(row);
    setEditStatus(row.status || 'Present');
    setEditTime((row.check_in || '').replace(/am|pm/gi, '').trim());
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow || !selectedDate) return;

    setSavingEdit(true);
    setEditError(null);

    const checkInFull = editTime.trim() ? `${editTime.trim()} PM` : null;

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          records: [
            {
              student_id: editingRow.student_id,
              status: editStatus,
              check_in: checkInFull,
              notes: editingRow.notes || null,
            },
          ],
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to update');

      setEditingRow(null);
      openSheetForDate(selectedDate);
    } catch (err: any) {
      setEditError(err.message || 'Could not update record');
    } finally {
      setSavingEdit(false);
    }
  };

  // Filter sheets by date search
  const filteredSheets = sheets.filter(
    (s) => s.date.includes(search) || formatFullDayDate(s.date).toLowerCase().includes(search.toLowerCase())
  );

  // Filter records in current sheet by employee name or code
  const filteredRecords = dateRecords.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.student_code.toLowerCase().includes(search.toLowerCase())
  );

  const statuses: AttendanceStatus[] = ['Present', 'Absent', 'Late', 'Leave'];

  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto w-full pb-24">
        {/* Header */}
        <AdminHeader
          title={selectedDate ? 'Sheet Details' : 'Attendance History'}
          subtitle={selectedDate ? formatFullDayDate(selectedDate) : `${sheets.length} Sheets Saved`}
          action={
            selectedDate ? (
              <button
                onClick={() => {
                  setSelectedDate(null);
                  fetchAllSheets();
                }}
                className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl cursor-pointer"
              >
                Back to Sheets
              </button>
            ) : null
          }
        />

        <main className="p-4 space-y-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={selectedDate ? 'Search employee in this sheet...' : 'Search sheets by date or day...'}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
          </div>

          {!selectedDate ? (
            /* ==============================================================
               VIEW ALL SHEETS: LATEST ON TOP WITH ORGANIZED COUNTS
               ============================================================== */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                <span>All Saved Sheets (Latest First)</span>
                <span>{filteredSheets.length} Total</span>
              </div>

              {loading ? (
                <div className="py-16 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                  <p className="text-xs">Loading attendance sheets...</p>
                </div>
              ) : filteredSheets.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
                  <p className="text-sm font-semibold">No attendance sheets yet</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Mark and save attendance in the Attendance tab first.
                  </p>
                </div>
              ) : (
                filteredSheets.map((s) => (
                  <button
                    key={s.date}
                    onClick={() => openSheetForDate(s.date)}
                    className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-4 shadow-2xs text-left transition-all active:scale-[0.99] cursor-pointer flex items-center justify-between group"
                  >
                    <div>
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md uppercase">
                        {s.date === getTodayDateString() ? 'Today' : formatDisplayDate(s.date)}
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900 mt-1">
                        {formatFullDayDate(s.date)}
                      </h3>
                      <div className="flex items-center gap-3 mt-1.5 text-xs">
                        <span className="text-emerald-700 font-bold">
                          {s.present} Present
                        </span>
                        <span className="text-rose-700 font-bold">
                          {s.absent} Absent
                        </span>
                        <span className="text-amber-800 font-bold">
                          {s.late} Late
                        </span>
                      </div>
                    </div>

                    <div className="w-8 h-8 rounded-xl bg-slate-50 group-hover:bg-slate-900 group-hover:text-white flex items-center justify-center transition-colors text-slate-400">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            /* ==============================================================
               VIEW SINGLE SHEET DETAILS + EDIT OPTION
               ============================================================== */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedDate(null)}
                  className="inline-flex items-center text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl cursor-pointer shadow-2xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  All Sheets
                </button>
                <span className="text-xs text-slate-500 font-mono">
                  {filteredRecords.length} Employees
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 shadow-2xs overflow-hidden">
                {filteredRecords.map((r, idx) => (
                  <div key={r.student_id} className="p-3.5 flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-sm text-slate-900">
                        {idx + 1}. {r.name}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-emerald-700 font-bold">{r.student_code}</span>
                        <span>&bull;</span>
                        <span className="font-mono">
                          {r.check_in ? r.check_in : 'No Time'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={r.status} size="sm" />
                      <button
                        onClick={() => openEdit(r)}
                        className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                        title="Edit Timing"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Edit Record Modal */}
        {editingRow && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
            <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Edit Employee Timing
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingRow.name} &bull; {selectedDate ? formatDisplayDate(selectedDate) : ''}
                  </p>
                </div>
                <button
                  onClick={() => setEditingRow(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {editError && (
                <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <span>{editError}</span>
                </div>
              )}

              <form onSubmit={handleSaveEdit} className="space-y-4">
                {/* Status Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {statuses.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setEditStatus(s)}
                        className={`py-2 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                          editStatus === s
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timing (User types digits only, PM fixed) */}
                <div>
                  <label htmlFor="edit-time-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Check In Time (PM)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="edit-time-input"
                      type="text"
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                      placeholder="09:00"
                      className="flex-1 px-3 py-2 text-sm font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="px-3 py-2 bg-slate-100 text-slate-800 font-black text-xs rounded-xl border border-slate-200">
                      PM
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingRow(null)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-200 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {savingEdit ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save Edit</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bottom Nav */}
        <AdminBottomNav />
      </div>
    </AdminGuard>
  );
}
