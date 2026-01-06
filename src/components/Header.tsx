import type { CalendarInfo } from "../env";

interface Props {
  year: number;
  view: "continuous" | "month";
  calendars: CalendarInfo[];
  userEmail: string;
  showTimed: boolean;
  hideRecurring: boolean;
}

export function Header({ year, view, calendars, userEmail, showTimed, hideRecurring }: Props) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const isMonthView = view === "month";

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

  // Build base URL params (without hide)
  const timedParam = showTimed ? "&timed=true" : "";
  const recurringParam = hideRecurring ? "&hideRecurring=true" : "";
  const baseParams = `year=${year}&view=${view}${timedParam}${recurringParam}`;

  // Build URL for toggling a calendar's visibility
  function buildToggleUrl(calId: string): string {
    const newHidden = calendars
      .filter((c) => (c.id === calId ? !c.hidden : c.hidden))
      .map((c) => c.id);

    if (newHidden.length === 0) {
      return `/?${baseParams}`;
    }
    return `/?${baseParams}&hide=${newHidden.map(encodeURIComponent).join(",")}`;
  }

  // Build current hide param for preserving in other links
  const currentHideParam = calendars
    .filter((c) => c.hidden)
    .map((c) => encodeURIComponent(c.id))
    .join(",");
  const hideQuery = currentHideParam ? `&hide=${currentHideParam}` : "";

  // Build URL preserving year and hide
  const viewToggleUrl = `/?year=${year}&view=${isMonthView ? "continuous" : "month"}${timedParam}${recurringParam}${hideQuery}`;
  const timedToggleUrl = `/?year=${year}&view=${view}${showTimed ? "" : "&timed=true"}${recurringParam}${hideQuery}`;
  const recurringToggleUrl = `/?year=${year}&view=${view}${timedParam}${hideRecurring ? "" : "&hideRecurring=true"}${hideQuery}`;

  return (
    <header class="flex items-center justify-between px-4 py-2 border-b shrink-0 bg-white">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <a
            href={`/?year=${year - 1}&view=${view}${hideQuery}`}
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
          <a
            href={`/?year=${year + 1}&view=${view}${hideQuery}`}
            class="p-2 hover:bg-gray-100 rounded text-gray-600"
          >
            &rarr;
          </a>
        </div>
        {year !== currentYear && (
          <a
            href={`/?view=${view}${hideQuery}`}
            class="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Today
          </a>
        )}
        <a
          href={viewToggleUrl}
          class="flex items-center gap-2 px-3 py-1 text-sm hover:bg-gray-100 rounded cursor-pointer"
        >
          <span
            class={`w-4 h-4 border rounded flex items-center justify-center ${
              isMonthView
                ? "bg-blue-600 border-blue-600 text-white"
                : "border-gray-400"
            }`}
          >
            {isMonthView && "✓"}
          </span>
          <span class="text-gray-700">Month rows</span>
        </a>
        <a
          href={timedToggleUrl}
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
          href={recurringToggleUrl}
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
                href={buildToggleUrl(cal.id)}
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
      </div>
      <div class="flex items-center gap-4 text-sm text-gray-600">
        <span>{userEmail}</span>
        <a href="/signout" class="text-blue-600 hover:underline">
          Sign out
        </a>
      </div>
    </header>
  );
}
