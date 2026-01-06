// Shared types for UI components
import type { CalendarEvent } from "../../lib/validators";

// Base type for consolidated events - multiple colors/calendars instead of single
type ConsolidatedBase = Omit<CalendarEvent, "color" | "calendarName" | "calendarId"> & {
  colors: string[];
  calendarNames: string[];
};

// Consolidated event with time info (for popup display)
export type ConsolidatedEvent = ConsolidatedBase;

// Consolidated calendar event without time info (for grid segments)
export type ConsolidatedCalendarEvent = Omit<ConsolidatedBase, "startTime" | "endTime">;

// Size configuration for responsive layouts
export interface SizeConfig {
  minRowHeight: number;
  headerHeight: number;
  eventHeight: number;
  isLarge?: boolean;
}

// Event segment data for positioned event bars
export interface EventSegmentData {
  event: ConsolidatedCalendarEvent;
  rowStart: number;
  colStart: number;
  colEnd: number; // exclusive
}
