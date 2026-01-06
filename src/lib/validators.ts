import { z } from "zod";

export const calendarQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
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
