import type { CalendarEvent } from "../env";
import { buildHideEventUrl, type CalendarUrlState } from "../lib/url";
import type { View } from "../lib/validators";
import { ContinuousGrid } from "./views/ContinuousGrid";
import { MonthRowGrid } from "./views/MonthRowGrid";
import { WeekendsAlignedGrid } from "./views/WeekendsAlignedGrid";

interface Props {
  year: number;
  events: CalendarEvent[];
  view: View;
  hideCalendars: string;
  hideEvents: string;
  showTimed: boolean;
  hideRecurring: boolean;
  wideMode: boolean;
}

export function YearCalendar({
  year,
  events,
  view,
  hideCalendars,
  hideEvents,
  showTimed,
  hideRecurring,
  wideMode,
}: Props) {
  const urlState: CalendarUrlState = {
    year,
    view,
    hide: hideCalendars || undefined,
    hideEvents: hideEvents || undefined,
    timed: showTimed,
    hideRecurring,
    wideMode,
  };
  const hideEventUrl = (eventName: string) =>
    buildHideEventUrl(urlState, eventName);

  if (view === "month") {
    return (
      <MonthRowGrid
        year={year}
        events={events}
        buildHideEventUrl={hideEventUrl}
      />
    );
  }
  if (view === "weekends") {
    return (
      <WeekendsAlignedGrid
        year={year}
        events={events}
        buildHideEventUrl={hideEventUrl}
        wideMode={wideMode}
      />
    );
  }
  return (
    <ContinuousGrid
      year={year}
      events={events}
      buildHideEventUrl={hideEventUrl}
      wideMode={wideMode}
    />
  );
}
