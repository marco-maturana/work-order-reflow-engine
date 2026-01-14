import type { WorkOrderDocument } from '../../src/reflow/types';

export const createWorkOrder = (id: string, dependsOn: string[] = []): WorkOrderDocument => ({
  docId: id,
  docType: 'workOrder',
  data: {
    workOrderNumber: id,
    manufacturingOrderId: `mo-${id}`,
    workCenterId: 'wc-1',
    startDate: '2024-01-01T08:00:00Z',
    endDate: '2024-01-01T09:00:00Z',
    durationMinutes: 60,
    isMaintenance: false,
    dependsOnWorkOrderIds: dependsOn
  }
});
