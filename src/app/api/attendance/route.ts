import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://prescxutdeljzowbnvlt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Jt6yoNCCqAKzyEMGGSwudQ_g2139fk2';

const supabaseServer = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

// GET /api/attendance?date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');

    if (!date) {
      const { data, error } = await supabaseServer
        .from('attendance')
        .select('attendance_date, status')
        .order('attendance_date', { ascending: false });

      if (error) throw error;
      return NextResponse.json(
        { success: true, records: data || [] },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    const { data, error } = await supabaseServer
      .from('attendance')
      .select('*')
      .eq('attendance_date', date.trim());

    if (error) throw error;

    return NextResponse.json(
      { success: true, attendance: data || [] },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch attendance';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST /api/attendance - Save / Update Attendance
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const date = (body.date || '').trim();
    const records: Array<{
      student_id: string;
      status: string;
      check_in?: string | null;
      notes?: string | null;
    }> = body.records || [];

    if (!date || records.length === 0) {
      return NextResponse.json({ success: false, error: 'Date and records required' }, { status: 400 });
    }

    for (const item of records) {
      const payload = {
        student_id: item.student_id,
        attendance_date: date,
        status: item.status || 'Present',
        check_in: item.check_in || null,
        notes: item.notes || null,
      };

      // Check if existing record exists for this student and date
      const { data: existing } = await supabaseServer
        .from('attendance')
        .select('id')
        .eq('student_id', item.student_id)
        .eq('attendance_date', date)
        .maybeSingle();

      if (existing?.id) {
        await supabaseServer
          .from('attendance')
          .update({
            status: payload.status,
            check_in: payload.check_in,
            notes: payload.notes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabaseServer.from('attendance').insert([payload]);
      }
    }

    return NextResponse.json(
      { success: true, message: 'Attendance saved successfully' },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save attendance';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
