import { shortHash } from "../env";
import type { BuildUrlOverrides, View } from "./validators";

export type { BuildUrlOverrides };

// Current calendar URL state; field names match the query params
export interface CalendarUrlState {
  year: number;
  view: View;
  hide?: string; // comma-separated calendar hashes
  hideEvents?: string; // comma-separated event name hashes
  timed: boolean;
  hideRecurring: boolean;
  wideMode: boolean;
}

// Build a calendar URL from the current state with optional overrides
export function buildCalendarUrl(
  state: CalendarUrlState,
  overrides: BuildUrlOverrides = {},
): string {
  const params = new URLSearchParams();
  params.set("year", String(overrides.year ?? state.year));
  params.set("view", overrides.view ?? state.view);

  if (overrides.timed ?? state.timed) params.set("timed", "true");
  if (overrides.hideRecurring ?? state.hideRecurring)
    params.set("hideRecurring", "true");
  if (overrides.wideMode ?? state.wideMode) params.set("wideMode", "true");

  const hide = overrides.hide ?? state.hide;
  if (hide) params.set("hide", hide);

  const hideEvents = overrides.hideEvents ?? state.hideEvents;
  if (hideEvents) params.set("hideEvents", hideEvents);

  return `/?${params.toString()}`;
}

// Build a URL that adds an event's name hash to the hidden list
export function buildHideEventUrl(
  state: CalendarUrlState,
  eventName: string,
): string {
  const eventHash = shortHash(eventName.toLowerCase());
  const hashes = state.hideEvents ? state.hideEvents.split(",") : [];
  if (!hashes.includes(eventHash)) {
    hashes.push(eventHash);
  }
  return buildCalendarUrl(state, { hideEvents: hashes.join(",") });
}
