import { eq } from "drizzle-orm";
import type { Bindings } from "../env";
import type { Database } from "./db";
import { accounts } from "./schema";
import {
  googleTokenErrorSchema,
  googleTokenResponseSchema,
} from "./validators";

export interface TokenRefreshResult {
  accessToken: string;
  expiresAt: Date;
  refreshToken?: string;
}

export class TokenRefreshFailedError extends Error {
  constructor(
    public readonly errorCode: string,
    message: string,
  ) {
    super(message);
    this.name = "TokenRefreshFailedError";
  }

  requiresReauth(): boolean {
    return this.errorCode === "invalid_grant";
  }
}

/**
 * Refresh Google OAuth access token using the refresh token.
 */
export async function refreshGoogleToken(
  refreshToken: string,
  env: Bindings,
): Promise<TokenRefreshResult> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    // A non-JSON or unexpected error body must still produce a
    // TokenRefreshFailedError so requiresReauth() stays accurate
    const error = googleTokenErrorSchema.safeParse(
      await response.json().catch(() => null),
    );
    if (error.success) {
      throw new TokenRefreshFailedError(
        error.data.error,
        error.data.error_description || "Token refresh failed",
      );
    }
    throw new TokenRefreshFailedError(
      "unknown_error",
      `Token refresh failed with HTTP ${response.status}`,
    );
  }

  // A malformed success response should throw loudly
  const data = googleTokenResponseSchema.parse(await response.json());

  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
    refreshToken: data.refresh_token,
  };
}

/**
 * Update account tokens in the database.
 */
export async function updateAccountTokens(
  db: Database,
  userId: string,
  tokens: {
    accessToken: string;
    accessTokenExpiresAt: Date;
    refreshToken?: string;
  },
): Promise<void> {
  await db
    .update(accounts)
    .set({
      accessToken: tokens.accessToken,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      ...(tokens.refreshToken && { refreshToken: tokens.refreshToken }),
      updatedAt: new Date(),
    })
    .where(eq(accounts.userId, userId));
}
