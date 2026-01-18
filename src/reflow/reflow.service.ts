import { DateTime } from 'luxon';
import { addWorkingMinutes } from '../utils/time';
import { nextShiftStart } from '../utils/calendar';
import { validateSchedule } from './constraint-checker';
import { topologicalSort } from './dag';
import type {
  ReflowChange,
  ReflowInput,
  ReflowResult,
  WorkCenterData,
  WorkCenterDocument,
  WorkOrderDocument,
} from './types';

type ScheduledInterval = {
  start: DateTime;
  end: DateTime;
  workOrderId: string;
  isMaintenance: boolean;
  originalStart: DateTime;
  originalEnd: DateTime;
};

type ScheduleByCenter = Map<string, ScheduledInterval[]>;

type ScheduleState = {
  scheduleByCenter: ScheduleByCenter;
  completed: Map<string, ScheduledInterval>;
  changes: ReflowChange[];
  updatedWorkOrders: WorkOrderDocument[];
  explanation: string[];
};

const MAX_SLOT_SEARCH_ITERATIONS = 200;

export class ReflowService {
  async reflow(input: ReflowInput): Promise<ReflowResult> {
    const workOrders = this.extractWorkOrders(input);
    const workCenters = this.extractWorkCenters(input);
    const orderedWorkOrders = this.orderWorkOrders(workOrders);
    const workCentersById = this.buildWorkCenterIndex(workCenters);
    const state = this.initializeScheduleState();

    const maintenanceWorkOrders = orderedWorkOrders.filter((workOrder) => workOrder.data.isMaintenance);
    const productionWorkOrders = orderedWorkOrders.filter(
      (workOrder) => !workOrder.data.isMaintenance,
    );

    for (const workOrder of maintenanceWorkOrders) {
      const originalStart = this.toUtc(workOrder.data.startDate);
      const originalEnd = this.toUtc(workOrder.data.endDate);
      this.scheduleMaintenanceWorkOrder(workOrder, originalStart, originalEnd, state);
    }

    for (const workOrder of productionWorkOrders) {
      const workCenter = this.getWorkCenterById(workOrder.data.workCenterId, workCentersById);
      const originalStart = this.toUtc(workOrder.data.startDate);
      const originalEnd = this.toUtc(workOrder.data.endDate);
      this.scheduleProductionWorkOrder(workOrder, workCenter, originalStart, originalEnd, state);
    }

    const validation = validateSchedule(state.updatedWorkOrders, workCenters);

    return {
      updatedWorkOrders: state.updatedWorkOrders,
      changes: state.changes,
      explanation: state.explanation,
      validation,
    };
  }

  private extractWorkOrders(input: ReflowInput): WorkOrderDocument[] {
    return input.documents.filter((doc) => doc.docType === 'workOrder') as WorkOrderDocument[];
  }

  private extractWorkCenters(input: ReflowInput): WorkCenterDocument[] {
    return input.documents.filter((doc) => doc.docType === 'workCenter') as WorkCenterDocument[];
  }

  private orderWorkOrders(workOrders: WorkOrderDocument[]): WorkOrderDocument[] {
    const topoOrder = topologicalSort(workOrders);
    const workOrderById = new Map(workOrders.map((wo) => [wo.docId, wo]));
    return topoOrder.map((id) => workOrderById.get(id)!);
  }

  private buildWorkCenterIndex(workCenters: WorkCenterDocument[]): Map<string, WorkCenterDocument> {
    return new Map(workCenters.map((wc) => [wc.docId, wc]));
  }

  private initializeScheduleState(): ScheduleState {
    return {
      scheduleByCenter: new Map(),
      completed: new Map(),
      changes: [],
      updatedWorkOrders: [],
      explanation: [],
    };
  }

  private scheduleMaintenanceWorkOrder(
    workOrder: WorkOrderDocument,
    originalStart: DateTime,
    originalEnd: DateTime,
    state: ScheduleState,
  ): void {
    const interval: ScheduledInterval = {
      start: originalStart,
      end: originalEnd,
      workOrderId: workOrder.docId,
      isMaintenance: true,
      originalStart,
      originalEnd,
    };

    this.trackScheduledInterval(state, workOrder.data.workCenterId, interval);

    this.recordScheduleOutcome(
      workOrder,
      originalStart,
      originalEnd,
      ['maintenance not rescheduled'],
      `Maintenance work order ${workOrder.docId} kept at original time.`,
      state,
    );
  }

  private scheduleProductionWorkOrder(
    workOrder: WorkOrderDocument,
    workCenter: WorkCenterData,
    originalStart: DateTime,
    originalEnd: DateTime,
    state: ScheduleState,
  ): void {
    const dependencyReadyAt = this.resolveDependencyReadyAt(workOrder, state.completed);
    const candidateStart = dependencyReadyAt > originalStart ? dependencyReadyAt : originalStart;
    const schedule = state.scheduleByCenter.get(workOrder.data.workCenterId) ?? [];
    const slot = this.findFirstSchedulableSlot(
      candidateStart,
      workOrder.data.durationMinutes,
      workCenter,
      schedule,
    );

    const interval: ScheduledInterval = {
      start: slot.start,
      end: slot.end,
      workOrderId: workOrder.docId,
      isMaintenance: false,
      originalStart,
      originalEnd,
    };

    this.trackScheduledInterval(state, workOrder.data.workCenterId, interval, schedule);

    const reasons = [
      ...(dependencyReadyAt > originalStart ? ['dependencies'] : []),
      ...slot.reasons,
    ];
    const explanation =
      reasons.length > 0
        ? `Work order ${workOrder.docId} moved due to ${reasons.join(', ')}.`
        : null;

    this.recordScheduleOutcome(workOrder, slot.start, slot.end, reasons, explanation, state);
  }

