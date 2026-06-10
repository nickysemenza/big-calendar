export function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isDateInEvent(date: Date, start: string, end: string): boolean {
  const d = formatDate(date);
  return d >= start && d < end; // end is exclusive
}

export function getAllDaysOfYear(year: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, 0, 1); // Jan 1
  while (date.getFullYear() === year) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export const DAY_ABBREVS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
export const MONTH_ABBREVS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

export function getDayAbbrev(date: Date): string {
  return DAY_ABBREVS[date.getDay()];
}

export function getMonthAbbrev(date: Date): string {
  return MONTH_ABBREVS[date.getMonth()];
}

/** Extract YYYY-MM-DD from ISO datetime string, or return as-is if already a date */
export function toDateString(dateOrDateTime: string): string {
  return dateOrDateTime.split("T")[0];
}

/** Extract HH:MM time from ISO datetime string */
export function toTimeString(dateTime: string): string {
  const date = new Date(dateTime);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Add days to a YYYY-MM-DD string and return new YYYY-MM-DD */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}
