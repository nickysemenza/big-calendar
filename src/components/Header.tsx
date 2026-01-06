interface Props {
  year: number;
  view: "continuous" | "month";
  userEmail: string;
}

export function Header({ year, view, userEmail }: Props) {
  const currentYear = new Date().getFullYear();
  const isMonthView = view === "month";

  // Build URL preserving year param
  const toggleUrl = `/?year=${year}&view=${isMonthView ? "continuous" : "month"}`;

  return (
    <header class="flex items-center justify-between p-4 border-b shrink-0 bg-white">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <a
            href={`/?year=${year - 1}&view=${view}`}
            class="p-2 hover:bg-gray-100 rounded text-gray-600"
          >
            &larr;
          </a>
          <h1 class="text-2xl font-bold tabular-nums min-w-[5ch] text-center">
            {year}
          </h1>
          <a
            href={`/?year=${year + 1}&view=${view}`}
            class="p-2 hover:bg-gray-100 rounded text-gray-600"
          >
            &rarr;
          </a>
        </div>
        {year !== currentYear && (
          <a
            href={`/?view=${view}`}
            class="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Today
          </a>
        )}
        <a
          href={toggleUrl}
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
