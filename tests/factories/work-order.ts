import type { WorkOrderData, WorkOrderDocument } from '../../src/reflow/types';

type PartialWorkOrderDocument = Partial<Omit<WorkOrderDocument, 'data'>> & {
  data?: Partial<WorkOrderData>;
};

export const createWorkOrderData = (overrides: Partial<WorkOrderData> = {}): WorkOrderData => ({
  workOrderNumber: 'wo-123',
  manufacturingOrderId: 'MO-001',
  workCenterId: 'WC-001',
  startDate: '2024-01-01T08:00:00Z',
  endDate: '2024-01-01T09:00:00Z',
  durationMinutes: 60,
  isMaintenance: false,
  dependsOnWorkOrderIds: [],
  ...overrides,
});

export const createWorkOrder = (overrides: PartialWorkOrderDocument = {}): WorkOrderDocument => {
  const id = overrides.docId ?? 'wo-123';

  return {
    docId: id,
    docType: 'workOrder',
    data: createWorkOrderData({
      ...overrides.data,
      workOrderNumber: overrides.data?.workOrderNumber ?? id,
    }),
  };
};
