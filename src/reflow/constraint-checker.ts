import type { ReflowValidation, WorkOrderDocument, WorkCenterDocument } from './types';

export function validateSchedule(
  workOrders: WorkOrderDocument[],
  workCenters: WorkCenterDocument[],
): ReflowValidation {
  // @upgrade Implement full constraint validation (dependencies, overlaps, shifts, maintenance).
  void workOrders;
  void workCenters;
  return {
    isValid: false,
    errors: ['Validation not implemented yet.'],
  };
}
