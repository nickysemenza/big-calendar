import type { CalendarEvent } from "../env";
import { shortHash } from "../env";
import type { View } from "../lib/validators";
import {
  getAllDaysOfYear,
  formatDate,
  getMonthAbbrev,
  getDaysInMonth,
  DAY_ABBREVS,
  MONTH_ABBREVS,
} from "../lib/dates";
import type { ConsolidatedEvent, ConsolidatedCalendarEvent, SizeConfig, EventSegmentData } from "./ui/types";
import { EventSegment } from "./ui/EventSegment";
import { DayPopover } from "./ui/DayPopover";

// Responsive sizes for large monitors (≥1536px / 2xl breakpoint)
// Uses CSS media queries for styling via Tailwind 2xl: prefix
// Returns JS values for inline styles that can't use CSS
function useResponsiveSizes() {
  // Check if we're on a large screen (SSR-safe - returns false during SSR)
  const isLarge = typeof window !== "undefined" && window.matchMedia("(min-width: 1536px)").matches;

  return {
    minRowHeight: isLarge ? 38 : 26,
    headerHeight: isLarge ? 14 : 11,
    eventHeight: isLarge ? 13 : 10,
    isLarge,
  };
}


// Consolidate events with same name AND same start/end into one
function consolidateCalendarEvents(events: CalendarEvent[]): ConsolidatedCalendarEvent[] {
  const byKey = new Map<string, CalendarEvent[]>();

  for (const event of events) {
    // Key by normalized name + exact dates
    const key = `${event.summary.toLowerCase().trim()}|${event.start}|${event.end}`;
    if (!byKey.has(key)) {
      byKey.set(key, []);
    }
    byKey.get(key)!.push(event);
  }

  const result: ConsolidatedCalendarEvent[] = [];
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
      colors: [...colorSet],
      calendarNames: [...calendarSet],
      isAllDay,
      isRecurring,
    });
  }

  return result;
}

interface Props {
  year: number;
  events: CalendarEvent[];
  view: View;
  hideCalendars: string;
  hideEvents: string;
  showTimed: boolean;
  hideRecurring: boolean;
  wideMode: boolean;
}

// Row height defaults (overridden by useResponsiveSizes on large screens)
const DEFAULT_MIN_ROW_HEIGHT = 26;
const DEFAULT_HEADER_HEIGHT = 11;
const DEFAULT_EVENT_HEIGHT = 10;

// Helper to determine background class for day cells
function getDayBackgroundClass(options: {
  isOutsideScope?: boolean;
  isWeekend: boolean;
  isOddMonth: boolean;
}): string {
  if (options.isOutsideScope) return "bg-gray-100";
  if (options.isWeekend) return "bg-sky-50";
  if (options.isOddMonth) return "bg-gray-50";
  return "bg-white";
}

// Helper to determine day number text class
function getDayNumberClass(options: {
  isOutsideScope?: boolean;
  isToday: boolean;
  isFirstOfMonth: boolean;
}): string {
  if (options.isOutsideScope) return "text-gray-300";
  if (options.isToday) return "text-orange-500 font-bold";
  if (options.isFirstOfMonth) return "text-orange-600 font-bold";
  return "text-gray-600";
}

// Helper to get events for a specific date
function getEventsForDate(events: CalendarEvent[], dateStr: string): CalendarEvent[] {
  return events.filter((event) => event.start <= dateStr && event.end > dateStr);
}


