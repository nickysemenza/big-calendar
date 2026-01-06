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

const DAY_ABBREVS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_ABBREVS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

export function getDayAbbrev(date: Date): string {
  return DAY_ABBREVS[date.getDay()];
}

export function getMonthAbbrev(date: Date): string {
  return MONTH_ABBREVS[date.getMonth()];
}
