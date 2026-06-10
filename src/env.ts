import type { Session, User } from "better-auth";
import type {
  CalendarEvent,
  CalendarInfo,
  GoogleCalendar,
} from "./lib/validators";

export type { CalendarEvent, CalendarInfo, GoogleCalendar };

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

// Simple hash function - produces 4 hex chars from a string
export function shortHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to positive hex and take first 4 chars
  return Math.abs(hash).toString(16).slice(0, 4).padStart(4, "0");
}
