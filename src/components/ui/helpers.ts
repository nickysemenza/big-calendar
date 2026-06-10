// Shared helper functions for UI components

// Background class for day cells
export function getDayBackgroundClass(options: {
  isOutsideScope?: boolean;
  isWeekend: boolean;
  isOddMonth: boolean;
}): string {
  if (options.isOutsideScope) return "bg-gray-100";
  if (options.isWeekend) return "bg-sky-50";
  if (options.isOddMonth) return "bg-gray-50";
  return "bg-white";
}

// Day number text class
export function getDayNumberClass(options: {
  isOutsideScope?: boolean;
  isToday: boolean;
  isFirstOfMonth: boolean;
}): string {
  if (options.isOutsideScope) return "text-gray-300";
  if (options.isToday) return "text-orange-500 font-bold";
  if (options.isFirstOfMonth) return "text-orange-600 font-bold";
  return "text-gray-600";
}

// Generate CSS background for multi-color events: horizontal bands, which
// read more calmly on ~10px-tall bars than diagonal stripes
export function getStripedBackground(colors: string[]): string {
  if (colors.length === 1) {
    return colors[0];
  }

  const bandSize = 100 / colors.length;
  const stops = colors.map(
    (color, i) => `${color} ${i * bandSize}% ${(i + 1) * bandSize}%`,
  );

  return `linear-gradient(to bottom, ${stops.join(", ")})`;
}

// Format date range for display (e.g., "May 1 – May 7")
export function formatDateRange(start: string, end: string): string | null {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  endDate.setDate(endDate.getDate() - 1); // end is exclusive

  // If same day, no range to show
  if (start === end || startDate.getTime() === endDate.getTime()) {
    return null;
  }

  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const startStr = startDate.toLocaleDateString("en-US", opts);
  const endStr = endDate.toLocaleDateString("en-US", opts);

  return `${startStr} – ${endStr}`;
}
