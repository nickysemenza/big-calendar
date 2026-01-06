import type { Session, User } from "better-auth";

export type Bindings = {
  DB: D1Database;
  CACHE: KVNamespace;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
};

export type Variables = {
  user: User | null;
  session: Session | null;
  accessToken: string | null;
};

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD (exclusive)
  calendarId: string;
  calendarName: string;
  color: string;
  isAllDay: boolean;
  isRecurring: boolean;
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  backgroundColor?: string;
}

export interface CalendarInfo {
  id: string;
  hash: string; // Short 4-char hash for URL-friendly hiding
  name: string;
  color: string;
  eventCount: number;
  hidden: boolean;
}

// Simple hash function - produces 4 hex chars from a string
export function shortHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to positive hex and take first 4 chars
  return Math.abs(hash).toString(16).slice(0, 4).padStart(4, '0');
}
