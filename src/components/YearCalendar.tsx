import type { CalendarEvent } from "../env";
import {
  getAllDaysOfYear,
  formatDate,
  getMonthAbbrev,
  getDaysInMonth,
} from "../lib/dates";

interface Props {
  year: number;
  events: CalendarEvent[];
  view: "continuous" | "month";
}

const DAY_ABBREVS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_ABBREVS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

interface EventSegment {
  event: CalendarEvent;
  rowStart: number;
  colStart: number;
  colEnd: number; // exclusive
}

export function YearCalendar({ year, events, view }: Props) {
  if (view === "month") {
    return <MonthRowGrid year={year} events={events} />;
  }
  return <ContinuousGrid year={year} events={events} />;
}

// ============ CONTINUOUS GRID (25 cols × ~15 rows) ============

function ContinuousGrid({
  year,
  events,
}: {
  year: number;
  events: CalendarEvent[];
}) {
  const COLS = 25;
  const allDays = getAllDaysOfYear(year);
  const today = formatDate(new Date());

  // Create a map of date string -> cell index for quick lookup
  const dateToIndex = new Map<string, number>();
  allDays.forEach((day, i) => {
    dateToIndex.set(formatDate(day), i);
  });

  const totalCells = allDays.length;
  const { segmentsByRow, segmentSlots } = computeEventSegments(
    events,
    dateToIndex,
    totalCells,
    COLS
  );

  return (
    <div class="flex-1 bg-white p-2 overflow-hidden">
      <div
        class="grid gap-px bg-gray-200 h-full"
        style={`grid-template-columns: repeat(${COLS}, 1fr);`}
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

          // Background: weekends get cream, otherwise alternate gray/white by month
          const bgClass = isWeekend
            ? "bg-amber-50"
            : isOddMonth
              ? "bg-gray-50"
              : "bg-white";

          return (
            <div
              key={dateStr}
              class={`relative p-0.5 min-h-0 ${bgClass} ${isToday ? "ring-2 ring-orange-400 ring-inset z-10" : ""}`}
            >
              <div class="flex items-baseline gap-0.5 text-[9px] leading-none">
                {isFirstOfMonth && (
                  <span class="font-bold text-orange-600">{monthAbbrev}</span>
                )}
                <span class="text-gray-400">{DAY_ABBREVS[dayOfWeek]}</span>
                <span
                  class={`font-medium ${
                    isToday
                      ? "text-orange-500 font-bold"
                      : isFirstOfMonth
                        ? "text-orange-600 font-bold"
                        : "text-gray-600"
                  }`}
                >
                  {dayNum}
                </span>
              </div>

              {cellSegments.map((seg, segIdx) => {
                const span = seg.colEnd - seg.colStart;
                const slot = segmentSlots.get(seg) || 0;

                const isMultiDay = span > 1;
                return (
                  <div
                    key={`${seg.event.id}-${seg.rowStart}-${segIdx}`}
                    class={`text-[8px] rounded-sm px-0.5 text-white leading-tight pointer-events-auto ${
                      isMultiDay ? "truncate" : "overflow-hidden break-words"
                    }`}
                    style={`
                      background-color: ${seg.event.color};
                      position: absolute;
                      left: 2px;
                      top: ${14 + slot * 11}px;
                      width: calc(${span * 100}% - 4px);
                      z-index: ${20 + slot};
                      ${!isMultiDay ? "display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;" : ""}
                      ${!seg.event.isAllDay ? "opacity: 0.7;" : ""}
                    `}
                    title={`${seg.event.summary}\n📅 ${seg.event.calendarName}`}
                  >
                    {seg.event.summary}
                  </div>
                );
              })}
            </div>
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
}: {
  year: number;
  events: CalendarEvent[];
}) {
  const today = formatDate(new Date());
  const COLS = 31;

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
  const { segmentsByRow, segmentSlots } = computeMonthEventSegments(
    events,
    dateToPos,
    year,
    COLS
  );

  return (
    <div class="flex-1 bg-white p-2 overflow-hidden">
      <div class="grid h-full" style="grid-template-columns: 40px repeat(31, 1fr); grid-template-rows: repeat(12, 1fr); gap: 1px; background: #e5e7eb;">
        {months.map((m) => {
          const isOddMonth = m.monthIdx % 2 === 1;
          const rowSegments = segmentsByRow.get(m.monthIdx) || [];

          return (
            <>
              {/* Month label cell */}
              <div
                key={`label-${m.monthIdx}`}
                class={`flex items-center justify-center text-[10px] font-bold text-orange-600 ${
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

                // Background: empty cells are gray-100, weekends get cream, otherwise alternate
                const bgClass = isEmpty
                  ? "bg-gray-100"
                  : isWeekend
                    ? "bg-amber-50"
                    : isOddMonth
                      ? "bg-gray-50"
                      : "bg-white";

                return (
                  <div
                    key={`${m.monthIdx}-${dayIdx}`}
                    class={`relative p-0.5 min-h-0 ${bgClass} ${isToday ? "ring-2 ring-orange-400 ring-inset z-10" : ""}`}
                  >
                    {day && (
                      <div class={`text-[9px] leading-none ${isToday ? "text-orange-500 font-bold" : "text-gray-600"}`}>
                        {day.getDate()}
                      </div>
                    )}

                    {cellSegments.map((seg, segIdx) => {
                      const span = seg.colEnd - seg.colStart;
                      const slot = segmentSlots.get(seg) || 0;
                      const isMultiDay = span > 1;

                      return (
                        <div
                          key={`${seg.event.id}-${seg.rowStart}-${segIdx}`}
                          class={`text-[8px] rounded-sm px-0.5 text-white leading-tight pointer-events-auto ${
                            isMultiDay ? "truncate" : "overflow-hidden break-words"
                          }`}
                          style={`
                            background-color: ${seg.event.color};
                            position: absolute;
                            left: 2px;
                            top: ${12 + slot * 11}px;
                            width: calc(${span * 100}% - 4px);
                            z-index: ${20 + slot};
                            ${!isMultiDay ? "display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;" : ""}
                            ${!seg.event.isAllDay ? "opacity: 0.7;" : ""}
                          `}
                          title={`${seg.event.summary}\n📅 ${seg.event.calendarName}`}
                        >
                          {seg.event.summary}
                        </div>
                      );
                    })}
                  </div>
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
  events: CalendarEvent[],
  dateToIndex: Map<string, number>,
  totalCells: number,
  cols: number
): {
  segmentsByRow: Map<number, EventSegment[]>;
  segmentSlots: Map<EventSegment, number>;
} {
  const eventSegments: EventSegment[] = [];
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
  events: CalendarEvent[],
  dateToPos: Map<string, { row: number; col: number }>,
  year: number,
  cols: number
): {
  segmentsByRow: Map<number, EventSegment[]>;
  segmentSlots: Map<EventSegment, number>;
} {
  const eventSegments: EventSegment[] = [];
  const firstDateStr = `${year}-01-01`;
  const lastDateStr = `${year}-12-31`;

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

function assignSlots(eventSegments: EventSegment[]): {
  segmentsByRow: Map<number, EventSegment[]>;
  segmentSlots: Map<EventSegment, number>;
} {
  const segmentsByRow = new Map<number, EventSegment[]>();
  for (const seg of eventSegments) {
    const row = seg.rowStart;
    if (!segmentsByRow.has(row)) {
      segmentsByRow.set(row, []);
    }
    segmentsByRow.get(row)!.push(seg);
  }

  const segmentSlots = new Map<EventSegment, number>();
  for (const [, rowSegments] of segmentsByRow) {
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
  }

  return { segmentsByRow, segmentSlots };
}
