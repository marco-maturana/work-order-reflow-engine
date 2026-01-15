import { DateTime } from 'luxon';
import { addWorkingMinutes } from '../utils/time';
import type { ReflowValidation, WorkCenterDocument, WorkOrderDocument } from './types';

const toUtc = (iso: string): DateTime => DateTime.fromISO(iso, { zone: 'utc' }).setZone('utc');

export function validateSchedule(
  workOrders: WorkOrderDocument[],
  workCenters: WorkCenterDocument[],
): ReflowValidation {
  const errors: string[] = [];
  const byId = new Map(workOrders.map((wo) => [wo.docId, wo]));

  // Dependencies
  workOrders.forEach((wo) => {
    const start = toUtc(wo.data.startDate);
    wo.data.dependsOnWorkOrderIds.forEach((parentId) => {
      const parent = byId.get(parentId);
      if (!parent) {
        errors.push(`Work order ${wo.docId} depends on missing parent ${parentId}`);
        return;
      }
      const parentEnd = toUtc(parent.data.endDate);
      if (start < parentEnd) {
        errors.push(`Dependency violation: ${wo.docId} starts before ${parentId} ends`);
      }
    });
  });

  // Work center checks
  workCenters.forEach((wc) => {
    const assigned = workOrders.filter((wo) => wo.data.workCenterId === wc.docId);
    const intervals = assigned
      .map((wo) => ({
        id: wo.docId,
        start: toUtc(wo.data.startDate),
        end: toUtc(wo.data.endDate),
        duration: wo.data.durationMinutes,
        isMaintenance: wo.data.isMaintenance,
      }))
      .sort((a, b) => a.start.toMillis() - b.start.toMillis());

    // Overlaps and maintenance windows
    intervals.forEach((int, idx) => {
      if (int.end <= int.start) {
        errors.push(`Invalid interval for ${int.id}: end before start`);
      }

      if (idx > 0) {
        const prev = intervals[idx - 1];
        if (!int.isMaintenance && !prev.isMaintenance && int.start < prev.end) {
          errors.push(`Overlap on work center ${wc.docId}: ${prev.id} overlaps ${int.id}`);
        }
      }

      if (!int.isMaintenance) {
        try {
          const recomputed = addWorkingMinutes(int.start, int.duration, wc.data);
          if (!recomputed.end.equals(int.end)) {
            errors.push(`Work order ${int.id} not aligned to shifts/maintenance on ${wc.docId}`);
          }
        } catch (err) {
          errors.push(
            `Work order ${int.id} invalid working window on ${wc.docId}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      } else {
        const duration = int.end.diff(int.start, 'minutes').minutes;
        if (Math.round(duration) !== int.duration) {
          errors.push(`Maintenance ${int.id} duration mismatch original durationMinutes`);
        }
      }
    });
  });

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}
