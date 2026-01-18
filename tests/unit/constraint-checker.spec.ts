import { validateSchedule } from '../../src/reflow/constraint-checker';
import { createWorkCenter } from '../factories/work-center';
import { createWorkOrder } from '../factories/work-order';

const workCenter = createWorkCenter({
  data: {
    shifts: [{ dayOfWeek: 1, startHour: 8, endHour: 12 }],
    maintenanceWindows: [{ startDate: '2024-01-01T09:00:00Z', endDate: '2024-01-01T10:00:00Z' }],
  },
});

describe('validateSchedule', () => {
  it('passes for a valid schedule', () => {
    const res = validateSchedule(
      [createWorkOrder({ docId: 'A', data: { workCenterId: workCenter.docId } })],
      [workCenter],
    );

    expect(res.isValid).toBe(true);
    expect(res.errors).toBeUndefined();
  });

  it('flags dependency violations', () => {
    const parent = createWorkOrder({
      docId: 'A',
      data: {
        workCenterId: workCenter.docId,
        startDate: '2024-01-01T08:00:00Z',
        endDate: '2024-01-01T09:00:00Z',
      },
    });
    const child = createWorkOrder({
      docId: 'B',
      data: {
        workCenterId: workCenter.docId,
        dependsOnWorkOrderIds: ['A'],
        startDate: '2024-01-01T08:30:00Z',
        endDate: '2024-01-01T09:30:00Z',
      },
    });

    const res = validateSchedule([parent, child], [workCenter]);

    expect(res.isValid).toBe(false);
    expect(res.errors?.some((e) => e.includes('Dependency violation'))).toBe(true);
  });

  it('flags overlaps on the same work center', () => {
    const a = createWorkOrder({ docId: 'A', data: { workCenterId: workCenter.docId } });
    const b = createWorkOrder({
      docId: 'B',
      data: {
        workCenterId: workCenter.docId,
        startDate: '2024-01-01T08:30:00Z',
        endDate: '2024-01-01T09:30:00Z',
      },
    });

    const res = validateSchedule([a, b], [workCenter]);

    expect(res.isValid).toBe(false);
    expect(res.errors?.some((e) => e.includes('Overlap on work center'))).toBe(true);
  });

  it('flags overlaps with maintenance work orders', () => {
    const maintenance = createWorkOrder({
      docId: 'M1',
      data: {
        workCenterId: workCenter.docId,
        startDate: '2024-01-01T10:00:00Z',
        endDate: '2024-01-01T11:00:00Z',
        isMaintenance: true,
      },
    });
    const production = createWorkOrder({
      docId: 'P1',
      data: {
        workCenterId: workCenter.docId,
        startDate: '2024-01-01T10:30:00Z',
        endDate: '2024-01-01T11:30:00Z',
      },
    });

    const res = validateSchedule([maintenance, production], [workCenter]);

    expect(res.isValid).toBe(false);
    expect(res.errors?.some((e) => e.includes('Overlap on work center'))).toBe(true);
  });

  it('flags schedules that ignore maintenance windows', () => {
    const a = createWorkOrder({
      docId: 'A',
      data: {
        workCenterId: workCenter.docId,
        startDate: '2024-01-01T09:00:00Z',
        endDate: '2024-01-01T10:00:00Z',
      },
    });

    const res = validateSchedule([a], [workCenter]);

    expect(res.isValid).toBe(false);
    expect(res.errors?.some((e) => e.includes('not aligned'))).toBe(true);
  });

  it('flags shift misalignment (duration mismatch)', () => {
    const a = createWorkOrder({
      docId: 'A',
      data: {
        workCenterId: workCenter.docId,
        startDate: '2024-01-01T08:00:00Z',
        endDate: '2024-01-01T09:00:00Z',
        durationMinutes: 120,
      },
    });

    const res = validateSchedule([a], [workCenter]);

    expect(res.isValid).toBe(false);
    expect(res.errors?.some((e) => e.includes('not aligned'))).toBe(true);
  });
});
