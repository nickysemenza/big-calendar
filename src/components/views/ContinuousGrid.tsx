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
import { getDayBackgroundClass, getDayNumberClass } from "../ui/helpers";

// Continuous grid: every day of the year in reading order (25 cols × ~15 rows)
export function ContinuousGrid({
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

  // Consolidate duplicate events (same name + same dates)
  const consolidatedEvents = consolidateEvents(events, "occurrence");

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
    COLS,
  );

  return (
    <div class="flex-1 bg-white p-1 overflow-auto">
      <div
        class="grid gap-px bg-gray-200 h-full"
        style={`grid-template-columns: repeat(${COLS}, 1fr); grid-template-rows: ${computeRowHeights(maxSlotPerRow, rowCount)};`}
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
          const dayEvents = consolidateEvents(
            getEventsForDate(events, dateStr),
            "name",
          );
          const bgClass = getDayBackgroundClass({ isWeekend, isOddMonth });
          const dayNumClass = getDayNumberClass({ isToday, isFirstOfMonth });
          const isPast = dateStr < today;
          const monthBoundary = isFirstOfMonth
            ? "border-l-2 border-orange-400"
            : "";

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
                class={`relative px-0.5 min-h-0 h-full ${bgClass} ${monthBoundary} ${isPast ? "day-past" : ""} ${isToday ? "ring-1 ring-orange-400 ring-inset z-10" : ""}`}
              >
                <div class="flex items-baseline justify-between text-[8px] 2xl:text-[10px] leading-none">
                  <span class="flex items-baseline gap-px">
                    {isFirstOfMonth && (
                      <span class="font-black text-orange-600">
                        {monthAbbrev}
                      </span>
                    )}
                    <span class={`font-medium ${dayNumClass}`}>{dayNum}</span>
                  </span>
                  <span class="text-gray-400">{DAY_ABBREVS[dayOfWeek]}</span>
                </div>

                {cellSegments.map((seg, segIdx) => (
                  <EventSegment
                    key={`${seg.event.id}-${seg.rowStart}-${segIdx}`}
                    segment={seg}
                    slot={segmentSlots.get(seg) || 0}
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
