import type { CalendarEvent } from "./validators";

// Consolidated event - multiple colors/calendars instead of single
export type ConsolidatedEvent = Omit<
  CalendarEvent,
  "color" | "calendarName" | "calendarId"
> & {
  colors: string[];
  calendarNames: string[];
};

// "occurrence": same name AND same start/end merge (for grid segments)
// "name": same name merges regardless of dates (for day popups)
export type ConsolidationMode = "occurrence" | "name";

// Merge events that appear on multiple calendars into one with all colors
export function consolidateEvents(
  events: CalendarEvent[],
  mode: ConsolidationMode,
): ConsolidatedEvent[] {
  const byKey = new Map<string, CalendarEvent[]>();

  for (const event of events) {
    const name = event.summary.toLowerCase().trim();
    const key =
      mode === "occurrence" ? `${name}|${event.start}|${event.end}` : name;
    if (!byKey.has(key)) {
      byKey.set(key, []);
    }
    byKey.get(key)!.push(event);
  }

  const result: ConsolidatedEvent[] = [];
  for (const [, group] of byKey) {
    const colorSet = new Set<string>();
    const calendarSet = new Set<string>();
    let isAllDay = true;
    let isRecurring = false;

    for (const event of group) {
      colorSet.add(event.color);
      calendarSet.add(event.calendarName);
      if (!event.isAllDay) isAllDay = false;
      if (event.isRecurring) isRecurring = true;
    }

    result.push({
      id: group[0].id,
      summary: group[0].summary,
      start: group[0].start,
      end: group[0].end,
      startTime: group[0].startTime,
      endTime: group[0].endTime,
      colors: [...colorSet],
      calendarNames: [...calendarSet],
      isAllDay,
      isRecurring,
    });
  }

  return result;
}

// Get events covering a specific date (end is exclusive)
export function getEventsForDate(
  events: CalendarEvent[],
  dateStr: string,
): CalendarEvent[] {
  return events.filter(
    (event) => event.start <= dateStr && event.end > dateStr,
  );
}
