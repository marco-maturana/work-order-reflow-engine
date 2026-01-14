import { DateTime } from 'luxon';
import type { WorkCenterData } from '../reflow/types';

export interface WorkingClockResult {
  end: DateTime;
  consumedMinutes: number;
}

export function addWorkingMinutes(
  start: DateTime,
  durationMinutes: number,
  workCenter: WorkCenterData,
): WorkingClockResult {
  // @upgrade Implement shift-aware working clock that skips maintenance windows.
  void durationMinutes;
  void workCenter;
  return { end: start, consumedMinutes: 0 };
}
