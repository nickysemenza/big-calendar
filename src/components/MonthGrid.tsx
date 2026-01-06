import {
  getDaysInMonth,
  getFirstDayOfMonth,
  formatDate,
  isDateInEvent,
} from "../lib/dates";
import { EventChip } from "./EventChip";
import type { CalendarEvent } from "../env";

interface Props {
  year: number;
  month: number;
  events: CalendarEvent[];
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"];

export function MonthGrid({ year, month, events }: Props) {
  const days = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = formatDate(new Date());

  // Filter events that overlap with this month
  const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const nextMonth = month === 11 ? 1 : month + 2;
  const nextYear = month === 11 ? year + 1 : year;
  const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  const monthEvents = events.filter(
    (e) => e.start < monthEnd && e.end > monthStart
  );

  return (
    <div class="border rounded-lg p-3 bg-white">
      <h3 class="font-semibold text-sm mb-2 text-gray-800">
        {MONTH_NAMES[month]}
      </h3>

      {/* Day headers */}
      <div class="grid grid-cols-7 text-xs text-gray-500 mb-1">
        {DAY_NAMES.map((d, i) => (
          <div key={i} class="text-center font-medium">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div class="grid grid-cols-7 gap-px text-xs">
        {/* Empty cells for padding */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`pad-${i}`} class="min-h-[48px]" />
        ))}

        {days.map((date) => {
          const dateStr = formatDate(date);
          const isToday = dateStr === today;
          const dayEvents = monthEvents.filter((e) =>
            isDateInEvent(date, e.start, e.end)
          );

          return (
            <div
              key={dateStr}
              class={`min-h-[48px] p-0.5 ${isToday ? "bg-blue-50 rounded" : ""}`}
            >
              <div
                class={`text-center text-[11px] ${
                  isToday
                    ? "font-bold text-blue-600"
                    : date.getDay() === 0 || date.getDay() === 6
                      ? "text-gray-400"
                      : "text-gray-700"
                }`}
              >
                {date.getDate()}
              </div>
              {dayEvents.slice(0, 2).map((e) => (
                <EventChip key={e.id + dateStr} event={e} />
              ))}
              {dayEvents.length > 2 && (
                <div class="text-[9px] text-gray-500 text-center mt-0.5">
                  +{dayEvents.length - 2}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
