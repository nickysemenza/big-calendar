import type { CalendarEvent, GoogleCalendar } from "../env";
import { googleCalendarListSchema } from "./validators";
import { toDateString, addDays } from "./dates";

// Special Google system calendars that don't appear in calendarList
const SPECIAL_CALENDARS = [
  { id: "addressbook#contacts@group.v.calendar.google.com", name: "Birthdays", color: "#9a9cff" },
  { id: "en.usa#holiday@group.v.calendar.google.com", name: "Holidays in United States", color: "#4caf50" },
];

// Virtual calendar for company holidays
const COMPANY_HOLIDAYS_ID = "virtual:company-holidays";
const COMPANY_HOLIDAYS_COLOR = "#e91e63";

const COMPANY_HOLIDAYS: Record<number, Array<{ date: string; name: string }>> = {
  2025: [
    { date: "2025-01-01", name: "New Year's Day" },
    { date: "2025-01-20", name: "Martin Luther King Jr. Day" },
    { date: "2025-02-17", name: "President's Day" },
    { date: "2025-05-26", name: "Memorial Day" },
    { date: "2025-07-04", name: "Independence Day" },
    { date: "2025-09-01", name: "Labor Day" },
    { date: "2025-11-27", name: "Thanksgiving" },
    { date: "2025-11-28", name: "Day After Thanksgiving" },
    { date: "2025-12-25", name: "Christmas" },
  ],
  2026: [
    { date: "2026-01-01", name: "New Year's Day" },
    { date: "2026-01-19", name: "Martin Luther King Jr. Day" },
    { date: "2026-02-16", name: "President's Day" },
    { date: "2026-05-25", name: "Memorial Day" },
    { date: "2026-07-03", name: "Independence Day (observed)" },
    { date: "2026-09-07", name: "Labor Day" },
    { date: "2026-11-26", name: "Thanksgiving" },
    { date: "2026-11-27", name: "Day After Thanksgiving" },
    { date: "2026-12-25", name: "Christmas" },
  ],
};

function getCompanyHolidayEvents(year: number): CalendarEvent[] {
  const holidays = COMPANY_HOLIDAYS[year] || [];
  return holidays.map((h, i) => ({
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

export async function getCalendarList(
  accessToken: string
): Promise<GoogleCalendar[]> {
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    console.error("Failed to fetch calendar list:", res.status);
    return [];
  }

  const data = await res.json();
  const calendars = googleCalendarListSchema.parse(data).items;

  // Try to add special calendars that don't appear in calendarList
  for (const special of SPECIAL_CALENDARS) {
    const alreadyExists = calendars.some((c) => c.id === special.id);
    if (alreadyExists) continue;

    // Try to fetch calendar metadata directly
    const specialRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(special.id)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (specialRes.ok) {
      const cal = (await specialRes.json()) as {
        id: string;
        summary: string;
        backgroundColor?: string;
      };
      calendars.push({
        id: cal.id,
        summary: cal.summary || special.name,
        backgroundColor: cal.backgroundColor || special.color,
      });
    }
  }

  // Add virtual Company Holidays calendar
  calendars.push({
    id: COMPANY_HOLIDAYS_ID,
    summary: "Company Holidays",
    backgroundColor: COMPANY_HOLIDAYS_COLOR,
  });

  return calendars;
}

export async function getEvents(
  accessToken: string,
  calendars: GoogleCalendar[],
  year: number,
  includeTimed: boolean = false
): Promise<CalendarEvent[]> {
  const timeMin = `${year}-01-01T00:00:00Z`;
  const timeMax = `${year}-12-31T23:59:59Z`;

  const events: CalendarEvent[] = [];

  // Add company holidays (virtual calendar)
  events.push(...getCompanyHolidayEvents(year));

  for (const calendar of calendars) {
    // Skip virtual calendars
    if (calendar.id.startsWith("virtual:")) {
      continue;
    }

    const url = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events`
    );
    url.searchParams.set("timeMin", timeMin);
    url.searchParams.set("timeMax", timeMax);
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("maxResults", "2500");

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      console.error(`Failed to fetch ${calendar.id}: ${res.status}`);
      continue;
    }

    const data = (await res.json()) as {
      items?: Array<{
        id: string;
        summary?: string;
        start?: { date?: string; dateTime?: string };
        end?: { date?: string; dateTime?: string };
        recurringEventId?: string;
      }>;
    };

    for (const item of data.items || []) {
      const isRecurring = !!item.recurringEventId;

      // All-day events (have start.date)
      if (item.start?.date) {
        events.push({
          id: item.id,
          summary: item.summary || "(No title)",
          start: item.start.date,
          end: item.end?.date || item.start.date,
          calendarId: calendar.id,
          calendarName: calendar.summary,
          color: calendar.backgroundColor || "#4285f4",
          isAllDay: true,
          isRecurring,
        });
      }
      // Timed events (have start.dateTime)
      else if (includeTimed && item.start?.dateTime) {
        const startDate = toDateString(item.start.dateTime);
        const endDate = item.end?.dateTime ? toDateString(item.end.dateTime) : startDate;
        events.push({
          id: item.id,
          summary: item.summary || "(No title)",
          start: startDate,
          end: endDate === startDate ? addDays(startDate, 1) : endDate,
          calendarId: calendar.id,
          calendarName: calendar.summary,
          color: calendar.backgroundColor || "#4285f4",
          isAllDay: false,
          isRecurring,
        });
      }
    }
  }

  return events;
}
