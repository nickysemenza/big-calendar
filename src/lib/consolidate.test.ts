import { describe, expect, it } from "vitest";
import { consolidateEvents, getEventsForDate } from "./consolidate";
import type { CalendarEvent } from "./validators";

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "e1",
    summary: "Trip",
    start: "2025-05-01",
    end: "2025-05-03",
    calendarId: "cal-a",
    calendarName: "Personal",
    color: "#ff0000",
    isAllDay: true,
    isRecurring: false,
    ...overrides,
  };
}

describe("consolidateEvents", () => {
  it("merges same name + same dates across calendars in occurrence mode", () => {
    const events = [
      makeEvent({ id: "a", calendarId: "cal-a", calendarName: "Personal" }),
      makeEvent({
        id: "b",
        calendarId: "cal-b",
        calendarName: "Shared",
        color: "#00ff00",
      }),
    ];
    const result = consolidateEvents(events, "occurrence");
    expect(result).toHaveLength(1);
    expect(result[0].colors).toEqual(["#ff0000", "#00ff00"]);
    expect(result[0].calendarNames).toEqual(["Personal", "Shared"]);
  });

  it("keeps separate occurrences in occurrence mode but merges them in name mode", () => {
    const events = [
      makeEvent({ id: "a", start: "2025-05-01", end: "2025-05-03" }),
      makeEvent({ id: "b", start: "2025-08-01", end: "2025-08-03" }),
    ];
    expect(consolidateEvents(events, "occurrence")).toHaveLength(2);
    expect(consolidateEvents(events, "name")).toHaveLength(1);
  });

  it("matches names case- and whitespace-insensitively", () => {
    const events = [
      makeEvent({ id: "a", summary: " Trip " }),
      makeEvent({ id: "b", summary: "trip" }),
    ];
    expect(consolidateEvents(events, "occurrence")).toHaveLength(1);
  });

  it("is all-day only when every member is all-day, recurring when any is", () => {
    const events = [
      makeEvent({ id: "a", isAllDay: true, isRecurring: false }),
      makeEvent({ id: "b", isAllDay: false, isRecurring: true }),
    ];
    const [merged] = consolidateEvents(events, "occurrence");
    expect(merged.isAllDay).toBe(false);
    expect(merged.isRecurring).toBe(true);
  });
});

describe("getEventsForDate", () => {
  it("includes the start day and excludes the (exclusive) end day", () => {
    const events = [makeEvent({ start: "2025-05-01", end: "2025-05-03" })];
    expect(getEventsForDate(events, "2025-04-30")).toHaveLength(0);
    expect(getEventsForDate(events, "2025-05-01")).toHaveLength(1);
    expect(getEventsForDate(events, "2025-05-02")).toHaveLength(1);
    expect(getEventsForDate(events, "2025-05-03")).toHaveLength(0);
  });
});
