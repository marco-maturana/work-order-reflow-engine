import { DateTime, Interval } from 'luxon';
import type { MaintenanceWindow, WorkCenterData, WorkCenterShift } from '../reflow/types';

const MAX_LOOKAHEAD_DAYS = 14;

const weekdayToShiftDay = (dt: DateTime): number => dt.setZone('utc').weekday % 7; // Luxon: 1=Mon ... 7=Sun

const asUtc = (dt: DateTime): DateTime => dt.setZone('utc');

type BoundedInterval = Interval & { start: DateTime; end: DateTime };

function toInterval(mw: MaintenanceWindow): Interval | null {
  const start = DateTime.fromISO(mw.startDate, { zone: 'utc' });
  const end = DateTime.fromISO(mw.endDate, { zone: 'utc' });
  const interval = Interval.fromDateTimes(start, end);
  if (!interval.isValid || !interval.start || !interval.end || interval.start >= interval.end) {
    return null;
  }
  return interval;
}

function hasBounds(interval: Interval): interval is BoundedInterval {
  return interval.start !== null && interval.end !== null;
}

export function isWithinShift(date: DateTime, shift: WorkCenterShift): boolean {
  const zoned = asUtc(date);
  if (weekdayToShiftDay(zoned) !== shift.dayOfWeek) return false;
  const start = zoned.set({ hour: shift.startHour, minute: 0, second: 0, millisecond: 0 });
  const end = zoned.set({ hour: shift.endHour, minute: 0, second: 0, millisecond: 0 });
  return zoned >= start && zoned < end;
}

export function getShiftsForDay(workCenter: WorkCenterData, day: number): WorkCenterShift[] {
  return workCenter.shifts
    .filter((shift) => shift.dayOfWeek === day)
    .sort((a, b) => a.startHour - b.startHour);
}

export function isDuringMaintenance(date: DateTime, maintenance: MaintenanceWindow): boolean {
  const interval = toInterval(maintenance);
  return interval ? interval.contains(asUtc(date)) : false;
}

function maintenanceIntervals(workCenter: WorkCenterData, window: Interval): BoundedInterval[] {
  if (!window.isValid || !window.start || !window.end) return [];

  const intervals = workCenter.maintenanceWindows
    .map(toInterval)
    .filter((m): m is Interval => Boolean(m))
    .filter(hasBounds)
    .filter((m) => m.overlaps(window))
    .sort((a, b) => a.start.toMillis() - b.start.toMillis());

  return intervals;
}

export function nextShiftStart(date: DateTime, workCenter: WorkCenterData): DateTime | null {
  const base = asUtc(date);
  for (let i = 0; i <= MAX_LOOKAHEAD_DAYS; i += 1) {
    const candidateDay = base.plus({ days: i });
    const shifts = getShiftsForDay(workCenter, weekdayToShiftDay(candidateDay));
    for (const shift of shifts) {
      const shiftStart = candidateDay.set({
        hour: shift.startHour,
        minute: 0,
        second: 0,
        millisecond: 0
      });
      const shiftEnd = candidateDay.set({
        hour: shift.endHour,
        minute: 0,
        second: 0,
        millisecond: 0
      });
      if (shiftEnd <= base && i === 0) continue;

      const start = base >= shiftStart && base < shiftEnd ? base : shiftStart;
      const interval = Interval.fromDateTimes(start, shiftEnd);
      const blocks = maintenanceIntervals(workCenter, interval);
      if (blocks.length === 0) return start;

      const firstBlock = blocks[0];
      if (start < firstBlock.start) return start;
      if (firstBlock.end < shiftEnd) return firstBlock.end;
      // otherwise blocked until shift end; continue searching
    }
  }
  return null;
}

export function findNextShiftWindow(
  date: DateTime,
  workCenter: WorkCenterData
): { start: DateTime; end: DateTime } | null {
  const base = asUtc(date);
  for (let i = 0; i <= MAX_LOOKAHEAD_DAYS; i += 1) {
    const candidateDay = base.plus({ days: i });
    const shifts = getShiftsForDay(workCenter, weekdayToShiftDay(candidateDay));
    for (const shift of shifts) {
      const shiftStart = candidateDay.set({
        hour: shift.startHour,
        minute: 0,
        second: 0,
        millisecond: 0
      });
      const shiftEnd = candidateDay.set({
        hour: shift.endHour,
        minute: 0,
        second: 0,
        millisecond: 0
      });
      const start = base > shiftStart ? base : shiftStart;
      if (shiftEnd <= start) continue;
      return { start, end: shiftEnd };
    }
  }
  return null;
}

export function splitByMaintenance(interval: Interval, workCenter: WorkCenterData): Interval[] {
  if (!interval.isValid || !interval.start || !interval.end) return [];
  const blocks = maintenanceIntervals(workCenter, interval);
  if (blocks.length === 0) return [interval];

  const segments: Interval[] = [];
  let cursor = interval.start;

  for (const block of blocks) {
    if (block.start > cursor) {
      segments.push(Interval.fromDateTimes(cursor, block.start));
    }
    if (block.end > cursor) {
      cursor = block.end;
    }
  }

  if (cursor < interval.end) {
    segments.push(Interval.fromDateTimes(cursor, interval.end));
  }

  return segments.filter((seg) => seg.isValid && seg.length('minutes') > 0);
}
