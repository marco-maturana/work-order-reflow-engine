import { ReflowService } from '../../src/reflow/reflow.service';
import type {
  ScenarioDocument,
  WorkCenterDocument,
  WorkOrderDocument,
} from '../../src/reflow/types';
import { createWorkCenter } from '../factories/work-center';
import { createWorkOrder } from '../factories/work-order';

const workCenter: WorkCenterDocument = createWorkCenter({
  data: {
    shifts: [
      { dayOfWeek: 1, startHour: 8, endHour: 12 },
      { dayOfWeek: 2, startHour: 8, endHour: 12 },
    ],
    maintenanceWindows: [],
  },
});

describe('ReflowService integration', () => {
  it('reflows work orders respecting deps, conflicts, and shifts', async () => {
    const workOrders: WorkOrderDocument[] = [
      createWorkOrder({
        docId: 'WO1',
        data: {
          workCenterId: workCenter.docId,
          startDate: '2024-01-01T08:00:00Z',
          endDate: '2024-01-01T09:00:00Z',
        },
      }),
      createWorkOrder({
        docId: 'WO2',
        data: {
          workCenterId: workCenter.docId,
          startDate: '2024-01-01T08:00:00Z',
          endDate: '2024-01-01T09:00:00Z',
          dependsOnWorkOrderIds: ['WO1'],
        },
      }),
      createWorkOrder({
        docId: 'WO3',
        data: {
          workCenterId: workCenter.docId,
          startDate: '2024-01-01T08:00:00Z',
          endDate: '2024-01-01T09:00:00Z',
          dependsOnWorkOrderIds: ['WO1', 'WO2'],
        },
      }),
      createWorkOrder({
        docId: 'WO4',
        data: {
          workCenterId: workCenter.docId,
          startDate: '2024-01-01T11:00:00Z',
          endDate: '2024-01-01T12:00:00Z',
          durationMinutes: 180,
        },
      }),
      createWorkOrder({
        docId: 'WO5',
        data: {
          workCenterId: workCenter.docId,
          startDate: '2024-01-01T12:00:00Z',
          endDate: '2024-01-01T13:00:00Z',
          isMaintenance: true,
        },
      }),
    ];

    const documents: ScenarioDocument[] = [workCenter, ...workOrders];
    const service = new ReflowService();
    const result = await service.reflow({ documents });

    const byId = new Map(result.updatedWorkOrders.map((wo) => [wo.docId, wo]));

    expect(result.validation.isValid).toBe(true);

    expect(byId.get('WO1')?.data.startDate).toBe('2024-01-01T08:00:00Z');
    expect(byId.get('WO1')?.data.endDate).toBe('2024-01-01T09:00:00Z');

    expect(byId.get('WO2')?.data.startDate).toBe('2024-01-01T09:00:00Z');
    expect(byId.get('WO2')?.data.endDate).toBe('2024-01-01T10:00:00Z');

    expect(byId.get('WO3')?.data.startDate).toBe('2024-01-01T10:00:00Z');
    expect(byId.get('WO3')?.data.endDate).toBe('2024-01-01T11:00:00Z');

    expect(byId.get('WO4')?.data.startDate).toBe('2024-01-01T11:00:00Z');
    expect(byId.get('WO4')?.data.endDate).toBe('2024-01-02T10:00:00Z');

    // Maintenance unchanged
    expect(byId.get('WO5')?.data.startDate).toBe('2024-01-01T12:00:00Z');
    expect(byId.get('WO5')?.data.endDate).toBe('2024-01-01T13:00:00Z');

    const reasonsWO2 = result.changes.find((c) => c.workOrderId === 'WO2')?.reasons ?? [];

    expect(reasonsWO2).toContain('dependencies');
  });

  it('avoids overlaps with maintenance work orders', async () => {
    const maintenanceCenter = createWorkCenter({
      data: {
        shifts: [{ dayOfWeek: 1, startHour: 8, endHour: 12 }],
        maintenanceWindows: [],
      },
    });

    const maintenance = createWorkOrder({
      docId: 'M1',
      data: {
        workCenterId: maintenanceCenter.docId,
        startDate: '2024-01-01T09:00:00Z',
        endDate: '2024-01-01T10:00:00Z',
        isMaintenance: true,
      },
    });
    const production = createWorkOrder({
      docId: 'P1',
      data: {
        workCenterId: maintenanceCenter.docId,
        startDate: '2024-01-01T09:00:00Z',
        endDate: '2024-01-01T10:00:00Z',
      },
    });

    const documents: ScenarioDocument[] = [maintenanceCenter, maintenance, production];
    const service = new ReflowService();
    const result = await service.reflow({ documents });

    const byId = new Map(result.updatedWorkOrders.map((wo) => [wo.docId, wo]));

    expect(result.validation.isValid).toBe(true);

    expect(byId.get('M1')?.data.startDate).toBe('2024-01-01T09:00:00Z');
    expect(byId.get('M1')?.data.endDate).toBe('2024-01-01T10:00:00Z');

    expect(byId.get('P1')?.data.startDate).toBe('2024-01-01T10:00:00Z');
    expect(byId.get('P1')?.data.endDate).toBe('2024-01-01T11:00:00Z');

    const reasons = result.changes.find((c) => c.workOrderId === 'P1')?.reasons ?? [];
    expect(reasons).toContain('work center conflict');
  });
});
