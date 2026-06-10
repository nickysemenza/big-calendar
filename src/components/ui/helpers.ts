// Shared helper functions for UI components

// Generate CSS background for multi-color events (striped pattern)
export function getStripedBackground(colors: string[]): string {
  if (colors.length === 1) {
    return colors[0];
  }

  // Bold diagonal stripes
  const stripeWidth = 8; // pixels per color band
  const stops = colors.flatMap((color, i) => {
    const start = i * stripeWidth;
    const end = (i + 1) * stripeWidth;
    return [`${color} ${start}px`, `${color} ${end}px`];
  });

  return `repeating-linear-gradient(135deg, ${stops.join(", ")})`;
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
