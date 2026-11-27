/**
 * Date helper utilities for Bank Movements and Treasury filtering
 * Guarantees proper local calendar boundaries (00:00:00 to 23:59:59.999 local)
 * converted to ISO UTC timestamps for exact database range matching.
 */

export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getLocalDayRange(d: Date = new Date()): { startISO: string; endISO: string; dateStr: string } {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    dateStr: formatLocalDate(d),
  };
}

export function getLocalWeekRange(now: Date = new Date()): { startISO: string; endISO: string; startStr: string; endStr: string } {
  const day = now.getDay() || 7; // Sunday is 7, Monday is 1
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1, 0, 0, 0, 0);
  const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 7, 23, 59, 59, 999);
  return {
    startStr: formatLocalDate(monday),
    endStr: formatLocalDate(sunday),
    startISO: monday.toISOString(),
    endISO: sunday.toISOString(),
  };
}

export function getLocalMonthRange(now: Date = new Date()): { startISO: string; endISO: string; startStr: string; endStr: string } {
  const first = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return {
    startStr: formatLocalDate(first),
    endStr: formatLocalDate(last),
    startISO: first.toISOString(),
    endISO: last.toISOString(),
  };
}

export function parseCustomRange(startStr?: string, endStr?: string): { startISO: string; endISO: string } {
  let startISO = '';
  let endISO = '';

  if (startStr && startStr.trim()) {
    const [y, m, d] = startStr.split('-').map(Number);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      startISO = new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
    }
  }

  if (endStr && endStr.trim()) {
    const [y, m, d] = endStr.split('-').map(Number);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      endISO = new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
    }
  }

  return { startISO, endISO };
}
