import { z } from "zod";

export const calendarQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  view: z.enum(["continuous", "month", "weekends"]).optional().default("continuous"),
  hide: z.string().optional(), // comma-separated calendar hashes to hide
  hideEvents: z.string().optional(), // comma-separated event name hashes to hide
  timed: z.enum(["true", "false"]).optional().transform((v) => v === "true"),
  hideRecurring: z.enum(["true", "false"]).optional().transform((v) => v === "true"),
});

export const googleCalendarListSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        summary: z.string(),
        backgroundColor: z.string().optional(),
      })
    )
    .default([]),
});

export type CalendarQuery = z.infer<typeof calendarQuerySchema>;
