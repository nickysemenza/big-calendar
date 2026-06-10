import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import type { Bindings, Variables } from "../env";
import { createAuth } from "../lib/auth";
import { createDb } from "../lib/db";
import {
  refreshGoogleToken,
  TokenRefreshFailedError,
  updateAccountTokens,
} from "../lib/google-token";
import { accounts } from "../lib/schema";

const EXPIRY_BUFFER_MS = 5 * 60 * 1000; // Refresh 5 minutes before expiration

export const authMiddleware = createMiddleware<{
  Bindings: Bindings;
  Variables: Variables;
}>(async (c, next) => {
  const auth = createAuth(c.env);

  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.redirect("/login");
  }

  c.set("user", session.user);
  c.set("session", session.session);

  // Get account with tokens from database
  const db = createDb(c.env.DB);
  const [acct] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, session.user.id))
    .limit(1);

  if (!acct) {
    return c.redirect("/login");
  }

  let accessToken = acct.accessToken;

  // Check if token needs refresh
  const needsRefresh =
    !acct.accessTokenExpiresAt ||
    Date.now() >= acct.accessTokenExpiresAt.getTime() - EXPIRY_BUFFER_MS;

  if (needsRefresh) {
    if (!acct.refreshToken) {
      return c.redirect("/login");
    }

    try {
      const newTokens = await refreshGoogleToken(acct.refreshToken, c.env);

      await updateAccountTokens(db, session.user.id, {
        accessToken: newTokens.accessToken,
        accessTokenExpiresAt: newTokens.expiresAt,
        refreshToken: newTokens.refreshToken,
      });

      accessToken = newTokens.accessToken;
    } catch (error) {
      if (error instanceof TokenRefreshFailedError && error.requiresReauth()) {
        // Refresh token is invalid - clear tokens and redirect to login
        await db
          .update(accounts)
          .set({
            accessToken: null,
            refreshToken: null,
            accessTokenExpiresAt: null,
          })
          .where(eq(accounts.userId, session.user.id));

        return c.redirect("/login");
      }
      // For other errors, continue with existing token
      console.error("Token refresh error:", error);
    }
  }

  c.set("accessToken", accessToken);

  await next();
});
