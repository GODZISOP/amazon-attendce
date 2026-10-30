'use client';

import React, { useEffect, useState, useTransition } from 'react';
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
  cacheEmployeesLocally,
  getCachedEmployeesLocally,
  saveAttendanceOffline,
  getOfflineAttendanceForDate,
  getPendingOfflineCount,
  syncOfflineRecords,
} from '@/lib/offline-sync';
import {
  Save,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Loader2,
  Check,
  Search,
  Table as TableIcon,
  ListFilter,
  PlusCircle,
  Edit2,
  Share2,
  Copy,
  Printer,
  Clock,
  WifiOff,
  CloudUpload,
  Edit3,
  X,
} from 'lucide-react';

interface AttendanceDraft {
  student_id: string;
  name: string;
  student_code: string;
  status: AttendanceStatus;
  check_in_time: string;
  notes: string;
  saved: boolean;
}

function cleanTimeOnly(raw?: string | null): string {
  if (!raw) return '';
  return raw.replace(/am|pm/gi, '').trim();
}

function getCurrentTimeDigits(): string {
  const d = new Date();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

export default function AdminAttendancePage() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [employees, setEmployees] = useState<Student[]>([]);
  const [drafts, setDrafts] = useState<Record<string, AttendanceDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Quick edit modal for direct editing from the sheet
  const [editingRow, setEditingRow] = useState<AttendanceDraft | null>(null);
  const [editStatus, setEditStatus] = useState<AttendanceStatus>('Present');
  const [editTime, setEditTime] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [activeTab, setActiveTab] = useState<'entry' | 'sheet'>('entry');
  const [, startTransition] = useTransition();

  useEffect(() => {
    let initialDate = getTodayDateString();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlDate = params.get('date');
      if (urlDate) {
        initialDate = urlDate;
      }
    }
    setSelectedDate(initialDate);
    setIsOffline(!navigator.onLine);
    setPendingSyncCount(getPendingOfflineCount());

    const handleOnline = async () => {
      setIsOffline(false);
      showToast('Internet connected! Syncing offline records...', 'success');
      const res = await syncOfflineRecords();
      if (res.syncedCount > 0) {
        showToast(`Synced ${res.syncedCount} offline sheet(s) to cloud!`, 'success');
      }
      setPendingSyncCount(getPendingOfflineCount());
    };

    const handleOffline = () => {
      setIsOffline(true);
      showToast('Offline Mode: Saving locally to phone.', 'error');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const showToast = (text: string, type: 'success' | 'error') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Load employees and attendance for the chosen date (Fresh fetch without cache)
  const loadData = async (date: string) => {
    if (!date) return;
    setLoading(true);
    try {
      let empList: Student[] = [];

      try {
        const empRes = await fetch(`/api/students?t=${Date.now()}`, { cache: 'no-store' });
        const empData = await empRes.json();
        if (empData.success && empData.students?.length > 0) {
          empList = empData.students;
          cacheEmployeesLocally(empList);
        } else {
          empList = getCachedEmployeesLocally();
        }
      } catch {
        empList = getCachedEmployeesLocally();
      }

      setEmployees(empList);

      let attendanceList: any[] = [];
      let hasSaved = false;

      try {
        const attRes = await fetch(`/api/attendance?date=${date}&t=${Date.now()}`, { cache: 'no-store' });
        const attData = await attRes.json();
        if (attData.success && attData.attendance) {
          attendanceList = attData.attendance;
        }
      } catch {
        const offlineRecords = getOfflineAttendanceForDate(date);
        if (offlineRecords) {
          attendanceList = offlineRecords;
        }
      }

      const attendanceMap = new Map(attendanceList.map((a: any) => [a.student_id, a]));

      const initialDrafts: Record<string, AttendanceDraft> = {};
      empList.forEach((emp) => {
        const existing: any = attendanceMap.get(emp.id);
        if (existing) {
          hasSaved = true;
          initialDrafts[emp.id] = {
            student_id: emp.id,
            name: emp.name,
            student_code: emp.student_code,
            status: existing.status as AttendanceStatus,
            check_in_time: cleanTimeOnly(existing.check_in),
            notes: existing.notes || '',
            saved: true,
          };
        } else {
          initialDrafts[emp.id] = {
            student_id: emp.id,
            name: emp.name,
            student_code: emp.student_code,
            status: 'Present',
            check_in_time: '',
            notes: '',
            saved: false,
          };
        }
      });

      setDrafts(initialDrafts);

      // If records already saved for this date, open sheet view; otherwise entry view
      if (hasSaved) {
        setActiveTab('sheet');
      } else {
        setActiveTab('entry');
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      loadData(selectedDate);
    }
  }, [selectedDate]);

  // Handle status selection in entry view
  const handleStatusChange = (empId: string, status: AttendanceStatus) => {
    setDrafts((prev) => {
      const current = prev[empId];
      if (!current) return prev;

      let newTime = current.check_in_time;
      if ((status === 'Present' || status === 'Late') && !current.check_in_time.trim()) {
        newTime = getCurrentTimeDigits();
      } else if (status === 'Absent') {
        newTime = '';
      }

      return {
        ...prev,
        [empId]: {
          ...current,
          status,
          check_in_time: newTime,
          saved: false,
        },
      };
    });
  };

  // Quick fill time
  const handleFillNow = (empId: string) => {
    setDrafts((prev) => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        check_in_time: getCurrentTimeDigits(),
        saved: false,
      },
    }));
  };

  // Mark all present
  const handleMarkAllPresent = () => {
    const nowTime = getCurrentTimeDigits();
    setDrafts((prev) => {
      const updated: Record<string, AttendanceDraft> = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[id] = {
          ...updated[id],
          status: 'Present',
          check_in_time: updated[id].check_in_time || nowTime,
          saved: false,
        };
      });
      return updated;
    });
    showToast('All marked Present with PM timing', 'success');
  };

  // SAVE ATTENDANCE (UPDATES OLD RECORD FOR THE SELECTED DATE)
  const handleSaveAttendance = async () => {
    if (!selectedDate) return;
    setSavingAttendance(true);

    const records = Object.values(drafts).map((d) => ({
      student_id: d.student_id,
      status: d.status,
      check_in: d.check_in_time.trim() ? `${d.check_in_time.trim()} PM` : null,
      notes: d.notes.trim() || null,
    }));

    if (records.length === 0) {
      setSavingAttendance(false);
      return;
    }

    if (!navigator.onLine) {
      saveAttendanceOffline(selectedDate, records);
      setPendingSyncCount(getPendingOfflineCount());
      startTransition(() => {
        setDrafts((prev) => {
          const updated: Record<string, AttendanceDraft> = {};
          Object.keys(prev).forEach((id) => {
            updated[id] = { ...prev[id], saved: true };
          });
          return updated;
        });
        setActiveTab('sheet');
      });
      showToast('Saved Offline! Will sync when internet is back.', 'success');
      setSavingAttendance(false);
      return;
    }

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          records,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Server error');

      startTransition(() => {
        setDrafts((prev) => {
          const updated: Record<string, AttendanceDraft> = {};
          Object.keys(prev).forEach((id) => {
            updated[id] = { ...prev[id], saved: true };
          });
          return updated;
        });
        setActiveTab('sheet');
      });

      showToast('Attendance Saved! Sheet updated.', 'success');
    } catch {
      saveAttendanceOffline(selectedDate, records);
      setPendingSyncCount(getPendingOfflineCount());
      startTransition(() => {
        setDrafts((prev) => {
          const updated: Record<string, AttendanceDraft> = {};
          Object.keys(prev).forEach((id) => {
            updated[id] = { ...prev[id], saved: true };
          });
          return updated;
        });
        setActiveTab('sheet');
      });
      showToast('Saved Offline safely on your phone!', 'success');
    } finally {
      setSavingAttendance(false);
    }
  };

  // Direct single row edit from Attendance Sheet
  const openDirectEdit = (draft: AttendanceDraft) => {
    setEditingRow(draft);
    setEditStatus(draft.status);
    setEditTime(draft.check_in_time);
  };

  const handleSaveDirectEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow || !selectedDate) return;

    setSavingEdit(true);
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
      if (!res.ok || !json.success) throw new Error(json.error);

      // Update in local state
      setDrafts((prev) => ({
        ...prev,
        [editingRow.student_id]: {
          ...prev[editingRow.student_id],
          status: editStatus,
          check_in_time: editTime.trim(),
          saved: true,
        },
      }));

      setEditingRow(null);
      showToast('Timing updated successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not update timing', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const filteredEmployees = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.student_code.toLowerCase().includes(search.toLowerCase())
  );

  const statuses: AttendanceStatus[] = ['Present', 'Absent', 'Late', 'Leave'];

  const getButtonStyles = (status: AttendanceStatus, isSelected: boolean) => {
    if (!isSelected) {
      return 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50';
    }

    switch (status) {
      case 'Present':
        return 'bg-emerald-600 text-white border-emerald-600 shadow-xs';
      case 'Absent':
        return 'bg-rose-600 text-white border-rose-600 shadow-xs';
      case 'Late':
        return 'bg-amber-600 text-white border-amber-600 shadow-xs';
      case 'Leave':
        return 'bg-sky-600 text-white border-sky-600 shadow-xs';
      default:
        return 'bg-slate-900 text-white border-slate-900';
    }
  };

  const draftList = Object.values(drafts);
  const presentCount = draftList.filter((d) => d.status === 'Present').length;
  const absentCount = draftList.filter((d) => d.status === 'Absent').length;
  const lateCount = draftList.filter((d) => d.status === 'Late').length;
  const leaveCount = draftList.filter((d) => d.status === 'Leave').length;

  const generateShareableReport = () => {
    const fullDate = selectedDate ? formatFullDayDate(selectedDate) : 'Today';
    let text = `📋 *EMPLOYEE ATTENDANCE SHEET*\n`;
    text += `📅 Date: ${fullDate}\n`;
    text += `👥 Total Employees: ${employees.length}\n`;
    text += `✅ Present: ${presentCount} | ❌ Absent: ${absentCount} | ⏳ Late: ${lateCount}\n\n`;
    text += `─────────────────────\n`;

    employees.forEach((emp, idx) => {
      const d = drafts[emp.id];
      const statusIcon =
        d?.status === 'Present' ? '✅' : d?.status === 'Absent' ? '❌' : d?.status === 'Late' ? '⏳' : 'ℹ️';
      const timeStr = d?.check_in_time ? `(${d.check_in_time} PM)` : '';
      text += `${idx + 1}. ${emp.name} [${emp.student_code}] - ${statusIcon} ${d?.status || 'Present'} ${timeStr}\n`;
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
    showToast('Attendance Sheet copied!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto w-full pb-36 print:pb-0 print:bg-white print:max-w-none">
        {/* Offline Banner */}
        {isOffline && (
          <div className="bg-amber-500 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-xs print:hidden">
            <div className="flex items-center gap-1.5">
              <WifiOff className="w-4 h-4" />
              <span>Offline Mode: Attendance will save locally</span>
            </div>
          </div>
        )}

        {pendingSyncCount > 0 && !isOffline && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-xs print:hidden">
            <div className="flex items-center gap-1.5">
              <CloudUpload className="w-4 h-4 animate-bounce" />
              <span>{pendingSyncCount} sheet(s) waiting to sync</span>
            </div>
            <button
              onClick={async () => {
                const res = await syncOfflineRecords();
                if (res.syncedCount > 0) showToast(`Synced ${res.syncedCount} sheet(s)!`, 'success');
                setPendingSyncCount(getPendingOfflineCount());
              }}
              className="bg-white text-emerald-800 px-2.5 py-0.5 rounded-md text-[11px] font-black cursor-pointer"
            >
              Sync Now
            </button>
          </div>
        )}

        {/* Header */}
        <div className="print:hidden">
          <AdminHeader
            title="Attendance"
            subtitle={selectedDate ? formatFullDayDate(selectedDate) : 'Today'}
            action={
              <button
                onClick={handleMarkAllPresent}
                title="Mark All Present"
                className="text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                All Present
              </button>
            }
          />
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 w-11/12 max-w-md animate-bounce print:hidden">
            <div
              className={`p-3.5 rounded-2xl shadow-lg border flex items-center justify-center gap-2 text-sm font-bold ${
                toastMessage.type === 'success'
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-rose-600 text-white border-rose-500'
              }`}
            >
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0" />
              )}
              <span>{toastMessage.text}</span>
            </div>
          </div>
        )}

        <main className="p-4 space-y-4">
          {/* DATE SELECTOR BAR (ANY DATE CAN BE SELECTED AND EDITED) */}
          <div className="bg-white border-2 border-emerald-500/40 rounded-2xl p-3 shadow-2xs flex items-center justify-between print:hidden">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <label htmlFor="att-date-input" className="text-xs font-black text-slate-800 uppercase">
                Select Date:
              </label>
            </div>
            <input
              id="att-date-input"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-extrabold font-mono text-emerald-950 bg-emerald-50/70 border border-emerald-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            />
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1.5 bg-slate-200/70 p-1 rounded-xl print:hidden">
            <button
              type="button"
              onClick={() => setActiveTab('entry')}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'entry'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListFilter className="w-4 h-4" />
              <span>Mark Attendance</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sheet')}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'sheet'
                  ? 'bg-white text-emerald-700 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-4 h-4" />
              <span>Attendance Sheet</span>
            </button>
          </div>

          {/* Quick Stats Strip */}
          <div className="grid grid-cols-4 gap-2 text-center">
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
              placeholder="Search employee in this date..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
          </div>

          {/* Main Content Area */}
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
              <p className="text-xs">Loading attendance for {selectedDate ? formatDisplayDate(selectedDate) : ''}...</p>
            </div>
          ) : employees.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
              <p className="text-sm font-semibold text-slate-700">No employees saved yet</p>
              <p className="text-xs text-slate-400">
                Add employees once in the Employees section.
              </p>
              <Link
                href="/admin/students"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                Go to Employees Page
              </Link>
            </div>
          ) : activeTab === 'entry' ? (
            /* ==============================================================
               MODE 1: ENTRY CARDS FOR SELECTED DATE
               ============================================================== */
            <div className="space-y-4">
              {filteredEmployees.map((emp) => {
                const draft = drafts[emp.id] || {
                  student_id: emp.id,
                  name: emp.name,
                  student_code: emp.student_code,
                  status: 'Present',
                  check_in_time: '',
                  notes: '',
                  saved: false,
                };

                return (
                  <div
                    key={emp.id}
                    className={`bg-white border rounded-2xl p-4 shadow-2xs transition-all ${
                      draft.saved ? 'border-slate-200' : 'border-amber-300 ring-1 ring-amber-200'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                          {emp.name}
                        </h3>
                        <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block mt-0.5">
                          {emp.student_code}
                        </span>
                      </div>
                      <div>
                        {draft.saved ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <Check className="w-3 h-3" /> Saved
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                            Pending Save
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status selection */}
                    <div className="pt-3">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                        Status
                      </span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {statuses.map((status) => {
                          const isSelected = draft.status === status;
                          return (
                            <button
                              key={status}
                              type="button"
                              onClick={() => handleStatusChange(emp.id, status)}
                              className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all active:scale-95 cursor-pointer text-center ${getButtonStyles(
                                status,
                                isSelected
                              )}`}
                            >
                              {status}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Check In Time */}
                    <div className="pt-3">
                      <div className="flex items-center justify-between mb-1">
                        <label
                          htmlFor={`time-${emp.id}`}
                          className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"
                        >
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Check In Timing (PM)
                        </label>
                        <button
                          type="button"
                          onClick={() => handleFillNow(emp.id)}
                          className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md cursor-pointer"
                        >
                          Now
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          id={`time-${emp.id}`}
                          type="text"
                          value={draft.check_in_time}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [emp.id]: {
                                ...prev[emp.id],
                                check_in_time: e.target.value,
                                saved: false,
                              },
                            }))
                          }
                          placeholder="09:00"
                          className="flex-1 px-3 py-2 text-sm font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <span className="px-3 py-2 bg-slate-100 text-slate-800 font-black text-xs rounded-xl border border-slate-200">
                          PM
                        </span>
                      </div>
                    </div>

                    {/* Notes Optional */}
                    <div className="pt-2">
                      <input
                        type="text"
                        value={draft.notes}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [emp.id]: {
                              ...prev[emp.id],
                              notes: e.target.value,
                              saved: false,
                            },
                          }))
                        }
                        placeholder="Notes (optional)"
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ==============================================================
               MODE 2: ATTENDANCE SHEET (WITH DIRECT INLINE EDITING)
               ============================================================== */
            <div className="space-y-4">
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

              {/* Sheet Card */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden print:border-none print:shadow-none">
                <div className="p-4 bg-slate-900 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-extrabold block">
                        Employee Attendance Sheet
                      </span>
                      <h2 className="text-lg font-black mt-0.5">
                        {selectedDate ? formatFullDayDate(selectedDate) : 'Today'}
                      </h2>
                    </div>
                    <button
                      onClick={() => setActiveTab('entry')}
                      className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer print:hidden"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit All Timings
                    </button>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-3 text-center text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase block">Total</span>
                      <span className="font-extrabold text-white text-sm">{employees.length}</span>
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

                <div className="divide-y divide-slate-100">
                  {filteredEmployees.map((emp, index) => {
                    const draft = drafts[emp.id] || {
                      student_id: emp.id,
                      name: emp.name,
                      student_code: emp.student_code,
                      status: 'Present',
                      check_in_time: '',
                      notes: '',
                      saved: false,
                    };

                    const checkInDisplay = draft.check_in_time
                      ? `${draft.check_in_time} PM`
                      : '--';

                    return (
                      <div key={emp.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono font-bold text-slate-400 w-5">
                            {index + 1}.
                          </span>
                          <div>
                            <div className="font-extrabold text-sm text-slate-900 leading-tight">
                              {emp.name}
                            </div>
                            <div className="font-mono text-xs font-semibold text-emerald-700">
                              {emp.student_code}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Check In</span>
                            <span className="font-mono text-xs font-bold text-slate-700">
                              {checkInDisplay}
                            </span>
                          </div>
                          <StatusBadge status={draft.status || 'Present'} size="sm" />
                          {/* Direct edit button right in the sheet! */}
                          <button
                            onClick={() => openDirectEdit(draft)}
                            title="Edit this employee"
                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors print:hidden"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Big "Save Attendance" Bottom Action Bar */}
        <div className="fixed bottom-16 left-0 right-0 z-30 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg print:hidden">
          <div className="max-w-md mx-auto">
            <button
              onClick={handleSaveAttendance}
              disabled={savingAttendance || loading || employees.length === 0}
              className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-black text-base rounded-2xl shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
            >
              {savingAttendance ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Saving Attendance...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Save Attendance ({selectedDate ? formatDisplayDate(selectedDate) : 'Today'})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Edit Modal (Opened directly from Sheet) */}
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

              <form onSubmit={handleSaveDirectEdit} className="space-y-4">
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
                  <label htmlFor="modal-edit-time" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Check In Time (PM)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="modal-edit-time"
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
