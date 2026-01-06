import type { D1Database } from "@cloudflare/workers-types";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import type { Bindings } from "../env";

// Create auth instance for runtime usage
export function createAuth(env: Bindings) {
  const db = drizzle(env.DB, { schema });

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
      },
    }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.BETTER_AUTH_URL],
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        scope: [
          "openid",
          "email",
          "profile",
          "https://www.googleapis.com/auth/calendar.readonly",
        ],
      },
    },
  });
}

// Export for CLI schema generation (uses placeholder adapter)
export const auth = betterAuth({
  database: drizzleAdapter({} as D1Database, {
    provider: "sqlite",
  }),
  socialProviders: {
    google: {
      clientId: "placeholder",
      clientSecret: "placeholder",
    },
  },
});
