import type { CalendarEvent, GoogleCalendar } from "../env";
import {
  COMPANY_HOLIDAYS_COLOR,
  COMPANY_HOLIDAYS_ID,
  getCompanyHolidayEvents,
} from "./company-holidays";
import { addDays, toDateString, toTimeString } from "./dates";
import {
  cachedCalendarsSchema,
  cachedEventsSchema,
  googleCalendarListSchema,
  googleCalendarSchema,
  googleEventsResponseSchema,
} from "./validators";

// Special Google system calendars that don't appear in calendarList
const SPECIAL_CALENDARS = [
  {
    id: "addressbook#contacts@group.v.calendar.google.com",
    name: "Birthdays",
    color: "#9a9cff",
  },
  {
    id: "en.usa#holiday@group.v.calendar.google.com",
    name: "Holidays in United States",
    color: "#4caf50",
  },
];

const CACHE_TTL = 60; // 1 minute

export async function getCalendarList(
  accessToken: string,
  cache: KVNamespace,
  userId: string,
): Promise<GoogleCalendar[]> {
  // Check cache first; refetch if the cached shape doesn't validate
  const cacheKey = `calendars:${userId}`;
  const cached = cachedCalendarsSchema.safeParse(
    await cache.get(cacheKey, "json"),
  );
  if (cached.success) {
    return cached.data;
  }

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    throw new Error(
      `Google Calendar API error (${res.status}) fetching calendar list`,
    );
  }

  const data = await res.json();
  const calendars = googleCalendarListSchema.parse(data).items;

  // Try to add special calendars that don't appear in calendarList (in parallel)
  const specialFetches = SPECIAL_CALENDARS.filter(
    (special) => !calendars.some((c) => c.id === special.id),
  ).map(async (special) => {
    const specialRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(special.id)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (specialRes.ok) {
      const cal = googleCalendarSchema.parse(await specialRes.json());
      return {
        id: cal.id,
        summary: cal.summary || special.name,
        backgroundColor: cal.backgroundColor || special.color,
      };
    }
    return null;
  });

  const specialResults = await Promise.all(specialFetches);
  for (const cal of specialResults) {
    if (cal) calendars.push(cal);
  }

  // Add virtual Company Holidays calendar
  calendars.push({
    id: COMPANY_HOLIDAYS_ID,
    summary: "Company Holidays",
    backgroundColor: COMPANY_HOLIDAYS_COLOR,
  });

  // Store in cache
  await cache.put(cacheKey, JSON.stringify(calendars), {
    expirationTtl: CACHE_TTL,
  });

  return calendars;
}

export async function getEvents(
  accessToken: string,
  calendars: GoogleCalendar[],
  year: number,
  cache: KVNamespace,
  userId: string,
): Promise<CalendarEvent[]> {
  // Check cache first; refetch if the cached shape doesn't validate
  const cacheKey = `events:${userId}:${year}`;
  const cached = cachedEventsSchema.safeParse(
    await cache.get(cacheKey, "json"),
  );
  if (cached.success) {
    return cached.data;
  }

  const timeMin = `${year}-01-01T00:00:00Z`;
  const timeMax = `${year}-12-31T23:59:59Z`;

  const events: CalendarEvent[] = [];

  // Add company holidays (virtual calendar)
  events.push(...getCompanyHolidayEvents(year));

  // Fetch all calendars in parallel (always include timed events for caching)
  const calendarFetches = calendars
    .filter((calendar) => !calendar.id.startsWith("virtual:"))
    .map(async (calendar) => {
      const url = new URL(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events`,
      );
      url.searchParams.set("timeMin", timeMin);
      url.searchParams.set("timeMax", timeMax);
      url.searchParams.set("singleEvents", "true");
      url.searchParams.set("maxResults", "2500");

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        // Auth failures affect every calendar - surface them to the user.
        // Other per-calendar errors just skip that calendar so one flaky
        // shared calendar doesn't blank the whole year.
        if (res.status === 401 || res.status === 403) {
          throw new Error(
            `Google Calendar API auth error (${res.status}) fetching events`,
          );
        }
        console.error(`Failed to fetch ${calendar.id}: ${res.status}`);
        return [];
      }

      const data = googleEventsResponseSchema.parse(await res.json());

      const calendarEvents: CalendarEvent[] = [];
      for (const item of data.items || []) {
        const isRecurring = !!item.recurringEventId;

        // All-day events (have start.date)
        if (item.start?.date) {
          calendarEvents.push({
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
        // Timed events (have start.dateTime) - always fetch for caching
        else if (item.start?.dateTime) {
          const startDate = toDateString(item.start.dateTime);
          const endDate = item.end?.dateTime
            ? toDateString(item.end.dateTime)
            : startDate;
          calendarEvents.push({
            id: item.id,
            summary: item.summary || "(No title)",
            start: startDate,
            end: endDate === startDate ? addDays(startDate, 1) : endDate,
            startTime: toTimeString(item.start.dateTime),
            endTime: item.end?.dateTime
              ? toTimeString(item.end.dateTime)
              : undefined,
            calendarId: calendar.id,
            calendarName: calendar.summary,
            color: calendar.backgroundColor || "#4285f4",
            isAllDay: false,
            isRecurring,
          });
        }
      }
      return calendarEvents;
    });

  const results = await Promise.all(calendarFetches);
  for (const calendarEvents of results) {
    events.push(...calendarEvents);
  }

  // Store in cache
  await cache.put(cacheKey, JSON.stringify(events), {
    expirationTtl: CACHE_TTL,
  });

  return events;
}
