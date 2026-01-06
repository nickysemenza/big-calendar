import type { Session, User } from "better-auth";

export type Bindings = {
  DB: D1Database;
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
  color: string;
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  backgroundColor?: string;
}
