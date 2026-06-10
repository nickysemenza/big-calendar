import type { EventSegmentData } from "../../lib/segments";
import { getStripedBackground } from "./helpers";

interface EventSegmentProps {
  segment: EventSegmentData;
  slot: number;
  headerOffset?: number; // Optional adjustment for header height (e.g., -2 for month view)
}

export function EventSegment({
  segment,
  slot,
  headerOffset = 0,
}: EventSegmentProps) {
  const { event } = segment;
  const span = segment.colEnd - segment.colStart;
  const isMultiDay = span > 1;
  const edgeClasses = `${segment.isEventStart ? "" : "event-segment-continues-left"} ${
    segment.isEventEnd ? "" : "event-segment-continues-right"
  }`;

  return (
    <div
      class={`event-segment ${isMultiDay ? "event-segment-multiday" : "event-segment-singleday"} ${edgeClasses}`}
      style={`
        background: ${getStripedBackground(event.colors)};
        position: absolute;
        left: 2px;
        top: calc(var(--cal-header-h) + ${slot} * var(--cal-event-h) + ${headerOffset}px);
        width: calc(${span * 100}% - 4px);
        z-index: ${20 + slot};
        ${!event.isAllDay ? "opacity: 0.7;" : ""}
      `}
      title={`${event.summary}${event.calendarNames.length > 0 ? ` (${event.calendarNames.join(", ")})` : ""}`}
    >
      {event.isRecurring && <span class="recurring-icon">↻</span>}
      {event.summary}
    </div>
  );
}
