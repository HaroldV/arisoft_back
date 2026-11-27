import {
  formatLocalDate,
  getLocalDayRange,
  getLocalWeekRange,
  getLocalMonthRange,
  parseCustomRange,
} from '../date-range.utils';

describe('Bank Movements Date Range Utils (Treasury Filters)', () => {
  it('should correctly format local dates as YYYY-MM-DD', () => {
    const d = new Date(2026, 10, 26); // Nov 26, 2026
    expect(formatLocalDate(d)).toBe('2026-11-26');
  });

  it('should return exact 00:00:00 to 23:59:59.999 local boundaries for getLocalDayRange', () => {
    const d = new Date(2026, 10, 26, 15, 30, 45); // Nov 26, 2026 at 3:30 PM
    const range = getLocalDayRange(d);

    expect(range.dateStr).toBe('2026-11-26');
    const start = new Date(range.startISO);
    const end = new Date(range.endISO);

    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(10);
    expect(start.getDate()).toBe(26);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(start.getMilliseconds()).toBe(0);

    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(10);
    expect(end.getDate()).toBe(26);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
    expect(end.getMilliseconds()).toBe(999);
  });

  it('should cover the entire week from Monday 00:00:00 to Sunday 23:59:59.999', () => {
    // Thursday Nov 26, 2026
    const d = new Date(2026, 10, 26);
    const range = getLocalWeekRange(d);

    expect(range.startStr).toBe('2026-11-23'); // Monday
    expect(range.endStr).toBe('2026-11-29');   // Sunday

    const start = new Date(range.startISO);
    const end = new Date(range.endISO);

    expect(start.getDate()).toBe(23);
    expect(start.getHours()).toBe(0);
    expect(end.getDate()).toBe(29);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
  });

  it('should cover the full month from 1st 00:00:00 to last day 23:59:59.999', () => {
    const d = new Date(2026, 10, 26); // November has 30 days
    const range = getLocalMonthRange(d);

    expect(range.startStr).toBe('2026-11-01');
    expect(range.endStr).toBe('2026-11-30');

    const start = new Date(range.startISO);
    const end = new Date(range.endISO);

    expect(start.getDate()).toBe(1);
    expect(start.getHours()).toBe(0);
    expect(end.getDate()).toBe(30);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
  });

  it('should parse custom date range (Desde - Hasta) with full day coverage', () => {
    const range = parseCustomRange('2026-11-15', '2026-11-26');
    const start = new Date(range.startISO);
    const end = new Date(range.endISO);

    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(10);
    expect(start.getDate()).toBe(15);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);

    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(10);
    expect(end.getDate()).toBe(26);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
    expect(end.getMilliseconds()).toBe(999);
  });

  it('should include movements registered late at night in local time (e.g. 21:30 VET)', () => {
    // 21:30 VET on 2026-11-26 is 01:30 UTC on 2026-11-27
    const lateNightMovementDate = new Date(2026, 10, 26, 21, 30, 0);
    const range = parseCustomRange('2026-11-26', '2026-11-26');

    const movementTime = lateNightMovementDate.getTime();
    const startTime = new Date(range.startISO).getTime();
    const endTime = new Date(range.endISO).getTime();

    expect(movementTime >= startTime).toBe(true);
    expect(movementTime <= endTime).toBe(true);
  });

  it('should handle empty or partial custom ranges gracefully', () => {
    const onlyStart = parseCustomRange('2026-11-15', '');
    expect(onlyStart.startISO).not.toBe('');
    expect(onlyStart.endISO).toBe('');

    const empty = parseCustomRange('', '');
    expect(empty.startISO).toBe('');
    expect(empty.endISO).toBe('');
  });
});
