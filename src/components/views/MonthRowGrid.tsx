import type { CalendarEvent } from "../../env";
import { consolidateEvents, getEventsForDate } from "../../lib/consolidate";
import {
  DAY_ABBREVS,
  formatDate,
  getDaysInMonth,
  MONTH_ABBREVS,
} from "../../lib/dates";
import {
  computeMonthEventSegments,
  computeRowHeights,
} from "../../lib/segments";
import { DayPopover } from "../ui/DayPopover";
import { EventSegment } from "../ui/EventSegment";
import { getDayBackgroundClass } from "../ui/helpers";

// Month-row grid: one row per month (31 cols × 12 rows)
export function MonthRowGrid({
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

  // Consolidate duplicate events (same name + same dates)
  const consolidatedEvents = consolidateEvents(events, "occurrence");

  // Build month data
  const months = Array.from({ length: 12 }, (_, monthIdx) => {
    const daysInMonth = getDaysInMonth(year, monthIdx);
    return {
      monthIdx,
      days: daysInMonth,
      abbrev: MONTH_ABBREVS[monthIdx],
    };
  });

  // Compute event segments for month view
  const { segmentsByRow, segmentSlots, maxSlotPerRow } =
    computeMonthEventSegments(consolidatedEvents, year);

  return (
    <div class="flex-1 bg-white p-1 overflow-auto">
      <div
        class="grid h-full gap-px bg-gray-200"
        style={`grid-template-columns: var(--cal-month-label-w) repeat(31, 1fr); grid-template-rows: ${computeRowHeights(maxSlotPerRow, 12)};`}
      >
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
                const isWeekend = day
                  ? day.getDay() === 0 || day.getDay() === 6
                  : false;
                const cellSegments = rowSegments.filter(
                  (s) => s.colStart === dayIdx,
                );
                const dayEvents = dateStr
                  ? consolidateEvents(getEventsForDate(events, dateStr), "name")
                  : [];
                const bgClass = getDayBackgroundClass({
                  isOutsideScope: isEmpty,
                  isWeekend,
                  isOddMonth,
                });
                const isPast = dateStr !== null && dateStr < today;

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
                      class={`relative px-0.5 min-h-0 h-full ${bgClass} ${isPast ? "day-past" : ""} ${isToday ? "ring-1 ring-orange-400 ring-inset z-10" : ""}`}
                    >
                      {day && (
                        <div class="flex items-baseline justify-between text-[8px] 2xl:text-[10px] leading-none">
                          <span
                            class={`font-medium ${isToday ? "text-orange-500 font-bold" : "text-gray-600"}`}
                          >
                            {day.getDate()}
                          </span>
                          <span class="text-gray-400">
                            {DAY_ABBREVS[day.getDay()].charAt(0)}
                          </span>
                        </div>
                      )}

                      {cellSegments.map((seg, segIdx) => (
                        <EventSegment
                          key={`${seg.event.id}-${seg.rowStart}-${segIdx}`}
                          segment={seg}
                          slot={segmentSlots.get(seg) || 0}
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
