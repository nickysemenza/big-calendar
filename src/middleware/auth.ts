import { createMiddleware } from "hono/factory";
import { eq } from "drizzle-orm";
import type { Bindings, Variables } from "../env";
import { createAuth } from "../lib/auth";
import { createDb } from "../lib/db";
import { accounts } from "../lib/schema";

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

  // Get access token from accounts table
  const db = createDb(c.env.DB);
  const [acct] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, session.user.id))
    .limit(1);

  c.set("accessToken", acct?.accessToken || null);

  await next();
});
