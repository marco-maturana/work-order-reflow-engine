import { DateTime, Interval } from 'luxon';
import type { WorkCenterData } from '../reflow/types';
import { findNextShiftWindow, splitByMaintenance } from './calendar';

export interface WorkingClockResult {
  end: DateTime;
  consumedMinutes: number;
}

export function addWorkingMinutes(
  start: DateTime,
  durationMinutes: number,
  workCenter: WorkCenterData,
): WorkingClockResult {
  if (durationMinutes <= 0) {
    return { end: start, consumedMinutes: 0 };
  }

  if (workCenter.shifts.length === 0) {
    throw new Error(`No shifts defined for work center ${workCenter.name}`);
  }

  let remaining = durationMinutes;
  let cursor = start.setZone('utc');
  let safety = 0;

  while (remaining > 0) {
    if (safety++ > 1000) {
      throw new Error('Exceeded scheduling iterations while adding working minutes.');
    }

    const shiftWindow = findNextShiftWindow(cursor, workCenter);
    if (!shiftWindow) {
      throw new Error(`No available shift after ${cursor.toISO()}`);
    }

    const windowInterval = Interval.fromDateTimes(shiftWindow.start, shiftWindow.end);
    const availableSegments = splitByMaintenance(windowInterval, workCenter);

    for (const segment of availableSegments) {
      if (!segment.start || !segment.end) continue;
      const available = Math.floor(segment.length('minutes'));
      if (available <= 0) continue;

      if (remaining <= available) {
        const end = segment.start.plus({ minutes: remaining });
        return { end, consumedMinutes: durationMinutes };
      }
      remaining -= available;
    }

    cursor = shiftWindow.end;
  }

  return { end: cursor, consumedMinutes: durationMinutes };
}
