import type { CalendarInfo } from "../env";
import {
  type BuildUrlOverrides,
  buildCalendarUrl,
  type CalendarUrlState,
} from "../lib/url";
import type { View } from "../lib/validators";

interface Props {
  year: number;
  view: View;
  calendars: CalendarInfo[];
  userEmail: string;
  showTimed: boolean;
  hideRecurring: boolean;
  wideMode: boolean;
  hideEvents: string;
  hiddenEventCount: number;
  totalEvents: number;
}

export function Header({
  year,
  view,
  calendars,
  userEmail,
  showTimed,
  hideRecurring,
  wideMode,
  hideEvents,
  hiddenEventCount,
  totalEvents,
}: Props) {
  const now = new Date();
  const currentYear = now.getFullYear();

  // Calculate year progress percentage
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year + 1, 0, 1);

  let yearProgress: number | null = null;
  if (year === currentYear) {
    const elapsed = now.getTime() - startOfYear.getTime();
    const total = endOfYear.getTime() - startOfYear.getTime();
    yearProgress = Math.round((elapsed / total) * 100);
  } else if (year < currentYear) {
    yearProgress = 100;
  }

  // Current hidden calendar hashes
  const currentHideParam = calendars
    .filter((c) => c.hidden)
    .map((c) => c.hash)
    .join(",");

  const urlState: CalendarUrlState = {
    year,
    view,
    hide: currentHideParam || undefined,
    hideEvents: hideEvents || undefined,
    timed: showTimed,
    hideRecurring,
    wideMode,
  };

  // Build URL with optional overrides
  function buildUrl(overrides: BuildUrlOverrides = {}): string {
    return buildCalendarUrl(urlState, overrides);
  }

  // Build URL for toggling a calendar's visibility
  function buildCalendarToggleUrl(calId: string): string {
    const newHidden = calendars
      .filter((c) => (c.id === calId ? !c.hidden : c.hidden))
      .map((c) => c.hash)
      .join(",");
    return buildUrl({ hide: newHidden });
  }

  return (
    <header class="flex items-center justify-between px-2 py-1 border-b shrink-0 bg-white">
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1">
          <a
            href={buildUrl({ year: year - 1 })}
            class="p-1 hover:bg-gray-100 rounded text-gray-600 text-sm"
          >
            &larr;
          </a>
          <h1 class="text-lg font-bold tabular-nums min-w-[4ch] text-center">
            {year}
          </h1>
          {yearProgress !== null && (
            <span class="text-xs text-gray-500 font-normal">
              {yearProgress}%
            </span>
          )}
          <span class="text-xs text-gray-500 font-normal ml-1 pl-1 border-l border-gray-300">
            {totalEvents}
          </span>
          <a
            href={buildUrl({ year: year + 1 })}
            class="p-1 hover:bg-gray-100 rounded text-gray-600 text-sm"
          >
            &rarr;
          </a>
        </div>
        {year !== currentYear && (
          <a
            href={buildUrl({ year: currentYear })}
            class="px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 rounded"
          >
            Today
          </a>
        )}
        <div class="flex items-center gap-1 text-xs">
          <div class="flex">
            <a
              href={buildUrl({ view: "continuous" })}
              class={`px-1.5 py-0.5 rounded-l border-r border-gray-200 ${view === "continuous" ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
            >
              Cont
            </a>
            <a
              href={buildUrl({ view: "month" })}
              class={`px-1.5 py-0.5 border-r border-gray-200 ${view === "month" ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
            >
              Month
            </a>
            <a
              href={buildUrl({ view: "weekends" })}
              class={`px-1.5 py-0.5 rounded-r ${view === "weekends" ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
            >
              Week
            </a>
          </div>
        </div>
        <a
          href={buildUrl({ timed: !showTimed })}
          class={`flex items-center gap-1 px-1.5 py-0.5 text-xs rounded cursor-pointer ${
            showTimed
              ? "bg-blue-100 text-blue-700"
              : "hover:bg-gray-100 text-gray-500"
          }`}
          title={showTimed ? "Hide hourly events" : "Show hourly events"}
        >
          <span>⏰</span>
        </a>
        <a
          href={buildUrl({ hideRecurring: !hideRecurring })}
          class={`flex items-center gap-1 px-1.5 py-0.5 text-xs rounded cursor-pointer ${
            hideRecurring
              ? "bg-blue-100 text-blue-700"
              : "hover:bg-gray-100 text-gray-500"
          }`}
          title={
            hideRecurring ? "Show recurring events" : "Hide recurring events"
          }
        >
          <span>↻</span>
        </a>
        <a
          href={buildUrl({ wideMode: !wideMode })}
          class={`flex items-center gap-1 px-1.5 py-0.5 text-xs rounded cursor-pointer ${
            wideMode
              ? "bg-blue-100 text-blue-700"
              : "hover:bg-gray-100 text-gray-500"
          }`}
          title={wideMode ? "Normal aspect ratio" : "Wide aspect ratio"}
        >
          <span>↔</span>
        </a>

        {/* Calendar filters */}
        {calendars.filter((c) => c.eventCount > 0).length > 0 && (
          <div
            class="flex flex-wrap gap-x-2 gap-y-0 ml-1 pl-2 border-l border-gray-200"
            style="max-width: 500px;"
          >
            {calendars
              .filter((c) => c.eventCount > 0)
              .map((cal) => (
                <a
                  key={cal.id}
                  href={buildCalendarToggleUrl(cal.id)}
                  class="flex items-center gap-0.5 px-0.5 text-[10px] hover:bg-gray-100 rounded cursor-pointer"
                  title={cal.name}
                >
                  <span
                    class={`w-2 h-2 rounded-sm flex-shrink-0 ${
                      !cal.hidden ? "" : "border border-gray-300 bg-white"
                    }`}
                    style={!cal.hidden ? `background-color: ${cal.color}` : ""}
                  />
                  <span
                    class={`truncate max-w-[80px] ${cal.hidden ? "text-gray-400 line-through" : "text-gray-700"}`}
                  >
                    {cal.name}
                  </span>
                  <span class="text-gray-400 flex-shrink-0">
                    {cal.eventCount}
                  </span>
                </a>
              ))}
          </div>
        )}

        {/* Hidden events indicator */}
        {hiddenEventCount > 0 && (
          <span class="flex items-center gap-0.5 ml-1 pl-1 border-l border-gray-200 text-[10px] text-gray-500">
            <span class="text-red-400">×</span>
            <span>{hiddenEventCount}</span>
          </span>
        )}
      </div>
      <div class="flex items-center gap-2 text-xs text-gray-600">
        <a
          href="/refresh"
          class="text-gray-400 hover:text-gray-700"
          title="Refresh"
        >
          ↻
        </a>
        <span class="text-gray-400 truncate max-w-[120px]">{userEmail}</span>
        <a
          href="/signout"
          class="text-gray-400 hover:text-gray-700"
          title="Sign out"
        >
          ⏻
        </a>
      </div>
    </header>
  );
}
