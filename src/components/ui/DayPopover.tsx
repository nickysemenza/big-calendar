import type { ConsolidatedEvent } from "./types";
import { formatDateRange, getStripedBackground } from "./helpers";
import type { JSX } from "preact";

interface DayPopoverProps {
  events: ConsolidatedEvent[];
  dateLabel: string;
  buildHideEventUrl: (eventName: string) => string;
  children: JSX.Element;
  isRightSide?: boolean;
  isBottomHalf?: boolean;
}

export function DayPopover({ events, dateLabel, buildHideEventUrl, children, isRightSide = false, isBottomHalf = false }: DayPopoverProps) {
  if (events.length === 0) {
    return <>{children}</>;
  }

  // Position classes based on cell location
  const horizontalPos = isRightSide ? "right-full mr-1" : "left-full ml-1";
  const verticalPos = isBottomHalf ? "bottom-0" : "top-0";

  return (
    <div class="group/day relative h-full">
      {children}
      <div class={`hidden group-hover/day:block absolute z-[100] ${horizontalPos} ${verticalPos} bg-white rounded-lg shadow-lg border border-gray-200 p-2 min-w-[180px] max-h-[250px] overflow-auto pointer-events-auto`}>
        <div class="font-semibold text-xs mb-1 pb-1 border-b border-gray-100 text-gray-700">
          {dateLabel} · {events.length} event{events.length !== 1 ? "s" : ""}
        </div>
        <div class="space-y-1">
          {events.map((event) => {
            const dateRange = formatDateRange(event.start, event.end);
            return (
              <div key={event.id} class="flex items-start gap-1.5 py-0.5 text-xs group/event">
                <span
                  class="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                  style={{ background: getStripedBackground(event.colors) }}
                />
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1">
                    <span class="text-gray-800 leading-tight">{event.summary}</span>
                    {event.isRecurring && <span class="text-gray-400" title="Recurring">↻</span>}
                    <a
                      href={buildHideEventUrl(event.summary)}
                      class="text-gray-300 hover:text-red-500 opacity-0 group-hover/event:opacity-100 transition-opacity ml-auto"
                      title="Hide this event"
                    >
                      ×
                    </a>
                  </div>
                  {event.startTime && (
                    <div class="text-[10px] text-gray-400">
                      {event.startTime}{event.endTime && ` – ${event.endTime}`}
                    </div>
                  )}
                  {dateRange && (
                    <div class="text-[10px] text-gray-400">{dateRange}</div>
                  )}
                  <div class="text-[10px] text-gray-400">{event.calendarNames.join(", ")}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
