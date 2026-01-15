import type { WorkCenterData, WorkCenterDocument } from '../../src/reflow/types';

type PartialWorkCenterDocument = Partial<Omit<WorkCenterDocument, 'data'>> & {
  data?: Partial<WorkCenterData>;
};

export const createWorkCenterData = (overrides: Partial<WorkCenterData> = {}): WorkCenterData => ({
  name: 'WC-001',
  shifts: [{ dayOfWeek: 1, startHour: 8, endHour: 12 }],
  maintenanceWindows: [],
  ...overrides,
});

export const createWorkCenter = (overrides: PartialWorkCenterDocument = {}): WorkCenterDocument => {
  const id = overrides.docId ?? 'wc-123';

  return {
    docId: id,
    docType: 'workCenter',
    data: createWorkCenterData({
      name: overrides.data?.name ?? id,
      ...overrides.data,
    }),
  };
};
