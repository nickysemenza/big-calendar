import { Hono } from "hono";
import { shortHash, type Bindings, type Variables, type CalendarEvent, type CalendarInfo } from "./env";
import { createAuth } from "./lib/auth";
import { authMiddleware } from "./middleware/auth";
import { getCalendarList, getEvents } from "./lib/google-calendar";
import { calendarQuerySchema, type AuthResponse } from "./lib/validators";
import { Header } from "./components/Header";
import { YearCalendar } from "./components/YearCalendar";
import { renderer } from "./renderer";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use(renderer);

// Better Auth routes
app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return createAuth(c.env).handler(c.req.raw);
});

// Login page
app.get("/login", (c) => {
  return c.render(
    <div class="flex items-center justify-center min-h-screen bg-gray-50">
      <div class="text-center">
        <h1 class="text-3xl font-bold mb-8 text-gray-800">Big Calendar</h1>
        <p class="text-gray-600 mb-6">
          View all your Google Calendar events in a year view
        </p>
        <a
          href="/signin"
          class="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Sign in with Google
        </a>
      </div>
    </div>
  );
});

// Proxy sign-in to Better Auth with proper JSON body
app.post("/signin", async (c) => {
  const auth = createAuth(c.env);

  // Create a new request with JSON body
  const request = new Request(new URL("/api/auth/sign-in/social", c.req.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: c.req.header("Cookie") || "",
    },
    body: JSON.stringify({
      provider: "google",
      callbackURL: "/",
    }),
  });

  return auth.handler(request);
});

// GET redirect for the sign-in link
app.get("/signin", async (c) => {
  const auth = createAuth(c.env);
  const origin = new URL(c.req.url).origin;

  // Create a new request with JSON body
  const request = new Request(new URL("/api/auth/sign-in/social", c.req.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: c.req.header("Cookie") || "",
      Origin: origin,
    },
    body: JSON.stringify({
      provider: "google",
      callbackURL: "/",
    }),
  });

  const response = await auth.handler(request);

  // Check if response is JSON with redirect URL
  const contentType = response.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    const data = (await response.json()) as AuthResponse;
    if (data.url && data.redirect) {
      // Create redirect response with cookies from auth
      const redirectResponse = c.redirect(data.url);
      // Copy Set-Cookie headers
      const setCookie = response.headers.get("Set-Cookie");
      if (setCookie) {
        redirectResponse.headers.set("Set-Cookie", setCookie);
      }
      return redirectResponse;
    }
  }

  return response;
});

// Refresh cache helper route
app.get("/refresh", authMiddleware, async (c) => {
  const user = c.get("user");
  if (user) {
    // Delete all cached data for this user
    await Promise.all([
      c.env.CACHE.delete(`calendars:${user.id}`),
      // Delete events for multiple years (current and adjacent)
      ...[-1, 0, 1].map((offset) =>
        c.env.CACHE.delete(`events:${user.id}:${new Date().getFullYear() + offset}`)
      ),
    ]);
  }
  // Redirect back to the referring page or home
  const referer = c.req.header("Referer");
  return c.redirect(referer || "/");
});

// Sign out helper route
app.get("/signout", async (c) => {
  const auth = createAuth(c.env);
  const request = new Request(new URL("/api/auth/sign-out", c.req.url), {
    method: "POST",
    headers: {
      Cookie: c.req.header("Cookie") || "",
    },
  });
  const response = await auth.handler(request);

  // Create redirect with cleared session cookies
  const redirectResponse = c.redirect("/login");
  const setCookie = response.headers.get("Set-Cookie");
  if (setCookie) {
    redirectResponse.headers.set("Set-Cookie", setCookie);
  }
  return redirectResponse;
});

