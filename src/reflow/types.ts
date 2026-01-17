type DocumentType = 'workOrder' | 'workCenter' | 'manufacturingOrder';

interface BaseDocument<T extends DocumentType, D> {
  docId: string;
  docType: T;
  data: D;
}

export interface WorkOrderData {
  workOrderNumber: string;
  manufacturingOrderId: string;
  workCenterId: string;
  startDate: string; // ISO-8601 UTC
  endDate: string; // ISO-8601 UTC, will be recalculated
  durationMinutes: number;
  isMaintenance: boolean;
  dependsOnWorkOrderIds: string[];
  // @upgrade: optional setupTimeMinutes to model setup before production.
}

export interface WorkCenterShift {
  dayOfWeek: number; // 0-6, Sunday = 0
  startHour: number; // 0-23
  endHour: number; // 0-23
}

export interface MaintenanceWindow {
  startDate: string; // ISO-8601 UTC
  endDate: string; // ISO-8601 UTC
  reason?: string;
}

export interface WorkCenterData {
  name: string;
  shifts: WorkCenterShift[];
  maintenanceWindows: MaintenanceWindow[];
}

interface ManufacturingOrderData {
  manufacturingOrderNumber: string;
  itemId: string;
  quantity: number;
  dueDate: string; // ISO-8601 UTC
}

export type WorkOrderDocument = BaseDocument<'workOrder', WorkOrderData>;
export type WorkCenterDocument = BaseDocument<'workCenter', WorkCenterData>;
type ManufacturingOrderDocument = BaseDocument<'manufacturingOrder', ManufacturingOrderData>;

export type ScenarioDocument = WorkOrderDocument | WorkCenterDocument | ManufacturingOrderDocument;

export interface ReflowInput {
  documents: ScenarioDocument[];
}

export interface ReflowChange {
  workOrderId: string;
  fromStart: string;
  fromEnd: string;
  toStart: string;
  toEnd: string;
  deltaMinutes: number;
  reasons: string[];
}

export interface ReflowValidation {
  isValid: boolean;
  errors?: string[];
}

export interface ReflowResult {
  updatedWorkOrders: WorkOrderDocument[];
  changes: ReflowChange[];
  explanation: string[];
  validation: ReflowValidation;
}
