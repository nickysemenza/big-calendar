import { describe, expect, it } from "vitest";
import type { ConsolidatedEvent } from "./consolidate";
import {
  assignSlots,
  computeEventSegments,
  computeMonthEventSegments,
  computeRowHeights,
  type EventSegmentData,
} from "./segments";

function makeConsolidated(
  overrides: Partial<ConsolidatedEvent> = {},
): ConsolidatedEvent {
  return {
    id: "e1",
    summary: "Trip",
    start: "2025-01-24",
    end: "2025-01-29",
    colors: ["#ff0000"],
    calendarNames: ["Personal"],
    isAllDay: true,
    isRecurring: false,
    ...overrides,
  };
}

// dateToIndex for a continuous Jan 2025 grid (index = day - 1)
function janDateToIndex(): Map<string, number> {
  const map = new Map<string, number>();
  for (let day = 1; day <= 31; day++) {
    map.set(`2025-01-${String(day).padStart(2, "0")}`, day - 1);
  }
  return map;
}

describe("computeEventSegments", () => {
  it("wraps a multi-day event across grid rows", () => {
    // 5-day event starting at index 23 in a 25-col grid:
    // 2 cells in row 0, then 3 cells in row 1
    const events = [
      makeConsolidated({ start: "2025-01-24", end: "2025-01-29" }),
    ];
    const { segmentsByRow } = computeEventSegments(
      events,
      janDateToIndex(),
      31,
      25,
    );
    expect(segmentsByRow.get(0)).toMatchObject([
      { rowStart: 0, colStart: 23, colEnd: 25 },
    ]);
    expect(segmentsByRow.get(1)).toMatchObject([
      { rowStart: 1, colStart: 0, colEnd: 3 },
    ]);
  });

  it("clamps events that start before the first visible date", () => {
    const events = [
      makeConsolidated({ start: "2024-12-30", end: "2025-01-03" }),
    ];
    const { segmentsByRow } = computeEventSegments(
      events,
      janDateToIndex(),
      31,
      25,
    );
    expect(segmentsByRow.get(0)).toMatchObject([{ colStart: 0, colEnd: 2 }]);
  });

  it("skips events entirely outside the visible range", () => {
    const events = [
      makeConsolidated({ start: "2025-03-01", end: "2025-03-05" }),
    ];
    const { segmentsByRow } = computeEventSegments(
      events,
      janDateToIndex(),
      31,
      25,
    );
    expect(segmentsByRow.size).toBe(0);
  });
});

describe("computeMonthEventSegments", () => {
  it("splits an event spanning a month boundary into per-month segments", () => {
    const events = [
      makeConsolidated({ start: "2025-01-30", end: "2025-02-03" }),
    ];
    const { segmentsByRow } = computeMonthEventSegments(events, 2025);
    // Jan 30-31 in row 0, Feb 1-2 in row 1 (end exclusive)
    expect(segmentsByRow.get(0)).toMatchObject([
      { rowStart: 0, colStart: 29, colEnd: 31 },
    ]);
    expect(segmentsByRow.get(1)).toMatchObject([
      { rowStart: 1, colStart: 0, colEnd: 2 },
    ]);
  });
});

describe("assignSlots", () => {
  function seg(
    colStart: number,
    colEnd: number,
    rowStart = 0,
  ): EventSegmentData {
    return { event: makeConsolidated(), rowStart, colStart, colEnd };
  }

  it("stacks overlapping segments and reuses freed slots", () => {
    const a = seg(0, 5);
    const b = seg(2, 7); // overlaps a -> slot 1
    const c = seg(6, 9); // a has ended -> reuses slot 0
    const { segmentSlots, maxSlotPerRow } = assignSlots([a, b, c]);
    expect(segmentSlots.get(a)).toBe(0);
    expect(segmentSlots.get(b)).toBe(1);
    expect(segmentSlots.get(c)).toBe(0);
    expect(maxSlotPerRow.get(0)).toBe(1);
  });
});

describe("computeRowHeights", () => {
  it("grows rows with stacked events past the minimum height", () => {
    const maxSlotPerRow = new Map([
      [0, -1], // no events
      [1, 3], // 4 stacked events: 11 + 4*10 + 4 = 55 > 26
    ]);
    const result = computeRowHeights(maxSlotPerRow, 2);
    expect(result).toBe("minmax(26px, 1fr) minmax(55px, 1fr)");
  });
});