// Consolidate events with the same name into one with multiple colors (for popup)
function consolidateEvents(events: CalendarEvent[]): ConsolidatedEvent[] {
  const byName = new Map<string, CalendarEvent[]>();

  for (const event of events) {
    const key = event.summary.toLowerCase().trim();
    if (!byName.has(key)) {
      byName.set(key, []);
    }
    byName.get(key)!.push(event);
  }

  const result: ConsolidatedEvent[] = [];
  for (const [, group] of byName) {
    // Get unique colors
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


function computeRowHeights(
  maxSlotPerRow: Map<number, number>,
  rowCount: number,
  sizes: SizeConfig = { minRowHeight: DEFAULT_MIN_ROW_HEIGHT, headerHeight: DEFAULT_HEADER_HEIGHT, eventHeight: DEFAULT_EVENT_HEIGHT }
): string {
  const heights: string[] = [];
  for (let row = 0; row < rowCount; row++) {
    const maxSlot = maxSlotPerRow.get(row) ?? -1;
    const minHeight = Math.max(
      sizes.minRowHeight,
      sizes.headerHeight + (maxSlot + 1) * sizes.eventHeight + 4
    );
    // Use minmax so rows fill available space but respect minimum for events
    heights.push(`minmax(${minHeight}px, 1fr)`);
  }
  return heights.join(" ");
}

export function YearCalendar({ year, events, view, hideCalendars, hideEvents, showTimed, hideRecurring, wideMode }: Props) {
  // Build base URL params for hide links
  const baseParams = new URLSearchParams();
  baseParams.set("year", String(year));
  baseParams.set("view", view);
  if (hideCalendars) baseParams.set("hide", hideCalendars);
  if (showTimed) baseParams.set("timed", "true");
  if (hideRecurring) baseParams.set("hideRecurring", "true");
  if (wideMode) baseParams.set("wideMode", "true");

  // Helper to build URL that adds an event hash to hidden list
  function buildHideEventUrl(eventName: string): string {
    const eventHash = shortHash(eventName.toLowerCase());
    const currentHashes = hideEvents ? hideEvents.split(",") : [];
    if (!currentHashes.includes(eventHash)) {
      currentHashes.push(eventHash);
    }
    const params = new URLSearchParams(baseParams);
    params.set("hideEvents", currentHashes.join(","));
    return `/?${params.toString()}`;
  }

  if (view === "month") {
    return <MonthRowGrid year={year} events={events} buildHideEventUrl={buildHideEventUrl} />;
  }
  if (view === "weekends") {
    return <WeekendsAlignedGrid year={year} events={events} buildHideEventUrl={buildHideEventUrl} wideMode={wideMode} />;
  }
  return <ContinuousGrid year={year} events={events} buildHideEventUrl={buildHideEventUrl} wideMode={wideMode} />;
}

// ============ CONTINUOUS GRID (25 cols × ~15 rows) ============

function ContinuousGrid({
  year,
  events,
  buildHideEventUrl,
  wideMode,
}: {
  year: number;
  events: CalendarEvent[];
  buildHideEventUrl: (eventName: string) => string;
  wideMode: boolean;
}) {
  const COLS = wideMode ? 15 : 25;
  const allDays = getAllDaysOfYear(year);
  const today = formatDate(new Date());
  const sizes = useResponsiveSizes();

  // Consolidate duplicate events (same name + same dates)
  const consolidatedEvents = consolidateCalendarEvents(events);

  // Create a map of date string -> cell index for quick lookup
  const dateToIndex = new Map<string, number>();
  allDays.forEach((day, i) => {
    dateToIndex.set(formatDate(day), i);
  });

  const totalCells = allDays.length;
  const rowCount = Math.ceil(totalCells / COLS);
  const { segmentsByRow, segmentSlots, maxSlotPerRow } = computeEventSegments(
    consolidatedEvents,
    dateToIndex,
    totalCells,
    COLS
  );

  return (
    <div class="flex-1 bg-white p-1 overflow-auto">
      <div
        class="grid gap-px bg-gray-200 h-full"
        style={`grid-template-columns: repeat(${COLS}, 1fr); grid-template-rows: ${computeRowHeights(maxSlotPerRow, rowCount, sizes)};`}
      >
        {allDays.map((day, idx) => {
          const dateStr = formatDate(day);
          const isToday = dateStr === today;
          const dayNum = day.getDate();
          const isFirstOfMonth = dayNum === 1;
          const dayOfWeek = day.getDay();
          const monthAbbrev = getMonthAbbrev(day);
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const isOddMonth = day.getMonth() % 2 === 1;

          const row = Math.floor(idx / COLS);
          const col = idx % COLS;
          const rowSegments = segmentsByRow.get(row) || [];
          const cellSegments = rowSegments.filter((s) => s.colStart === col);
          const dayEvents = consolidateEvents(getEventsForDate(events, dateStr));
          const bgClass = getDayBackgroundClass({ isWeekend, isOddMonth });
          const dayNumClass = getDayNumberClass({ isToday, isFirstOfMonth });

          return (
            <DayPopover
              key={dateStr}
              events={dayEvents}
              dateLabel={`${monthAbbrev} ${dayNum}`}
              buildHideEventUrl={buildHideEventUrl}
              isRightSide={col >= COLS / 2}
              isBottomHalf={row >= rowCount / 2}
            >
              <div
                class={`relative px-0.5 min-h-0 h-full ${bgClass} ${isToday ? "ring-1 ring-orange-400 ring-inset z-10" : ""}`}
              >
                <div class="flex items-baseline justify-between text-[8px] 2xl:text-[10px] leading-none">
                  <span class="flex items-baseline gap-px">
                    {isFirstOfMonth && (
                      <span class="font-black text-orange-600">{monthAbbrev}</span>
                    )}
                    <span class={`font-medium ${dayNumClass}`}>
                      {dayNum}
                    </span>
                  </span>
                  <span class="text-gray-400">{DAY_ABBREVS[dayOfWeek]}</span>
                </div>

                {cellSegments.map((seg, segIdx) => (
                  <EventSegment
                    key={`${seg.event.id}-${seg.rowStart}-${segIdx}`}
                    event={seg.event}
                    slot={segmentSlots.get(seg) || 0}
                    span={seg.colEnd - seg.colStart}
                    sizes={sizes}
                  />
                ))}
              </div>
            </DayPopover>
          );
        })}
      </div>
    </div>
  );
}

// ============ WEEKENDS ALIGNED GRID (28 cols = 4 weeks × 7 days) ============

function WeekendsAlignedGrid({
  year,
  events,
  buildHideEventUrl,
  wideMode,
}: {
  year: number;
  events: CalendarEvent[];
  buildHideEventUrl: (eventName: string) => string;
  wideMode: boolean;
}) {
  const COLS = wideMode ? 21 : 28; // 3 or 4 weeks × 7 days
  const today = formatDate(new Date());
  const sizes = useResponsiveSizes();

  // Consolidate duplicate events (same name + same dates)
  const consolidatedEvents = consolidateCalendarEvents(events);

  // Get all days of year and find the first Sunday on or before Jan 1
  const allDays = getAllDaysOfYear(year);
  const jan1 = new Date(year, 0, 1);
  const jan1DayOfWeek = jan1.getDay(); // 0 = Sunday

  // Build array of cells including padding days from prev/next year
  interface CellData {
    date: Date;
    dateStr: string;
    isInYear: boolean;
  }

  const cells: CellData[] = [];

  // Add padding days before Jan 1 (to align to Sunday)
  if (jan1DayOfWeek > 0) {
    for (let i = jan1DayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year - 1, 11, 31 - i);
      cells.push({ date: d, dateStr: formatDate(d), isInYear: false });
    }
  }

  // Add all days of the year
  for (const day of allDays) {
    cells.push({ date: day, dateStr: formatDate(day), isInYear: true });
  }

  // Add padding days after Dec 31 to complete the last row
  const remainder = cells.length % COLS;
  if (remainder > 0) {
    const padding = COLS - remainder;
    for (let i = 1; i <= padding; i++) {
      const d = new Date(year + 1, 0, i);
      cells.push({ date: d, dateStr: formatDate(d), isInYear: false });
    }
  }

  // Create a map of date string -> cell index for quick lookup
  const dateToIndex = new Map<string, number>();
  cells.forEach((cell, i) => {
    dateToIndex.set(cell.dateStr, i);
  });

  const rowCount = Math.ceil(cells.length / COLS);
  const { segmentsByRow, segmentSlots, maxSlotPerRow } = computeEventSegments(
    consolidatedEvents,
    dateToIndex,
    cells.length,
    COLS
  );

  return (
    <div class="flex-1 bg-white p-1 overflow-auto">
      {/* Day of week header */}
      <div
        class="grid gap-px bg-gray-200 mb-px"
        style={`grid-template-columns: repeat(${COLS}, 1fr);`}
      >
        {Array.from({ length: COLS / 7 }).flatMap((_, weekIdx) =>
          DAY_ABBREVS.map((abbrev, dayIdx) => (
            <div
              key={`header-${weekIdx}-${dayIdx}`}
              class={`text-[7px] 2xl:text-[9px] text-center py-px font-medium ${
                dayIdx === 0 || dayIdx === 6 ? "bg-sky-100 text-sky-700" : "bg-gray-100 text-gray-500"
              }`}
            >
              {abbrev.charAt(0)}
            </div>
          ))
        )}
      </div>
      <div
        class="grid gap-px bg-gray-200 h-[calc(100%-14px)]"
        style={`grid-template-columns: repeat(${COLS}, 1fr); grid-template-rows: ${computeRowHeights(maxSlotPerRow, rowCount, sizes)};`}
      >
        {cells.map((cell, idx) => {
          const { date: day, dateStr, isInYear } = cell;
          const isToday = dateStr === today;
          const dayNum = day.getDate();
          const isFirstOfMonth = dayNum === 1;
          const dayOfWeek = day.getDay();
          const monthAbbrev = getMonthAbbrev(day);
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const isOddMonth = day.getMonth() % 2 === 1;

          const row = Math.floor(idx / COLS);
          const col = idx % COLS;
          const rowSegments = segmentsByRow.get(row) || [];
          const cellSegments = rowSegments.filter((s) => s.colStart === col);
          const dayEvents = isInYear ? consolidateEvents(getEventsForDate(events, dateStr)) : [];
          const bgClass = getDayBackgroundClass({ isOutsideScope: !isInYear, isWeekend, isOddMonth });
          const dayNumClass = getDayNumberClass({ isOutsideScope: !isInYear, isToday, isFirstOfMonth });

          return (
            <DayPopover
              key={`${dateStr}-${idx}`}
              events={dayEvents}
              dateLabel={`${monthAbbrev} ${dayNum}`}
              buildHideEventUrl={buildHideEventUrl}
              isRightSide={col >= COLS / 2}
              isBottomHalf={row >= rowCount / 2}
            >
              <div
                class={`relative px-0.5 min-h-0 h-full ${bgClass} ${isToday ? "ring-1 ring-orange-400 ring-inset z-10" : ""}`}
              >
                <div class="flex items-baseline gap-px text-[8px] 2xl:text-[10px] leading-none">
                  {isFirstOfMonth && isInYear && (
                    <span class="font-black text-orange-600">{monthAbbrev}</span>
                  )}
                  <span class={`font-medium ${dayNumClass}`}>
                    {dayNum}
                  </span>
                </div>

                {isInYear && cellSegments.map((seg, segIdx) => (
                  <EventSegment
                    key={`${seg.event.id}-${seg.rowStart}-${segIdx}`}
                    event={seg.event}
                    slot={segmentSlots.get(seg) || 0}
                    span={seg.colEnd - seg.colStart}
                    sizes={sizes}
                  />
                ))}
              </div>
            </DayPopover>
          );
        })}
      </div>
    </div>
  );
}

// ============ MONTH ROW GRID (31 cols × 12 rows) ============

function MonthRowGrid({
  year,
  events,
  buildHideEventUrl,
}: {
  year: number;
  events: CalendarEvent[];
  buildHideEventUrl: (eventName: string) => string;
}) {
  const today = formatDate(new Date());
  const COLS = 31;
  const sizes = useResponsiveSizes();

  // Consolidate duplicate events (same name + same dates)
  const consolidatedEvents = consolidateCalendarEvents(events);

  // Build month data
  const months = Array.from({ length: 12 }, (_, monthIdx) => {
    const daysInMonth = getDaysInMonth(year, monthIdx);
    return {
      monthIdx,
      days: daysInMonth,
      abbrev: MONTH_ABBREVS[monthIdx],
    };
  });

  // Create date -> (row, col) mapping for month view
  const dateToPos = new Map<string, { row: number; col: number }>();
  months.forEach((m, monthIdx) => {
    m.days.forEach((day) => {
      const dateStr = formatDate(day);
      const col = day.getDate() - 1; // 0-indexed column
      dateToPos.set(dateStr, { row: monthIdx, col });
    });
  });

  // Compute event segments for month view
  const { segmentsByRow, segmentSlots, maxSlotPerRow } = computeMonthEventSegments(
    consolidatedEvents,
    dateToPos,
    year,
    COLS
  );

  const monthLabelWidth = sizes.isLarge ? 32 : 24;

  return (
    <div class="flex-1 bg-white p-1 overflow-auto">
      <div class="grid h-full" style={`grid-template-columns: ${monthLabelWidth}px repeat(31, 1fr); grid-template-rows: ${computeRowHeights(maxSlotPerRow, 12, sizes)}; gap: 1px; background: #e5e7eb;`}>
        {months.map((m) => {
          const isOddMonth = m.monthIdx % 2 === 1;
          const rowSegments = segmentsByRow.get(m.monthIdx) || [];

          return (
            <>
              {/* Month label cell */}
              <div
                key={`label-${m.monthIdx}`}
                class={`flex items-center justify-center text-[8px] 2xl:text-[10px] font-black text-orange-600 ${
                  isOddMonth ? "bg-gray-50" : "bg-white"
                }`}
              >
                {m.abbrev}
              </div>

              {/* Day cells */}
              {Array.from({ length: 31 }, (_, dayIdx) => {
                const day = m.days[dayIdx];
                const dateStr = day ? formatDate(day) : null;
                const isToday = dateStr === today;
                const isEmpty = !day;
                const isWeekend = day ? (day.getDay() === 0 || day.getDay() === 6) : false;
                const cellSegments = rowSegments.filter(
                  (s) => s.colStart === dayIdx
                );
                const dayEvents = dateStr ? consolidateEvents(getEventsForDate(events, dateStr)) : [];
                const bgClass = getDayBackgroundClass({ isOutsideScope: isEmpty, isWeekend, isOddMonth });

                return (
                  <DayPopover
                    key={`${m.monthIdx}-${dayIdx}`}
                    events={dayEvents}
                    dateLabel={`${m.abbrev} ${day?.getDate()}`}
                    buildHideEventUrl={buildHideEventUrl}
                    isRightSide={dayIdx >= COLS / 2}
                    isBottomHalf={m.monthIdx >= 6}
                  >
                    <div
                      class={`relative px-0.5 min-h-0 h-full ${bgClass} ${isToday ? "ring-1 ring-orange-400 ring-inset z-10" : ""}`}
                    >
                      {day && (
                        <div class="flex items-baseline justify-between text-[8px] 2xl:text-[10px] leading-none">
                          <span class={`font-medium ${isToday ? "text-orange-500 font-bold" : "text-gray-600"}`}>
                            {day.getDate()}
                          </span>
                          <span class="text-gray-400">{DAY_ABBREVS[day.getDay()].charAt(0)}</span>
                        </div>
                      )}

                      {cellSegments.map((seg, segIdx) => (
                        <EventSegment
                          key={`${seg.event.id}-${seg.rowStart}-${segIdx}`}
                          event={seg.event}
                          slot={segmentSlots.get(seg) || 0}
                          span={seg.colEnd - seg.colStart}
                          sizes={sizes}
                          headerOffset={-2}
                        />
                      ))}
                    </div>
                  </DayPopover>
                );
              })}
            </>
          );
        })}
      </div>
    </div>
  );
}

// ============ SHARED HELPERS ============

function computeEventSegments(
  events: ConsolidatedCalendarEvent[],
  dateToIndex: Map<string, number>,
  totalCells: number,
  cols: number
): {
  segmentsByRow: Map<number, EventSegmentData[]>;
  segmentSlots: Map<EventSegmentData, number>;
  maxSlotPerRow: Map<number, number>;
} {
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

function computeMonthEventSegments(
  events: ConsolidatedCalendarEvent[],
  dateToPos: Map<string, { row: number; col: number }>,
  year: number,
  cols: number
): {
  segmentsByRow: Map<number, EventSegmentData[]>;
  segmentSlots: Map<EventSegmentData, number>;
  maxSlotPerRow: Map<number, number>;
} {
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
      const segEndCol =
        month === endMonth ? endDay : daysInThisMonth;

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

function assignSlots(eventSegments: EventSegmentData[]): {
  segmentsByRow: Map<number, EventSegmentData[]>;
  segmentSlots: Map<EventSegmentData, number>;
  maxSlotPerRow: Map<number, number>;
} {
  const segmentsByRow = new Map<number, EventSegmentData[]>();
  for (const seg of eventSegments) {
    const row = seg.rowStart;
    if (!segmentsByRow.has(row)) {
      segmentsByRow.set(row, []);
    }
    segmentsByRow.get(row)!.push(seg);
  }

  const segmentSlots = new Map<EventSegment, number>();
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
