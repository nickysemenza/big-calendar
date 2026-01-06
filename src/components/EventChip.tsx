import type { CalendarEvent } from "../env";

interface Props {
  event: CalendarEvent;
}

export function EventChip({ event }: Props) {
  return (
    <div
      class="text-[10px] truncate rounded px-1 text-white leading-tight mt-0.5"
      style={`background-color: ${event.color}`}
      title={event.summary}
    >
      {event.summary}
    </div>
  );
}
