import { Hono } from "hono";
import type { Bindings, Variables, CalendarEvent, CalendarInfo } from "./env";
import { createAuth } from "./lib/auth";
import { authMiddleware } from "./middleware/auth";
import { getCalendarList, getEvents } from "./lib/google-calendar";
import { calendarQuerySchema } from "./lib/validators";
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
    const data = (await response.json()) as { url?: string; redirect?: boolean };
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
    timed: c.req.query("timed"),
    hideRecurring: c.req.query("hideRecurring"),
  });
  const year =
    query.success && query.data.year
      ? query.data.year
      : new Date().getFullYear();
  const view = query.success ? query.data.view : "continuous";
  const hide = query.success ? query.data.hide : undefined;
  const showTimed = query.success ? query.data.timed : false;
  const hideRecurring = query.success ? query.data.hideRecurring : false;

  // Parse hidden calendar IDs
  const hiddenSet = new Set(
    hide ? hide.split(",").map(decodeURIComponent) : []
  );

  let allEvents: CalendarEvent[] = [];
  let calendarInfos: CalendarInfo[] = [];

  if (accessToken) {
    try {
      const calendars = await getCalendarList(accessToken);
      allEvents = await getEvents(accessToken, calendars, year, showTimed);

      // Compute event counts per calendar
      const countsByCalendar = new Map<string, number>();
      for (const event of allEvents) {
        const count = countsByCalendar.get(event.calendarId) || 0;
        countsByCalendar.set(event.calendarId, count + 1);
      }

      // Build CalendarInfo array
      calendarInfos = calendars.map((cal) => ({
        id: cal.id,
        name: cal.summary,
        color: cal.backgroundColor || "#4285f4",
        eventCount: countsByCalendar.get(cal.id) || 0,
        hidden: hiddenSet.has(cal.id),
      }));
    } catch (error) {
      console.error("Failed to fetch events:", error);
    }
  }

  // Filter out hidden calendar events and optionally recurring events
  const visibleEvents = allEvents.filter((e) => {
    if (hiddenSet.has(e.calendarId)) return false;
    if (hideRecurring && e.isRecurring) return false;
    return true;
  });

  return c.render(
    <div class="flex flex-col h-screen">
      <Header
        year={year}
        view={view}
        calendars={calendarInfos}
        userEmail={user?.email || ""}
        showTimed={showTimed}
        hideRecurring={hideRecurring}
      />
      <YearCalendar year={year} events={visibleEvents} view={view} />
    </div>
  );
});

export default app;
