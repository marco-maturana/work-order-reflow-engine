# Production Schedule Reflow Engine

Simple CLI for rescheduling manufacturing work orders after disruptions while respecting dependencies, shifts, and maintenance windows.

## Goal

Given a scenario with work orders, work centers, and manufacturing orders, produce a valid reflowed schedule that:

- Respects dependencies (all parents complete before child starts).
- Prevents overlaps on the same work center.
- Works only during shifts and pauses outside shift hours.
- Avoids maintenance windows.
- Keeps maintenance work orders fixed.

## Planned input format (scenario JSON)

Each document follows:

```json
{
  "docId": "string",
  "docType": "workOrder | workCenter | manufacturingOrder",
  "data": {}
}
```

Work order data:

```json
{
  "workOrderNumber": "string",
  "manufacturingOrderId": "string",
  "workCenterId": "string",
  "startDate": "ISO-8601 UTC",
  "endDate": "ISO-8601 UTC",
  "durationMinutes": 120,
  "isMaintenance": false,
  "dependsOnWorkOrderIds": ["string"]
}
```

Work center data:

```json
{
  "name": "string",
  "shifts": [{ "dayOfWeek": 1, "startHour": 8, "endHour": 17 }],
  "maintenanceWindows": [{ "startDate": "ISO-8601 UTC", "endDate": "ISO-8601 UTC" }]
}
```

## Expected output

- Updated work orders with new start/end dates.
- List of changes (what moved, by how many minutes, why).
- Human-readable explanation of the reflow.
- Validation result (pass/fail with details).

## Sample scenarios (planned)

- 3 scenarios: delay cascade, maintenance conflict, and multi-parent dependencies.

## Intended CLI usage

```bash
npm run dev -- data/scenario1.delay-cascade.json
```

## Tech stack (mandatory)

- Node.js 22
- TypeScript
- Luxon
- Jest
- ESLint + Prettier

## Notes

- All dates are handled in UTC.
- Work duration is measured in working minutes, not wall-clock minutes.
- Input `endDate` is accepted but recalculated during reflow.
- Incomplete or future enhancements should be tagged with `@upgrade`.
