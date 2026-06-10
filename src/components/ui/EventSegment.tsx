import type { ConsolidatedEvent } from "../../lib/consolidate";
import type { SizeConfig } from "../../lib/segments";
import { getStripedBackground } from "./helpers";

interface EventSegmentProps {
  event: ConsolidatedEvent;
  slot: number;
  span: number;
  sizes: SizeConfig;
  headerOffset?: number; // Optional adjustment for header height (e.g., -2 for month view)
}

export function EventSegment({
  event,
  slot,
  span,
  sizes,
  headerOffset = 0,
}: EventSegmentProps) {
  const isMultiDay = span > 1;
  const topOffset =
    sizes.headerHeight + headerOffset + slot * sizes.eventHeight;

  return (
    <div
      class={`event-segment ${isMultiDay ? "event-segment-multiday" : "event-segment-singleday"}`}
      style={`
        background: ${getStripedBackground(event.colors)};
        position: absolute;
        left: 2px;
        top: ${topOffset}px;
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
