import type { CalendarInfo } from "../env";
import type { View, BuildUrlOverrides } from "../lib/validators";

interface Props {
  year: number;
  view: View;
  calendars: CalendarInfo[];
  userEmail: string;
  showTimed: boolean;
  hideRecurring: boolean;
  hiddenEventCount: number;
  totalEvents: number;
}

export function Header({ year, view, calendars, userEmail, showTimed, hideRecurring, hiddenEventCount, totalEvents }: Props) {
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

  // Build URL with optional overrides
  function buildUrl(overrides: BuildUrlOverrides = {}): string {
    const params = new URLSearchParams();
    params.set("year", String(overrides.year ?? year));
    params.set("view", overrides.view ?? view);

    const timedValue = overrides.timed ?? showTimed;
    if (timedValue) params.set("timed", "true");

    const recurringValue = overrides.hideRecurring ?? hideRecurring;
    if (recurringValue) params.set("hideRecurring", "true");

    const hideValue = overrides.hide ?? currentHideParam;
    if (hideValue) params.set("hide", hideValue);

    return `/?${params.toString()}`;
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
    <header class="flex items-center justify-between px-4 py-2 border-b shrink-0 bg-white">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <a
            href={buildUrl({ year: year - 1 })}
            class="p-2 hover:bg-gray-100 rounded text-gray-600"
          >
            &larr;
          </a>
          <h1 class="text-2xl font-bold tabular-nums min-w-[5ch] text-center">
            {year}
          </h1>
          {yearProgress !== null && (
            <span class="text-sm text-gray-500 font-normal">{yearProgress}%</span>
          )}
          <span class="text-sm text-gray-500 font-normal ml-2 pl-2 border-l border-gray-300">
            {totalEvents} events
          </span>
          <a
            href={buildUrl({ year: year + 1 })}
            class="p-2 hover:bg-gray-100 rounded text-gray-600"
          >
            &rarr;
          </a>
        </div>
        {year !== currentYear && (
          <a
            href={buildUrl({ year: currentYear })}
            class="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Today
          </a>
        )}
        <div class="flex items-center gap-2 px-3 py-1 text-sm">
          <span class="text-gray-500">View:</span>
          <div class="flex gap-1">
            <a
              href={buildUrl({ view: "continuous" })}
              class={`px-2 py-0.5 rounded text-xs ${view === "continuous" ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
            >
              Continuous
            </a>
            <a
              href={buildUrl({ view: "month" })}
              class={`px-2 py-0.5 rounded text-xs ${view === "month" ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
            >
              Month rows
            </a>
            <a
              href={buildUrl({ view: "weekends" })}
              class={`px-2 py-0.5 rounded text-xs ${view === "weekends" ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
            >
              Week rows
            </a>
          </div>
        </div>
        <a
          href={buildUrl({ timed: !showTimed })}
          class="flex items-center gap-2 px-3 py-1 text-sm hover:bg-gray-100 rounded cursor-pointer"
        >
          <span
            class={`w-4 h-4 border rounded flex items-center justify-center ${
              showTimed
                ? "bg-blue-600 border-blue-600 text-white"
                : "border-gray-400"
            }`}
          >
            {showTimed && "✓"}
          </span>
          <span class="text-gray-700">Timed events</span>
        </a>
        <a
          href={buildUrl({ hideRecurring: !hideRecurring })}
          class="flex items-center gap-2 px-3 py-1 text-sm hover:bg-gray-100 rounded cursor-pointer"
        >
          <span
            class={`w-4 h-4 border rounded flex items-center justify-center ${
              hideRecurring
                ? "bg-blue-600 border-blue-600 text-white"
                : "border-gray-400"
            }`}
          >
            {hideRecurring && "✓"}
          </span>
          <span class="text-gray-700">Hide recurring</span>
        </a>

        {/* Calendar filters */}
        {calendars.filter((c) => c.eventCount > 0).length > 0 && (
          <div
            class="grid gap-x-4 gap-y-0.5 ml-2 pl-4 border-l border-gray-200"
            style="grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); grid-auto-rows: auto; max-width: 600px;"
          >
            {calendars.filter((c) => c.eventCount > 0).map((cal) => (
              <a
                key={cal.id}
                href={buildCalendarToggleUrl(cal.id)}
                class="flex items-center gap-1 px-1 py-0.5 text-xs hover:bg-gray-100 rounded cursor-pointer"
                title={cal.name}
              >
                <span
                  class={`w-3 h-3 border rounded flex-shrink-0 flex items-center justify-center text-[8px] ${
                    !cal.hidden
                      ? "border-transparent text-white"
                      : "border-gray-300 bg-white"
                  }`}
                  style={!cal.hidden ? `background-color: ${cal.color}` : ""}
                >
                  {!cal.hidden && "✓"}
                </span>
                <span
                  class={`truncate ${cal.hidden ? "text-gray-400" : "text-gray-700"}`}
                >
                  {cal.name}
                </span>
                <span class="text-gray-400 flex-shrink-0">({cal.eventCount})</span>
              </a>
            ))}
          </div>
        )}

        {/* Hidden events indicator */}
        {hiddenEventCount > 0 && (
          <span class="flex items-center gap-1 ml-2 pl-2 border-l border-gray-200 text-xs text-gray-500">
            <span class="text-red-400">×</span>
            <span>{hiddenEventCount} hidden</span>
          </span>
        )}
      </div>
      <div class="flex items-center gap-4 text-sm text-gray-600">
        <a href="/refresh" class="text-gray-500 hover:text-gray-700" title="Refresh calendar data">
          ↻
        </a>
        <span>{userEmail}</span>
        <a href="/signout" class="text-blue-600 hover:underline">
          Sign out
        </a>
      </div>
    </header>
  );
}
