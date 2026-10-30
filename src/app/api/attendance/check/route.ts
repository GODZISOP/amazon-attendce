import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { PublicStudentAttendanceResult } from '@/types/attendance';

// Simple in-memory rate limiting map: IP -> { count, expiresAt }
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  
  if (!entry || now > entry.expiresAt) {
    rateLimitMap.set(ip, { count: 1, expiresAt: now + 60 * 1000 }); // 1 minute window
    return true;
  }
  
  if (entry.count >= 30) {
    return false; // Exceeded 30 requests per minute
  }
  
  entry.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please wait a minute and try again.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const studentCode = (body.studentCode || '').trim();
    const pin = body.pin ? String(body.pin).trim() : null;

    if (!studentCode) {
      return NextResponse.json(
        { success: false, error: 'Student ID is required.' },
        { status: 400 }
      );
    }

    // Try PostgreSQL RPC function first
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_student_attendance', {
      p_student_code: studentCode,
      p_pin: pin || null,
    });

    if (!rpcError && rpcData) {
      return NextResponse.json(rpcData as PublicStudentAttendanceResult);
    }

    // Fallback direct single-student query if RPC is not yet created in Supabase
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, name, student_code, phone, pin, active')
      .ilike('student_code', studentCode)
      .eq('active', true)
      .maybeSingle();

    if (studentError || !student) {
      return NextResponse.json(
        { success: false, error: 'Student ID not found. Please check and try again.' },
        { status: 404 }
      );
    }

    // Check PIN if student has one configured
    if (student.pin && student.pin.trim() !== '') {
      if (!pin || pin !== student.pin.trim()) {
        return NextResponse.json(
          { success: false, error: 'Incorrect PIN. Please try again.' },
          { status: 401 }
        );
      }
    }

    const todayDate = new Date().toISOString().split('T')[0];
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    // Fetch student's attendance records
    const { data: attendanceList, error: attError } = await supabase
      .from('attendance')
      .select('id, attendance_date, status, check_in, check_out, notes')
      .eq('student_id', student.id)
      .order('attendance_date', { ascending: false });

    if (attError) {
      return NextResponse.json(
        { success: false, error: 'Could not fetch attendance records.' },
        { status: 500 }
      );
    }

    const records = attendanceList || [];
    const todayRecord = records.find(r => r.attendance_date === todayDate) || null;
    
    // Filter this month
    const thisMonthRecords = records.filter(r => r.attendance_date >= startOfMonth && r.attendance_date <= todayDate);
    const presentCount = thisMonthRecords.filter(r => r.status === 'Present').length;
    const absentCount = thisMonthRecords.filter(r => r.status === 'Absent').length;
    const lateCount = thisMonthRecords.filter(r => r.status === 'Late').length;
    const leaveCount = thisMonthRecords.filter(r => r.status === 'Leave').length;
    const halfDayCount = thisMonthRecords.filter(r => r.status === 'Half Day').length;
    const totalDays = thisMonthRecords.length;
    const percentage = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;

    const result: PublicStudentAttendanceResult = {
      success: true,
      student: {
        name: student.name,
        student_code: student.student_code,
        phone: student.phone,
      },
      today: todayRecord ? {
        status: todayRecord.status,
        check_in: todayRecord.check_in,
        check_out: todayRecord.check_out,
        notes: todayRecord.notes,
      } : null,
      this_month: {
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        leave: leaveCount,
        half_day: halfDayCount,
        total: totalDays,
        percentage,
      },
      history: records.slice(0, 30),
    };

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
