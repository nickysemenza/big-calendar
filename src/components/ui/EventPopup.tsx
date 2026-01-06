import type { ConsolidatedEvent } from "./types";
import { formatDateRange, getStripedBackground } from "./helpers";

interface EventPopupProps {
  events: ConsolidatedEvent[];
  dateLabel: string; // e.g., "MAR 15"
  buildHideEventUrl: (eventName: string) => string;
}

export function EventPopup({ events, dateLabel, buildHideEventUrl }: EventPopupProps) {
  if (events.length === 0) return null;

  return (
    <div class="event-popup">
      <div class="event-popup-header">
        {dateLabel} &middot; {events.length} event{events.length !== 1 ? "s" : ""}
      </div>
      <div class="space-y-0.5 2xl:space-y-1">
        {events.map((event) => {
          const dateRange = formatDateRange(event.start, event.end);
          return (
            <div key={event.id} class="event-popup-item group/event">
              <span
                class="color-dot mt-0.5"
                style={`background: ${getStripedBackground(event.colors)};`}
              />
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1">
                  <span class="text-gray-800 leading-tight">{event.summary}</span>
                  {event.isRecurring && <span class="text-gray-400" title="Recurring">↻</span>}
                  <a
                    href={buildHideEventUrl(event.summary)}
                    class="hide-event-btn"
                    title="Hide this event"
                  >
                    ×
                  </a>
                </div>
                {event.startTime && (
                  <div class="text-[10px] 2xl:text-xs text-gray-400">
                    {event.startTime}{event.endTime && ` – ${event.endTime}`}
                  </div>
                )}
                {dateRange && (
                  <div class="text-[10px] 2xl:text-xs text-gray-400">{dateRange}</div>
                )}
                <div class="text-[10px] 2xl:text-xs text-gray-400">{event.calendarNames.join(", ")}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
