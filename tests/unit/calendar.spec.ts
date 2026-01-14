import { DateTime, Interval } from 'luxon';
import {
  findNextShiftWindow,
  getShiftsForDay,
  isDuringMaintenance,
  isWithinShift,
  nextShiftStart,
  splitByMaintenance
} from '../../src/utils/calendar';
import type { WorkCenterData } from '../../src/reflow/types';

const baseWorkCenter = (overrides?: Partial<WorkCenterData>): WorkCenterData => ({
  name: 'wc-1',
  shifts: [
    { dayOfWeek: 1, startHour: 8, endHour: 16 },
    { dayOfWeek: 2, startHour: 8, endHour: 16 }
  ],
  maintenanceWindows: [],
  ...overrides
});

describe('calendar helpers', () => {
  it('detects within shift only on the correct day and time', () => {
    const wc = baseWorkCenter();
    const monday10 = DateTime.fromISO('2024-01-01T10:00:00Z', { zone: 'utc' }); // Monday
    const sunday10 = DateTime.fromISO('2024-01-07T10:00:00Z', { zone: 'utc' });

    expect(isWithinShift(monday10, wc.shifts[0])).toBe(true);
    expect(isWithinShift(sunday10, wc.shifts[0])).toBe(false);
    expect(
      isWithinShift(DateTime.fromISO('2024-01-01T18:00:00Z', { zone: 'utc' }), wc.shifts[0])
    ).toBe(false);
  });

  it('returns next shift start and skips maintenance if starting inside a block', () => {
    const wc = baseWorkCenter({
      maintenanceWindows: [
        { startDate: '2024-01-01T09:00:00Z', endDate: '2024-01-01T10:00:00Z' }
      ]
    });
    const start = DateTime.fromISO('2024-01-01T09:30:00Z', { zone: 'utc' });
    const next = nextShiftStart(start, wc);
    expect(next?.toISO()).toBe('2024-01-01T10:00:00.000Z');
  });

  it('finds the next shift window across days', () => {
    const wc = baseWorkCenter();
    const afterShift = DateTime.fromISO('2024-01-01T18:00:00Z', { zone: 'utc' }); // after Tuesday shift end
    const window = findNextShiftWindow(afterShift, wc);
    expect(window?.start.toISO()).toBe('2024-01-02T08:00:00.000Z');
  });

  it('splits intervals by maintenance windows', () => {
    const wc = baseWorkCenter({
      maintenanceWindows: [
        { startDate: '2024-01-01T09:00:00Z', endDate: '2024-01-01T10:00:00Z' },
        { startDate: '2024-01-01T12:00:00Z', endDate: '2024-01-01T12:30:00Z' }
      ]
    });
    const interval = Interval.fromDateTimes(
      DateTime.fromISO('2024-01-01T08:00:00Z', { zone: 'utc' }),
      DateTime.fromISO('2024-01-01T13:00:00Z', { zone: 'utc' })
    );
    const segments = splitByMaintenance(interval, wc);
    expect(segments).toHaveLength(3);
    expect(segments[0].toDuration('minutes').minutes).toBe(60); // 8-9
    expect(segments[1].toDuration('minutes').minutes).toBe(120); // 10-12
    expect(segments[2].toDuration('minutes').minutes).toBe(30); // 12:30-13
  });

  it('detects maintenance via isDuringMaintenance', () => {
    const mw = { startDate: '2024-01-01T09:00:00Z', endDate: '2024-01-01T10:00:00Z' };
    expect(
      isDuringMaintenance(DateTime.fromISO('2024-01-01T09:30:00Z', { zone: 'utc' }), mw)
    ).toBe(true);
    expect(
      isDuringMaintenance(DateTime.fromISO('2024-01-01T10:00:00Z', { zone: 'utc' }), mw)
    ).toBe(false);
  });

  it('gets shifts for day sorted by start', () => {
    const wc = baseWorkCenter({
      shifts: [
        { dayOfWeek: 1, startHour: 14, endHour: 18 },
        { dayOfWeek: 1, startHour: 8, endHour: 12 }
      ]
    });
    const shifts = getShiftsForDay(wc, 1);
    expect(shifts[0].startHour).toBe(8);
    expect(shifts[1].startHour).toBe(14);
  });
});
