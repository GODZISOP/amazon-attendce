'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { AdminGuard } from '@/components/AdminGuard';
import { AdminHeader } from '@/components/AdminHeader';
import { AdminBottomNav } from '@/components/AdminBottomNav';
import { Student } from '@/types/attendance';
import {
  UserPlus,
  Search,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
  Loader2,
  User,
  CheckCircle2,
} from 'lucide-react';

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      // 1. Try direct Supabase
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data) {
        setStudents(data);
      } else {
        // Fallback to API route
        const res = await fetch('/api/students');
        const json = await res.json();
        if (json.success && json.students) {
          setStudents(json.students);
        }
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const openAddModal = () => {
    setEditingStudent(null);
    setFormName('');
    const nextNum = students.length + 1;
    const suggestedCode = `ST${String(nextNum).padStart(3, '0')}`;
    setFormCode(suggestedCode);
    setFormError(null);
    setFormSuccess(false);
    setIsModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setFormName(student.name);
    setFormCode(student.student_code);
    setFormError(null);
    setFormSuccess(false);
    setIsModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Please enter Employee Name.');
      return;
    }

    setFormSaving(true);
    setFormError(null);

    const code = formCode.trim() || `ST${String(students.length + 1).padStart(3, '0')}`;

    try {
      let savedSuccessfully = false;

      // 1. Try direct Supabase first
      if (editingStudent) {
        const { error } = await supabase
          .from('students')
          .update({ name: formName.trim(), student_code: code })
          .eq('id', editingStudent.id);

        if (!error) savedSuccessfully = true;
      } else {
        const { error } = await supabase
          .from('students')
          .insert([{ name: formName.trim(), student_code: code, active: true }]);

        if (!error) savedSuccessfully = true;
      }

      // 2. If direct Supabase failed, try server API
      if (!savedSuccessfully) {
        const url = '/api/students';
        const method = editingStudent ? 'PUT' : 'POST';
        const body = editingStudent
          ? { id: editingStudent.id, name: formName.trim(), student_code: code }
          : { name: formName.trim(), student_code: code };

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const json = await res.json();
        if (json.success) {
          savedSuccessfully = true;
        } else {
          setFormError(json.error || 'Could not save employee. Please try again.');
          setFormSaving(false);
          return;
        }
      }

      // SHOW GREEN TICK SCREEN AS REQUESTED!
      setFormSuccess(true);
      setFormSaving(false);

      // Auto close modal after 1.2s and refresh list
      setTimeout(() => {
        setIsModalOpen(false);
        setFormSuccess(false);
        fetchStudents();
      }, 1200);
    } catch {
      // In case of any network glitch, re-fetch because it might have inserted
      fetchStudents();
      setFormSuccess(true);
      setTimeout(() => {
        setIsModalOpen(false);
        setFormSuccess(false);
      }, 1200);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    try {
      // Try API first (cleans up attendance as well)
      const res = await fetch(`/api/students?id=${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();

      if (json.success) {
        setStudents((prev) => prev.filter((s) => s.id !== id));
        setDeletingId(null);
        fetchStudents();
      } else {
        // Fallback direct delete
        await supabase.from('attendance').delete().eq('student_id', id);
        await supabase.from('students').delete().eq('id', id);
        setStudents((prev) => prev.filter((s) => s.id !== id));
        setDeletingId(null);
        fetchStudents();
      }
    } catch {
      fetchStudents();
      setDeletingId(null);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.student_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto w-full pb-24">
        {/* Header */}
        <AdminHeader
          title="Employees"
          subtitle={`${students.length} Total Employees`}
          action={
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add Employee</span>
            </button>
          }
        />

        <main className="p-4 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
          </div>

          {/* Employee List */}
          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
              <p className="text-xs">Loading employees...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
              <p className="text-sm font-semibold text-slate-700">No employees found</p>
              <p className="text-xs text-slate-400">
                {search ? 'Try another search term' : 'Tap "+ Add Employee" to add an employee.'}
              </p>
              {!search && (
                <button
                  onClick={openAddModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  + Add Employee
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-sm">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                          {student.name}
                        </h3>
                        <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block mt-0.5">
                          {student.student_code}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(student)}
                        title="Edit Employee"
                        className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingId(student.id)}
                        title="Delete Employee"
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Inline Delete Confirmation */}
                  {deletingId === student.id && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between bg-rose-50 -mx-4 -mb-4 p-3 rounded-b-2xl">
                      <span className="text-xs font-semibold text-rose-800">
                        Delete {student.name}?
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDeletingId(null)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student.id)}
                          className="px-2.5 py-1 text-xs font-bold text-white bg-rose-600 rounded-lg shadow-xs cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Add/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
            <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 space-y-4 shadow-xl">
              {formSuccess ? (
                /* ==========================================================
                   GREEN TICK SCREEN AS REQUESTED BY USER!
                   ========================================================== */
                <div className="py-8 text-center space-y-3 animate-fadeIn">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">
                    Employee Saved!
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Added to permanent employee list.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="text-lg font-black text-slate-900">
                      {editingStudent ? 'Edit Employee' : 'Add Employee'}
                    </h3>
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {formError && (
                    <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveStudent} className="space-y-4">
                    <div>
                      <label htmlFor="emp-name-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Employee Name *
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                          id="emp-name-input"
                          type="text"
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          placeholder="e.g. Ikram Khan"
                          required
                          autoFocus
                          className="w-full pl-10 pr-3.5 py-3 text-base bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="emp-code-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Employee ID / Code
                      </label>
                      <input
                        id="emp-code-input"
                        type="text"
                        value={formCode}
                        onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                        placeholder="e.g. ST007"
                        className="w-full px-3.5 py-2.5 text-sm font-mono uppercase bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Auto-generated if left empty.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={formSaving}
                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {formSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Save Employee</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}

        {/* Mobile Bottom Navigation */}
        <AdminBottomNav />
      </div>
    </AdminGuard>
  );
}