  private recordScheduleOutcome(
    workOrder: WorkOrderDocument,
    start: DateTime,
    end: DateTime,
    reasons: string[],
    explanation: string | null,
    state: ScheduleState,
  ): void {
    const change = this.buildChange(workOrder, start, end, reasons);
    if (change) {
      state.changes.push(change);
    }

    state.updatedWorkOrders.push({
      docId: workOrder.docId,
      docType: workOrder.docType,
      data: {
        ...workOrder.data,
        startDate: this.formatIso(start),
        endDate: this.formatIso(end),
      },
    });

    if (explanation) {
      state.explanation.push(explanation);
    }
  }

  private toUtc(iso: string): DateTime {
    return DateTime.fromISO(iso, { zone: 'utc' }).setZone('utc');
  }

  private formatIso(dt: DateTime): string {
    return (
      dt.toUTC().toISO({ suppressMilliseconds: true }) ?? dt.toUTC().toISO() ?? dt.toISO() ?? ''
    );
  }

  private getWorkCenterById(
    workCenterId: string,
    workCenters: Map<string, WorkCenterDocument>,
  ): WorkCenterData {
    const wc = workCenters.get(workCenterId);
    if (!wc) {
      throw new Error(`Work center not found for work order workCenterId=${workCenterId}`);
    }
    return wc.data;
  }

  private trackScheduledInterval(
    state: ScheduleState,
    workCenterId: string,
    interval: ScheduledInterval,
    schedule?: ScheduledInterval[],
  ): void {
    const list = schedule ?? state.scheduleByCenter.get(workCenterId) ?? [];

    const idx = list.findIndex((s) => interval.start < s.start);

    if (idx === -1) {
      list.push(interval);
    } else {
      list.splice(idx, 0, interval);
    }

    state.scheduleByCenter.set(workCenterId, list);
    state.completed.set(interval.workOrderId, interval);
  }

  private intervalsOverlap(a: ScheduledInterval, b: ScheduledInterval): boolean {
    return a.start < b.end && b.start < a.end;
  }

  private findFirstSchedulableSlot(
    candidateStart: DateTime,
    durationMinutes: number,
    workCenter: WorkCenterData,
    occupied: ScheduledInterval[],
  ): { start: DateTime; end: DateTime; reasons: string[] } {
    let cursor = candidateStart;
    let safety = 0;
    const reasons = new Set<string>();

    while (safety++ < MAX_SLOT_SEARCH_ITERATIONS) {
      const shiftAligned = nextShiftStart(cursor, workCenter);

      if (shiftAligned == null) throw new Error(`No available shift after ${cursor.toISO()}`);
      if (shiftAligned > cursor) reasons.add('shift/maintenance alignment');

      cursor = shiftAligned;

      const { end } = addWorkingMinutes(cursor, durationMinutes, workCenter);
      const conflict = occupied.find((slot) =>
        this.intervalsOverlap(
          {
            start: cursor,
            end,
            workOrderId: 'candidate',
            isMaintenance: false,
            originalStart: cursor,
            originalEnd: end,
          },
          slot,
        ),
      );

      if (!conflict) {
        return { start: cursor, end, reasons: Array.from(reasons) };
      }

      cursor = conflict.end;
      reasons.add('work center conflict');
    }

    throw new Error('Exceeded search iterations while finding slot.');
  }

  private resolveDependencyReadyAt(
    workOrder: WorkOrderDocument,
    completed: Map<string, ScheduledInterval>,
  ): DateTime {
    if (workOrder.data.dependsOnWorkOrderIds.length === 0) {
      return this.toUtc(workOrder.data.startDate);
    }

    let latest: DateTime | null = null;
    for (const parentId of workOrder.data.dependsOnWorkOrderIds) {
      const parent = completed.get(parentId);
      if (!parent) {
        throw new Error(
          `Dependency order violated: ${workOrder.docId} depends on ${parentId} which is not scheduled yet`,
        );
      }
      if (latest == null || parent.end > latest) {
        latest = parent.end;
      }
    }

    return latest ?? this.toUtc(workOrder.data.startDate);
  }

  private buildChange(
    workOrder: WorkOrderDocument,
    start: DateTime,
    end: DateTime,
    reasons: string[],
  ): ReflowChange | null {
    const origStart = this.toUtc(workOrder.data.startDate);
    const origEnd = this.toUtc(workOrder.data.endDate);
    const deltaMinutes = Math.round(end.diff(origEnd, 'minutes').minutes);
    const moved = deltaMinutes !== 0 || !start.equals(origStart);

    if (!moved) return null;

    return {
      workOrderId: workOrder.docId,
      fromStart: this.formatIso(origStart),
      fromEnd: this.formatIso(origEnd),
      toStart: this.formatIso(start),
      toEnd: this.formatIso(end),
      deltaMinutes,
      reasons,
    };
  }
}
