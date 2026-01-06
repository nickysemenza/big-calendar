import { Hono } from "hono";
import type { Bindings, Variables, CalendarEvent } from "./env";
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
app.get("/signout", (c) => {
  return c.redirect("/api/auth/signout");
});

// Main calendar view (protected)
app.get("/", authMiddleware, async (c) => {
  const user = c.get("user");
  const accessToken = c.get("accessToken");

  const query = calendarQuerySchema.safeParse({
    year: c.req.query("year"),
    view: c.req.query("view"),
  });
  const year =
    query.success && query.data.year
      ? query.data.year
      : new Date().getFullYear();
  const view = query.success ? query.data.view : "continuous";

  let events: CalendarEvent[] = [];

  if (accessToken) {
    try {
      const calendars = await getCalendarList(accessToken);
      events = await getEvents(accessToken, calendars, year);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    }
  }

  return c.render(
    <div class="flex flex-col h-screen">
      <Header year={year} view={view} userEmail={user?.email || ""} />
      <YearCalendar year={year} events={events} view={view} />
    </div>
  );
});

export default app;
