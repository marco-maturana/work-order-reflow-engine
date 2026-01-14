import { DateTime, Interval } from 'luxon';
import type { MaintenanceWindow, WorkCenterData, WorkCenterShift } from '../reflow/types';

export function isWithinShift(date: DateTime, shift: WorkCenterShift): boolean {
  const start = date.set({ hour: shift.startHour, minute: 0, second: 0, millisecond: 0 });
  const end = date.set({ hour: shift.endHour, minute: 0, second: 0, millisecond: 0 });
  return date >= start && date < end;
}

export function getShiftsForDay(workCenter: WorkCenterData, day: number): WorkCenterShift[] {
  return workCenter.shifts.filter((shift) => shift.dayOfWeek === day);
}

export function isDuringMaintenance(date: DateTime, maintenance: MaintenanceWindow): boolean {
  const interval = Interval.fromDateTimes(
    DateTime.fromISO(maintenance.startDate, { zone: 'utc' }),
    DateTime.fromISO(maintenance.endDate, { zone: 'utc' }),
  );
  return interval.contains(date);
}

export function nextShiftStart(date: DateTime, workCenter: WorkCenterData): DateTime | null {
  // @upgrade Implement search for next shift across days, skipping maintenance.
  void workCenter;
  return date;
}
