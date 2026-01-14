import { DateTime } from 'luxon';
import { addWorkingMinutes } from '../../src/utils/time';
import type { WorkCenterData } from '../../src/reflow/types';

const workCenter = (overrides?: Partial<WorkCenterData>): WorkCenterData => ({
  name: 'wc-1',
  shifts: [
    { dayOfWeek: 1, startHour: 8, endHour: 12 },
    { dayOfWeek: 2, startHour: 8, endHour: 12 },
  ],
  maintenanceWindows: [],
  ...overrides,
});

describe('addWorkingMinutes', () => {
  it('accumulates time within a single shift', () => {
    const wc = workCenter();
    const start = DateTime.fromISO('2024-01-01T08:00:00Z', { zone: 'utc' });
    const result = addWorkingMinutes(start, 120, wc);
    expect(result.end.toISO()).toBe('2024-01-01T10:00:00.000Z');
    expect(result.consumedMinutes).toBe(120);
  });

  it('rolls over to the next shift when exceeding current shift', () => {
    const wc = workCenter();
    const start = DateTime.fromISO('2024-01-01T11:00:00Z', { zone: 'utc' });
    const result = addWorkingMinutes(start, 120, wc);
    // 60 min on day 1 (11-12) + 60 min next day (8-9)
    expect(result.end.toISO()).toBe('2024-01-02T09:00:00.000Z');
  });

  it('skips maintenance windows inside a shift', () => {
    const wc = workCenter({
      maintenanceWindows: [{ startDate: '2024-01-01T09:00:00Z', endDate: '2024-01-01T10:00:00Z' }],
    });
    const start = DateTime.fromISO('2024-01-01T08:00:00Z', { zone: 'utc' });
    const result = addWorkingMinutes(start, 180, wc);
    // Work 8-9 (60), skip 9-10, then 10-12 (120) => finish at 12:00
    expect(result.end.toISO()).toBe('2024-01-01T12:00:00.000Z');
  });

  it('throws when no shifts exist', () => {
    const wc = workCenter({ shifts: [] });
    const start = DateTime.fromISO('2024-01-01T08:00:00Z', { zone: 'utc' });
    expect(() => addWorkingMinutes(start, 60, wc)).toThrow(/No shifts defined/);
  });
});
