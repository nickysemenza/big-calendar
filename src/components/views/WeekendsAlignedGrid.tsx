import type { CalendarEvent } from "../../env";
import { consolidateEvents, getEventsForDate } from "../../lib/consolidate";
import {
  DAY_ABBREVS,
  formatDate,
  getAllDaysOfYear,
  getMonthAbbrev,
} from "../../lib/dates";
import { computeEventSegments, computeRowHeights } from "../../lib/segments";
import { DayPopover } from "../ui/DayPopover";
import { EventSegment } from "../ui/EventSegment";
import {
  getDayBackgroundClass,
  getDayNumberClass,
  useResponsiveSizes,
} from "../ui/helpers";

// Weekends-aligned grid: rows of whole weeks so Sat/Sun line up in columns
// (28 cols = 4 weeks × 7 days, padded with prev/next-year days)
export function WeekendsAlignedGrid({
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
  const consolidatedEvents = consolidateEvents(events, "occurrence");

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
    COLS,
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
                dayIdx === 0 || dayIdx === 6
                  ? "bg-sky-100 text-sky-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {abbrev.charAt(0)}
            </div>
          )),
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
          const dayEvents = isInYear
            ? consolidateEvents(getEventsForDate(events, dateStr), "name")
            : [];
          const bgClass = getDayBackgroundClass({
            isOutsideScope: !isInYear,
            isWeekend,
            isOddMonth,
          });
          const dayNumClass = getDayNumberClass({
            isOutsideScope: !isInYear,
            isToday,
            isFirstOfMonth,
          });

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
                    <span class="font-black text-orange-600">
                      {monthAbbrev}
                    </span>
                  )}
                  <span class={`font-medium ${dayNumClass}`}>{dayNum}</span>
                </div>

                {isInYear &&
                  cellSegments.map((seg, segIdx) => (
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
