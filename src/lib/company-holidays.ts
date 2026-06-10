import { addDays, formatDate } from "./dates";
import type { CalendarEvent } from "./validators";

// Virtual calendar for company holidays
export const COMPANY_HOLIDAYS_ID = "virtual:company-holidays";
export const COMPANY_HOLIDAYS_COLOR = "#e91e63";

export interface CompanyHoliday {
  date: string; // YYYY-MM-DD
  name: string;
}

// Nth occurrence of a weekday in a month (month is 0-based, weekday 0 = Sunday)
function nthWeekday(
  year: number,
  month: number,
  weekday: number,
  n: number,
): string {
  const firstDay = new Date(year, month, 1).getDay();
  const offset = (weekday - firstDay + 7) % 7;
  return formatDate(new Date(year, month, 1 + offset + (n - 1) * 7));
}

// Last occurrence of a weekday in a month
function lastWeekday(year: number, month: number, weekday: number): string {
  const lastDate = new Date(year, month + 1, 0);
  const offset = (lastDate.getDay() - weekday + 7) % 7;
  return formatDate(new Date(year, month + 1, -offset));
}

// Fixed-date holiday with weekend observation: Sat -> Fri, Sun -> Mon
function observed(
  year: number,
  month: number,
  day: number,
  name: string,
): CompanyHoliday {
  const d = new Date(year, month, day);
  if (d.getDay() === 6) {
    d.setDate(d.getDate() - 1);
    return { date: formatDate(d), name: `${name} (observed)` };
  }
  if (d.getDay() === 0) {
    d.setDate(d.getDate() + 1);
    return { date: formatDate(d), name: `${name} (observed)` };
  }
  return { date: formatDate(d), name };
}

// US company holidays, computed from rules so any year works
export function getCompanyHolidays(year: number): CompanyHoliday[] {
  const thanksgiving = nthWeekday(year, 10, 4, 4); // 4th Thursday of November
  return [
    observed(year, 0, 1, "New Year's Day"),
    { date: nthWeekday(year, 0, 1, 3), name: "Martin Luther King Jr. Day" },
    { date: nthWeekday(year, 1, 1, 3), name: "President's Day" },
    { date: lastWeekday(year, 4, 1), name: "Memorial Day" },
    observed(year, 6, 4, "Independence Day"),
    { date: nthWeekday(year, 8, 1, 1), name: "Labor Day" },
    { date: thanksgiving, name: "Thanksgiving" },
    { date: addDays(thanksgiving, 1), name: "Day After Thanksgiving" },
    observed(year, 11, 25, "Christmas"),
  ];
}

export function getCompanyHolidayEvents(year: number): CalendarEvent[] {
  return getCompanyHolidays(year).map((h, i) => ({
    id: `company-holiday-${year}-${i}`,
    summary: h.name,
    start: h.date,
    end: addDays(h.date, 1), // End date is exclusive
    calendarId: COMPANY_HOLIDAYS_ID,
    calendarName: "Company Holidays",
    color: COMPANY_HOLIDAYS_COLOR,
    isAllDay: true,
    isRecurring: false,
  }));
}
