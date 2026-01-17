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

const MAX_SLOT_SEARCH_ITERATIONS = 200;

export class ReflowService {
  async reflow(input: ReflowInput): Promise<ReflowResult> {
    const workOrders = input.documents.filter(
      (doc) => doc.docType === 'workOrder',
    ) as WorkOrderDocument[];
    const workCenters = input.documents.filter(
      (doc) => doc.docType === 'workCenter',
    ) as WorkCenterDocument[];

    const topoOrder = topologicalSort(workOrders);
    const workOrderById = new Map(workOrders.map((wo) => [wo.docId, wo]));
    const orderedWorkOrders = topoOrder.map((id) => workOrderById.get(id)!);

    const workCenterMap = new Map(workCenters.map((wc) => [wc.docId, wc]));
    const completed = new Map<string, ScheduledInterval>();
    const scheduleByCenter: ScheduleByCenter = new Map();
    const changes: ReflowChange[] = [];
    const updatedWorkOrders: WorkOrderDocument[] = [];
    const explanation: string[] = [];

    for (const wo of orderedWorkOrders) {
      const wcData = this.getWorkCenter(wo.data.workCenterId, workCenterMap);
      const originalStart = this.toUtc(wo.data.startDate);
      const originalEnd = this.toUtc(wo.data.endDate);

      if (wo.data.isMaintenance) {
        const interval: ScheduledInterval = {
          start: originalStart,
          end: originalEnd,
          workOrderId: wo.docId,
          isMaintenance: true,
          originalStart,
          originalEnd,
        };
        const schedule = scheduleByCenter.get(wo.data.workCenterId) ?? [];
        this.insertInterval(schedule, interval);
        scheduleByCenter.set(wo.data.workCenterId, schedule);
        completed.set(wo.docId, interval);
        const change = this.computeChanges(wo, originalStart, originalEnd, [
          'maintenance not rescheduled',
        ]);
        if (change) {
          changes.push(change);
        }
        updatedWorkOrders.push({
          ...wo,
          data: {
            ...wo.data,
            startDate: this.formatIso(originalStart),
            endDate: this.formatIso(originalEnd),
          },
        });
        explanation.push(`Maintenance work order ${wo.docId} kept at original time.`);
        continue;
      }

      const earliestFromDeps = this.computeEarliestDependencyEnd(wo, completed);
      const candidateStart = earliestFromDeps > originalStart ? earliestFromDeps : originalStart;

      const schedule = scheduleByCenter.get(wo.data.workCenterId) ?? [];
      const slot = this.findNextAvailableSlot(
        candidateStart,
        wo.data.durationMinutes,
        wcData,
        schedule,
      );

      const interval: ScheduledInterval = {
        start: slot.start,
        end: slot.end,
        workOrderId: wo.docId,
        isMaintenance: false,
        originalStart,
        originalEnd,
      };
      this.insertInterval(schedule, interval);
      scheduleByCenter.set(wo.data.workCenterId, schedule);
      completed.set(wo.docId, interval);

      const reasons = [
        ...(earliestFromDeps > originalStart ? ['dependencies'] : []),
        ...slot.reasons,
      ];

      const change = this.computeChanges(wo, slot.start, slot.end, reasons);
      if (change) {
        changes.push(change);
      }
      updatedWorkOrders.push({
        ...wo,
        data: {
          ...wo.data,
          startDate: this.formatIso(slot.start),
          endDate: this.formatIso(slot.end),
        },
      });

      if (reasons.length > 0) {
        explanation.push(`Work order ${wo.docId} moved due to ${reasons.join(', ')}.`);
      }
    }

    const validation = validateSchedule(updatedWorkOrders, workCenters);

    return {
      updatedWorkOrders,
      changes,
      explanation,
      validation,
    };
  }

  private toUtc(iso: string): DateTime {
    return DateTime.fromISO(iso, { zone: 'utc' }).setZone('utc');
  }

  private formatIso(dt: DateTime): string {
    return (
      dt.toUTC().toISO({ suppressMilliseconds: true }) ?? dt.toUTC().toISO() ?? dt.toISO() ?? ''
    );
  }

  private getWorkCenter(
    workCenterId: string,
    workCenters: Map<string, WorkCenterDocument>,
  ): WorkCenterData {
    const wc = workCenters.get(workCenterId);
    if (!wc) {
      throw new Error(`Work center not found for work order workCenterId=${workCenterId}`);
    }
    return wc.data;
  }

  private insertInterval(schedule: ScheduledInterval[], interval: ScheduledInterval): void {
    const idx = schedule.findIndex((s) => interval.start < s.start);
    if (idx === -1) {
      schedule.push(interval);
    } else {
      schedule.splice(idx, 0, interval);
    }
  }

  private overlaps(a: ScheduledInterval, b: ScheduledInterval): boolean {
    return a.start < b.end && b.start < a.end;
  }

  private findNextAvailableSlot(
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
      const conflict = occupied.find(
        (slot) =>
          !slot.isMaintenance &&
          this.overlaps(
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

  private computeEarliestDependencyEnd(
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

  private computeChanges(
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
