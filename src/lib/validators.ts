import { z } from "zod";

// View enum - used in components and query params
export const viewSchema = z.enum(["continuous", "month", "weekends"]);
export type View = z.infer<typeof viewSchema>;

export const calendarQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  view: viewSchema.optional().default("continuous"),
  hide: z.string().optional(), // comma-separated calendar hashes to hide
  hideEvents: z.string().optional(), // comma-separated event name hashes to hide
  timed: z.enum(["true", "false"]).optional().transform((v) => v === "true"),
  hideRecurring: z.enum(["true", "false"]).optional().transform((v) => v === "true"),
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
        start: z.object({ date: z.string().optional(), dateTime: z.string().optional() }).optional(),
        end: z.object({ date: z.string().optional(), dateTime: z.string().optional() }).optional(),
        recurringEventId: z.string().optional(),
      })
    )
    .optional(),
});

export type GoogleEventsResponse = z.infer<typeof googleEventsResponseSchema>;

// Auth response
export const authResponseSchema = z.object({
  url: z.string().optional(),
  redirect: z.boolean().optional(),
});

export type AuthResponse = z.infer<typeof authResponseSchema>;
