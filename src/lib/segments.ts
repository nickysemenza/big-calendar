import type { ConsolidatedEvent } from "./consolidate";

// Event segment data for positioned event bars
export interface EventSegmentData {
  event: ConsolidatedEvent;
  rowStart: number;
  colStart: number;
  colEnd: number; // exclusive
  isEventStart: boolean; // false when the event continues from an earlier row/clamp
  isEventEnd: boolean; // false when the event continues past this segment
}

export interface SegmentLayout {
  segmentsByRow: Map<number, EventSegmentData[]>;
  segmentSlots: Map<EventSegmentData, number>;
  maxSlotPerRow: Map<number, number>;
}

// Split events into per-row segments for a continuous grid of `cols` columns,
// where dateToIndex maps each visible date to its cell index
export function computeEventSegments(
  events: ConsolidatedEvent[],
  dateToIndex: Map<string, number>,
  totalCells: number,
  cols: number,
): SegmentLayout {
  const eventSegments: EventSegmentData[] = [];
  const firstDateStr = [...dateToIndex.keys()][0];
  const lastDateStr = [...dateToIndex.keys()].pop()!;

  for (const event of events) {
    const startDate = event.start;
    const endDate = event.end;

    let startIdx = dateToIndex.get(startDate);
    let endIdx = dateToIndex.get(endDate);
    let startClamped = false;
    let endClamped = false;

    if (startIdx === undefined) {
      if (startDate < firstDateStr) {
        startIdx = 0;
        startClamped = true;
      } else {
        continue;
      }
    }

    if (endIdx === undefined) {
      if (endDate > lastDateStr) {
        endIdx = totalCells;
        endClamped = true;
      } else {
        continue;
      }
    }

    let currentIdx = startIdx;
    while (currentIdx < endIdx) {
      const rowStart = Math.floor(currentIdx / cols);
      const rowStartCol = currentIdx % cols;
      const rowEndCol = Math.min(cols, rowStartCol + (endIdx - currentIdx));
      const segmentEndIdx = rowStart * cols + rowEndCol;

      eventSegments.push({
        event,
        rowStart,
        colStart: rowStartCol,
        colEnd: rowEndCol,
        isEventStart: currentIdx === startIdx && !startClamped,
        isEventEnd: segmentEndIdx === endIdx && !endClamped,
      });

      currentIdx = (rowStart + 1) * cols;
    }
  }

  return assignSlots(eventSegments);
}

// Split events into per-month segments for the month-row grid
// (row = month index, col = day of month - 1)
export function computeMonthEventSegments(
  events: ConsolidatedEvent[],
  year: number,
): SegmentLayout {
  const eventSegments: EventSegmentData[] = [];
  const firstDateStr = `${year}-01-01`;

  for (const event of events) {
    let startDate = event.start;
    let endDate = event.end;
    let startClamped = false;
    let endClamped = false;

    // Clamp to year
    if (startDate < firstDateStr) {
      startDate = firstDateStr;
      startClamped = true;
    }
    if (endDate > `${year + 1}-01-01`) {
      endDate = `${year + 1}-01-01`;
      endClamped = true;
    }
    if (startDate >= endDate) continue;

    // Parse dates
    const startParts = startDate.split("-").map(Number);
    const endParts = endDate.split("-").map(Number);

    // endDate is exclusive, so get the last actual day
    const endActual = new Date(endParts[0], endParts[1] - 1, endParts[2]);
    endActual.setDate(endActual.getDate() - 1);
    const endMonth = endActual.getMonth();
    const endDay = endActual.getDate();

    const startMonth = startParts[1] - 1;
    const startDay = startParts[2];

    // Split by month
    for (let month = startMonth; month <= endMonth; month++) {
      const daysInThisMonth = new Date(year, month + 1, 0).getDate();

      const segStartCol = month === startMonth ? startDay - 1 : 0;
      const segEndCol = month === endMonth ? endDay : daysInThisMonth;

      eventSegments.push({
        event,
        rowStart: month,
        colStart: segStartCol,
        colEnd: segEndCol,
        isEventStart: month === startMonth && !startClamped,
        isEventEnd: month === endMonth && !endClamped,
      });
    }
  }

  return assignSlots(eventSegments);
}

// Stack overlapping segments within each row into the lowest free slot
export function assignSlots(eventSegments: EventSegmentData[]): SegmentLayout {
  const segmentsByRow = new Map<number, EventSegmentData[]>();
  for (const seg of eventSegments) {
    const row = seg.rowStart;
    if (!segmentsByRow.has(row)) {
      segmentsByRow.set(row, []);
    }
    segmentsByRow.get(row)!.push(seg);
  }

  const segmentSlots = new Map<EventSegmentData, number>();
  const maxSlotPerRow = new Map<number, number>();

  for (const [row, rowSegments] of segmentsByRow) {
    rowSegments.sort((a, b) => {
      if (a.colStart !== b.colStart) return a.colStart - b.colStart;
      return b.colEnd - b.colStart - (a.colEnd - a.colStart);
    });

    const slots: { end: number }[] = [];
    for (const seg of rowSegments) {
      let slotIdx = slots.findIndex((s) => s.end <= seg.colStart);
      if (slotIdx === -1) {
        slotIdx = slots.length;
        slots.push({ end: seg.colEnd });
      } else {
        slots[slotIdx].end = seg.colEnd;
      }
      segmentSlots.set(seg, slotIdx);
    }

    // Track max slot used in this row
    maxSlotPerRow.set(row, slots.length > 0 ? slots.length - 1 : -1);
  }

  return { segmentsByRow, segmentSlots, maxSlotPerRow };
}

// CSS grid-template-rows: each row fits its stacked events but can grow.
// Sizes come from the --cal-* custom properties in style.css so that the
// 2xl media query (not JS, which only runs server-side) picks the values.
export function computeRowHeights(
  maxSlotPerRow: Map<number, number>,
  rowCount: number,
): string {
  const heights: string[] = [];
  for (let row = 0; row < rowCount; row++) {
    const maxSlot = maxSlotPerRow.get(row) ?? -1;
    // Use minmax so rows fill available space but respect minimum for events
    if (maxSlot < 0) {
      heights.push("minmax(var(--cal-row-min), 1fr)");
    } else {
      heights.push(
        `minmax(max(var(--cal-row-min), calc(var(--cal-header-h) + ${maxSlot + 1} * var(--cal-event-h) + 4px)), 1fr)`,
      );
    }
  }
  return heights.join(" ");
}
