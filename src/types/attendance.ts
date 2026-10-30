export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Leave' | 'Half Day';

export interface Student {
  id: string;
  name: string;
  student_code: string;
  phone?: string | null;
  pin?: string | null;
  active: boolean;
  created_at?: string;
}

export interface AttendanceRecord {
  id?: string;
  student_id: string;
  attendance_date: string; // YYYY-MM-DD
  check_in?: string | null;
  check_out?: string | null;
  status: AttendanceStatus;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface StudentWithAttendance extends Student {
  attendance?: AttendanceRecord | null;
}

export interface MonthStats {
  present: number;
  absent: number;
  late: number;
  leave: number;
  half_day?: number;
  total: number;
  percentage: number;
}

export interface PublicStudentAttendanceResult {
  success: boolean;
  error?: string;
  student?: {
    name: string;
    student_code: string;
    phone?: string | null;
  };
  today?: {
    status: AttendanceStatus;
    check_in?: string | null;
    check_out?: string | null;
    notes?: string | null;
  } | null;
  this_month?: MonthStats;
  history?: Array<{
    id: string;
    attendance_date: string;
    status: AttendanceStatus;
    check_in?: string | null;
    check_out?: string | null;
    notes?: string | null;
  }>;
}
