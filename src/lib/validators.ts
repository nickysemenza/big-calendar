import { z } from "zod";

// View enum - used in components and query params
export const viewSchema = z.enum(["continuous", "month", "weekends"]);
export type View = z.infer<typeof viewSchema>;

export const calendarQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  view: viewSchema.optional().default("continuous"),
  hide: z.string().optional(), // comma-separated calendar hashes to hide
  hideEvents: z.string().optional(), // comma-separated event name hashes to hide
  timed: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  hideRecurring: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  wideMode: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export type CalendarQuery = z.infer<typeof calendarQuerySchema>;
export type BuildUrlOverrides = Partial<CalendarQuery>;

// Google Calendar API types
export const googleCalendarSchema = z.object({
  id: z.string(),
  summary: z.string(),
  backgroundColor: z.string().optional(),
});

export type GoogleCalendar = z.infer<typeof googleCalendarSchema>;

export const googleCalendarListSchema = z.object({
  items: z.array(googleCalendarSchema).default([]),
});

export const googleEventsResponseSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        summary: z.string().optional(),
        start: z
          .object({
            date: z.string().optional(),
            dateTime: z.string().optional(),
          })
          .optional(),
        end: z
          .object({
            date: z.string().optional(),
            dateTime: z.string().optional(),
          })
          .optional(),
        recurringEventId: z.string().optional(),
      }),
    )
    .optional(),
});

export type GoogleEventsResponse = z.infer<typeof googleEventsResponseSchema>;

// Cached values read back from KV - validate instead of trusting the cast
export const cachedCalendarsSchema = z.array(googleCalendarSchema);

// Google OAuth token endpoint responses
export const googleTokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
});

export const googleTokenErrorSchema = z.object({
  error: z.string(),
  error_description: z.string().optional(),
});

// Auth response
export const authResponseSchema = z.object({
  url: z.string().optional(),
  redirect: z.boolean().optional(),
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

// Internal app types
export const calendarEventSchema = z.object({
  id: z.string(),
  summary: z.string(),
  start: z.string(), // YYYY-MM-DD
  end: z.string(), // YYYY-MM-DD (exclusive)
  startTime: z.string().optional(), // HH:MM for timed events
  endTime: z.string().optional(), // HH:MM for timed events
  calendarId: z.string(),
  calendarName: z.string(),
  color: z.string(),
  isAllDay: z.boolean(),
  isRecurring: z.boolean(),
});

export type CalendarEvent = z.infer<typeof calendarEventSchema>;

export const cachedEventsSchema = z.array(calendarEventSchema);

export const calendarInfoSchema = z.object({
  id: z.string(),
  hash: z.string(), // Short 4-char hash for URL-friendly hiding
  name: z.string(),
  color: z.string(),
  eventCount: z.number(),
  hidden: z.boolean(),
});

export type CalendarInfo = z.infer<typeof calendarInfoSchema>;
