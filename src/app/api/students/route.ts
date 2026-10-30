import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://prescxutdeljzowbnvlt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Jt6yoNCCqAKzyEMGGSwudQ_g2139fk2';

const supabaseServer = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

// GET /api/students - List all students
export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from('students')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, students: data || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch students';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST /api/students - Add new student
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = (body.name || '').trim();
    const student_code = (body.student_code || '').trim().toUpperCase();

    if (!name || !student_code) {
      return NextResponse.json(
        { success: false, error: 'Student Name and Student ID are required.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer
      .from('students')
      .insert([{ name, student_code, active: true }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'Student ID already exists. Must be unique.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, student: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create student';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// PUT /api/students - Update student
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const id = body.id;
    const name = (body.name || '').trim();
    const student_code = (body.student_code || '').trim().toUpperCase();

    if (!id || !name || !student_code) {
      return NextResponse.json(
        { success: false, error: 'ID, Name, and Student Code are required.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer
      .from('students')
      .update({ name, student_code })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'Student Code already exists.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, student: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update student';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// DELETE /api/students?id=... (cleanly deletes attendance records first, then the student)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Student ID is required.' }, { status: 400 });
    }

    // 1. Delete associated attendance records first to avoid foreign key errors
    await supabaseServer.from('attendance').delete().eq('student_id', id);

    // 2. Delete the student
    const { error } = await supabaseServer.from('students').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete student';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
