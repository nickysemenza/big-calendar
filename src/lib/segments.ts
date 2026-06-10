import type { ConsolidatedEvent } from "./consolidate";

// Size configuration for grid layouts
export interface SizeConfig {
  minRowHeight: number;
  headerHeight: number;
  eventHeight: number;
  isLarge?: boolean;
}

export const DEFAULT_SIZES: SizeConfig = {
  minRowHeight: 26,
  headerHeight: 11,
  eventHeight: 10,
};

// Event segment data for positioned event bars
export interface EventSegmentData {
  event: ConsolidatedEvent;
  rowStart: number;
  colStart: number;
  colEnd: number; // exclusive
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

    if (startIdx === undefined) {
      if (startDate < firstDateStr) {
        startIdx = 0;
      } else {
        continue;
      }
    }

    if (endIdx === undefined) {
      if (endDate > lastDateStr) {
        endIdx = totalCells;
      } else {
        continue;
      }
    }

    let currentIdx = startIdx;
    while (currentIdx < endIdx) {
      const rowStart = Math.floor(currentIdx / cols);
      const rowStartCol = currentIdx % cols;
      const rowEndCol = Math.min(cols, rowStartCol + (endIdx - currentIdx));

      eventSegments.push({
        event,
        rowStart,
        colStart: rowStartCol,
        colEnd: rowEndCol,
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

    // Clamp to year
    if (startDate < firstDateStr) startDate = firstDateStr;
    if (endDate > `${year + 1}-01-01`) endDate = `${year + 1}-01-01`;
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

// CSS grid-template-rows: each row fits its stacked events but can grow
export function computeRowHeights(
  maxSlotPerRow: Map<number, number>,
  rowCount: number,
  sizes: SizeConfig = DEFAULT_SIZES,
): string {
  const heights: string[] = [];
  for (let row = 0; row < rowCount; row++) {
    const maxSlot = maxSlotPerRow.get(row) ?? -1;
    const minHeight = Math.max(
      sizes.minRowHeight,
      sizes.headerHeight + (maxSlot + 1) * sizes.eventHeight + 4,
    );
    // Use minmax so rows fill available space but respect minimum for events
    heights.push(`minmax(${minHeight}px, 1fr)`);
  }
  return heights.join(" ");
}
