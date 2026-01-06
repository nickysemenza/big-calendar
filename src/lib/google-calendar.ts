import type { CalendarEvent, GoogleCalendar } from "../env";
import { googleCalendarListSchema } from "./validators";

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
  return googleCalendarListSchema.parse(data).items;
}

export async function getEvents(
  accessToken: string,
  calendars: GoogleCalendar[],
  year: number
): Promise<CalendarEvent[]> {
  const timeMin = `${year}-01-01T00:00:00Z`;
  const timeMax = `${year}-12-31T23:59:59Z`;

  const events: CalendarEvent[] = [];

  for (const calendar of calendars) {
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
        end?: { date?: string };
      }>;
    };

    // All-day events only (have start.date, not start.dateTime)
    for (const item of data.items || []) {
      if (item.start?.date) {
        events.push({
          id: item.id,
          summary: item.summary || "(No title)",
          start: item.start.date,
          end: item.end?.date || item.start.date,
          calendarId: calendar.id,
          calendarName: calendar.summary,
          color: calendar.backgroundColor || "#4285f4",
        });
      }
    }
  }

  return events;
}
