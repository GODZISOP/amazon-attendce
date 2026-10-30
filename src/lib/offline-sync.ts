/**
 * Offline Sync and Local Storage Helper
 * Ensures the portal works even with zero or slow internet.
 */

export interface OfflineAttendanceRecord {
  date: string;
  records: Array<{
    student_id: string;
    status: string;
    check_in?: string | null;
    notes?: string | null;
  }>;
  savedAt: string;
}

const OFFLINE_QUEUE_KEY = 'attendance_offline_queue';
const EMPLOYEES_CACHE_KEY = 'attendance_cached_employees';

// Cache employees locally so they always load even offline
export function cacheEmployeesLocally(employees: any[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(EMPLOYEES_CACHE_KEY, JSON.stringify(employees));
  } catch {
    // ignore
  }
}

export function getCachedEmployeesLocally(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(EMPLOYEES_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Save attendance into local offline queue when internet is slow or down
export function saveAttendanceOffline(date: string, records: any[]) {
  if (typeof window === 'undefined') return;
  try {
    const existingRaw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue: Record<string, OfflineAttendanceRecord> = existingRaw ? JSON.parse(existingRaw) : {};
    
    queue[date] = {
      date,
      records,
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to save offline:', err);
  }
}

// Get offline attendance for date
export function getOfflineAttendanceForDate(date: string): any[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return null;
    const queue: Record<string, OfflineAttendanceRecord> = JSON.parse(raw);
    return queue[date]?.records || null;
  } catch {
    return null;
  }
}

// Check how many dates are pending sync
export function getPendingOfflineCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return 0;
    const queue: Record<string, OfflineAttendanceRecord> = JSON.parse(raw);
    return Object.keys(queue).length;
  } catch {
    return 0;
  }
}

// Automatically sync all pending offline records when internet connects
export async function syncOfflineRecords(): Promise<{ success: boolean; syncedCount: number }> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { success: false, syncedCount: 0 };
  }

  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return { success: true, syncedCount: 0 };

    const queue: Record<string, OfflineAttendanceRecord> = JSON.parse(raw);
    const dates = Object.keys(queue);
    if (dates.length === 0) return { success: true, syncedCount: 0 };

    let synced = 0;
    for (const date of dates) {
      const entry = queue[date];
      try {
        const res = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: entry.date,
            records: entry.records,
          }),
        });
        const json = await res.json();
        if (json.success) {
          delete queue[date];
          synced += 1;
        }
      } catch {
        // Stop syncing if connection broke again
        break;
      }
    }

    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    return { success: true, syncedCount: synced };
  } catch (err) {
    console.error('Error syncing offline queue:', err);
    return { success: false, syncedCount: 0 };
  }
}
