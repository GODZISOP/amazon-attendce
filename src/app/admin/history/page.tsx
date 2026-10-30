'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminGuard } from '@/components/AdminGuard';
import { AdminHeader } from '@/components/AdminHeader';
import { AdminBottomNav } from '@/components/AdminBottomNav';
import { StatusBadge } from '@/components/StatusBadge';
import { Student, AttendanceStatus } from '@/types/attendance';
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
  ChevronRight,
  ArrowLeft,
  Share2,
  Copy,
  Printer,
  Edit2,
} from 'lucide-react';

interface SheetSummary {
  date: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
}

export default function AdminHistoryPage() {
  const [sheets, setSheets] = useState<SheetSummary[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dateRecords, setDateRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit Modal State
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState<AttendanceStatus>('Present');
  const [editTime, setEditTime] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load all recorded sheets (latest on top)
  const fetchAllSheets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance?t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      const records = data.records || [];

      // Group records by attendance_date
      const map: Record<string, { present: number; absent: number; late: number; leave: number; total: number }> = {};
      records.forEach((r: any) => {
        const d = r.attendance_date;
        if (!map[d]) {
          map[d] = { present: 0, absent: 0, late: 0, leave: 0, total: 0 };
        }
        map[d].total += 1;
        if (r.status === 'Present') map[d].present += 1;
        else if (r.status === 'Absent') map[d].absent += 1;
        else if (r.status === 'Late') map[d].late += 1;
        else if (r.status === 'Leave') map[d].leave += 1;
      });

      // Sort dates with latest on top
      const sortedDates = Object.keys(map).sort((a, b) => b.localeCompare(a));
      const summaryList: SheetSummary[] = sortedDates.map((date) => ({
        date,
        total: map[date].total,
        present: map[date].present,
        absent: map[date].absent,
        late: map[date].late,
        leave: map[date].leave,
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
        fetch(`/api/students?t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/attendance?date=${date}&t=${Date.now()}`, { cache: 'no-store' }),
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

      // Update state locally
      setDateRecords((prev) =>
        prev.map((r) =>
          r.student_id === editingRow.student_id
            ? { ...r, status: editStatus, check_in: checkInFull || '' }
            : r
        )
      );

      setEditingRow(null);
      showToast('Record updated successfully!');
      fetchAllSheets();
    } catch (err: any) {
      setEditError(err.message || 'Could not update record');
    } finally {
      setSavingEdit(false);
    }
  };

  // Calculate current sheet statistics
  const presentCount = dateRecords.filter((r) => r.status === 'Present').length;
  const absentCount = dateRecords.filter((r) => r.status === 'Absent').length;
  const lateCount = dateRecords.filter((r) => r.status === 'Late').length;
  const leaveCount = dateRecords.filter((r) => r.status === 'Leave').length;

  // Generate shareable report
  const generateShareableReport = () => {
    const fullDate = selectedDate ? formatFullDayDate(selectedDate) : 'Today';
    let text = `📋 *EMPLOYEE ATTENDANCE SHEET*\n`;
    text += `📅 Date: ${fullDate}\n`;
    text += `👥 Total Employees: ${dateRecords.length}\n`;
    text += `✅ Present: ${presentCount} | ❌ Absent: ${absentCount} | ⏳ Late: ${lateCount}\n\n`;
    text += `─────────────────────\n`;

    dateRecords.forEach((emp, idx) => {
      const statusIcon =
        emp.status === 'Present' ? '✅' : emp.status === 'Absent' ? '❌' : emp.status === 'Late' ? '⏳' : 'ℹ️';
      const timeStr = emp.check_in ? `(${emp.check_in})` : '';
      text += `${idx + 1}. ${emp.name} [${emp.student_code}] - ${statusIcon} ${emp.status || 'Present'} ${timeStr}\n`;
    });

    text += `─────────────────────\n`;
    text += `Generated via Attendance Portal`;
    return text;
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(generateShareableReport());
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleCopyReport = () => {
    const text = generateShareableReport();
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Attendance Sheet copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
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
      <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto w-full pb-24 print:pb-0 print:bg-white print:max-w-none">
        {/* Header */}
        <div className="print:hidden">
          <AdminHeader
            title={selectedDate ? 'Attendance Sheet' : 'Attendance History'}
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
                  All Sheets
                </button>
              ) : null
            }
          />
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 w-11/12 max-w-md animate-bounce print:hidden">
            <div className="p-3.5 rounded-2xl shadow-lg border bg-emerald-600 text-white border-emerald-500 flex items-center justify-center gap-2 text-sm font-bold">
              <Check className="w-5 h-5 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          </div>
        )}

        <main className="p-4 space-y-4">
          {!selectedDate ? (
            /* ==============================================================
               VIEW ALL SHEETS: LATEST ON TOP WITH ORGANIZED COUNTS
               ============================================================== */
            <div className="space-y-4">
              {/* Search Box */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search sheets by date or day..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                />
              </div>

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
               MATCHING EXACT ATTENDANCE SHEET DESIGN
               ============================================================== */
            <div className="space-y-4">
              {/* Back button & counter */}
              <div className="flex items-center justify-between print:hidden">
                <button
                  onClick={() => setSelectedDate(null)}
                  className="inline-flex items-center text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-xl cursor-pointer shadow-2xs transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  All Sheets
                </button>
                <span className="text-xs text-slate-500 font-mono font-bold">
                  {dateRecords.length} Employees
                </span>
              </div>

              {/* Quick Stats Strip */}
              <div className="grid grid-cols-4 gap-2 text-center print:hidden">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2">
                  <div className="text-sm font-black text-emerald-700">{presentCount}</div>
                  <div className="text-[10px] font-bold text-emerald-800 uppercase">Present</div>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-2">
                  <div className="text-sm font-black text-rose-700">{absentCount}</div>
                  <div className="text-[10px] font-bold text-rose-800 uppercase">Absent</div>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-2">
                  <div className="text-sm font-black text-amber-800">{lateCount}</div>
                  <div className="text-[10px] font-bold text-amber-800 uppercase">Late</div>
                </div>
                <div className="bg-sky-50 border border-sky-100 rounded-xl p-2">
                  <div className="text-sm font-black text-sky-700">{leaveCount}</div>
                  <div className="text-[10px] font-bold text-sky-800 uppercase">Leave</div>
                </div>
              </div>

              {/* Search Box */}
              <div className="relative print:hidden">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search employee in this sheet..."
                  className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                />
              </div>

              {/* Share Toolbar */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex items-center justify-between print:hidden">
                <span className="text-xs font-bold text-slate-700">Share Sheet:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleShareWhatsApp}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    WhatsApp
                  </button>
                  <button
                    onClick={handleCopyReport}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer active:scale-95 transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                    title="Print Sheet"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Sheet Card - Identical Dark Banner & Rows */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden print:border-none print:shadow-none">
                {/* Dark Banner */}
                <div className="p-4 bg-slate-900 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-extrabold block">
                        Employee Attendance Sheet
                      </span>
                      <h2 className="text-lg font-black mt-0.5">
                        {selectedDate ? formatFullDayDate(selectedDate) : ''}
                      </h2>
                    </div>
                    <Link
                      href={`/admin/attendance?date=${selectedDate}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer print:hidden"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit Entire Sheet
                    </Link>
                  </div>

                  {/* Summary Bar inside banner */}
                  <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-3 text-center text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase block">Total</span>
                      <span className="font-extrabold text-white text-sm">{dateRecords.length}</span>
                    </div>
                    <div>
                      <span className="text-emerald-400 text-[10px] uppercase block">Present</span>
                      <span className="font-extrabold text-emerald-400 text-sm">{presentCount}</span>
                    </div>
                    <div>
                      <span className="text-rose-400 text-[10px] uppercase block">Absent</span>
                      <span className="font-extrabold text-rose-400 text-sm">{absentCount}</span>
                    </div>
                  </div>
                </div>

                {/* Rows with CHECK IN label and timing */}
                <div className="divide-y divide-slate-100">
                  {filteredRecords.map((r, index) => (
                    <div key={r.student_id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-slate-400 w-5">
                          {index + 1}.
                        </span>
                        <div>
                          <div className="font-extrabold text-sm text-slate-900 leading-tight">
                            {r.name}
                          </div>
                          <div className="font-mono text-xs font-semibold text-emerald-700">
                            {r.student_code}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Check In</span>
                          <span className="font-mono text-xs font-bold text-slate-700">
                            {r.check_in ? r.check_in : '--'}
                          </span>
                        </div>
                        <StatusBadge status={r.status || 'Present'} size="sm" />
                        <button
                          onClick={() => openEdit(r)}
                          title="Edit this employee"
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition-all active:scale-95 print:hidden"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
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
                    Edit {editingRow.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Date: {selectedDate ? formatFullDayDate(selectedDate) : ''}
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

                <div>
                  <label htmlFor="edit-time-history" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Check In Time (PM)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="edit-time-history"
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
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bottom Nav */}
        <div className="print:hidden">
          <AdminBottomNav />
        </div>
      </div>
    </AdminGuard>
  );
}