// Main calendar view (protected)
app.get("/", authMiddleware, async (c) => {
  const user = c.get("user");
  const accessToken = c.get("accessToken");

  const query = calendarQuerySchema.safeParse({
    year: c.req.query("year"),
    view: c.req.query("view"),
    hide: c.req.query("hide"),
    hideEvents: c.req.query("hideEvents"),
    timed: c.req.query("timed"),
    hideRecurring: c.req.query("hideRecurring"),
  });
  const year =
    query.success && query.data.year
      ? query.data.year
      : new Date().getFullYear();
  const view = query.success ? query.data.view : "continuous";
  const hide = query.success ? query.data.hide : undefined;
  const hideEvents = query.success ? query.data.hideEvents : undefined;
  const showTimed = query.success ? query.data.timed : false;
  const hideRecurring = query.success ? query.data.hideRecurring : false;

  // Parse hidden calendar hashes from URL
  const hiddenHashes = new Set(
    hide ? hide.split(",") : []
  );

  // Parse hidden event hashes from URL
  const hiddenEventHashes = new Set(
    hideEvents ? hideEvents.split(",") : []
  );

  let allEvents: CalendarEvent[] = [];
  let calendarInfos: CalendarInfo[] = [];
  let hiddenIds = new Set<string>();

  if (accessToken && user) {
    try {
      const calendars = await getCalendarList(accessToken, c.env.CACHE, user.id);
      allEvents = await getEvents(accessToken, calendars, year, c.env.CACHE, user.id);

      // Build hash-to-ID map and resolve hidden hashes to IDs
      const hashToId = new Map<string, string>();
      for (const cal of calendars) {
        hashToId.set(shortHash(cal.id), cal.id);
      }
      hiddenIds = new Set(
        [...hiddenHashes].map((h) => hashToId.get(h)).filter((id): id is string => !!id)
      );

      // Compute event counts per calendar (before filtering timed)
      const countsByCalendar = new Map<string, number>();
      for (const event of allEvents) {
        const count = countsByCalendar.get(event.calendarId) || 0;
        countsByCalendar.set(event.calendarId, count + 1);
      }

      // Build CalendarInfo array with hashes
      calendarInfos = calendars.map((cal) => ({
        id: cal.id,
        hash: shortHash(cal.id),
        name: cal.summary,
        color: cal.backgroundColor || "#4285f4",
        eventCount: countsByCalendar.get(cal.id) || 0,
        hidden: hiddenIds.has(cal.id),
      }));
    } catch (error) {
      console.error("Failed to fetch events:", error);
    }
  }

  // Build set of birthday events from the Birthdays calendar for deduplication
  const BIRTHDAYS_CALENDAR_ID = "addressbook#contacts@group.v.calendar.google.com";
  const birthdayKeys = new Set(
    allEvents
      .filter((e) => e.calendarId === BIRTHDAYS_CALENDAR_ID)
      .map((e) => `${e.summary.toLowerCase()}|${e.start}`)
  );

  // Filter events: hidden calendars, hidden events, timed events (if not showing), recurring events (if hiding)
  // Also deduplicate birthdays - if same event exists in Birthdays calendar, hide from other calendars
  const visibleEvents = allEvents.filter((e) => {
    if (hiddenIds.has(e.calendarId)) return false;
    // Check if event name hash is in hidden set
    if (hiddenEventHashes.has(shortHash(e.summary.toLowerCase()))) return false;
    if (!showTimed && !e.isAllDay) return false;
    if (hideRecurring && e.isRecurring) return false;
    // Dedupe: if this looks like a birthday from a non-Birthday calendar, and it exists in Birthdays, skip it
    if (e.calendarId !== BIRTHDAYS_CALENDAR_ID && birthdayKeys.has(`${e.summary.toLowerCase()}|${e.start}`)) {
      return false;
    }
    return true;
  });

  // Build current hideEvents param for passing to components
  const currentHideEventsParam = hideEvents || "";

  return c.render(
    <div class="flex flex-col h-screen">
      <Header
        year={year}
        view={view}
        calendars={calendarInfos}
        userEmail={user?.email || ""}
        showTimed={showTimed}
        hideRecurring={hideRecurring}
        hiddenEventCount={hiddenEventHashes.size}
      />
      <YearCalendar
        year={year}
        events={visibleEvents}
        view={view}
        hideCalendars={hide || ""}
        hideEvents={currentHideEventsParam}
        showTimed={showTimed}
        hideRecurring={hideRecurring}
      />
    </div>
  );
});

export default app;
