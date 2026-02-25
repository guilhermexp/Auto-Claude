import { createClient } from "@convex-dev/better-auth";
import { components } from "./_generated/api";

/**
 * Better Auth client for use in Convex functions.
 *
 * - `betterAuthClient.getAuthUser(ctx)` — get authenticated user or throw
 * - `betterAuthClient.safeGetAuthUser(ctx)` — get authenticated user or null
 * - `betterAuthClient.registerRoutes(http, createAuth)` — register HTTP auth routes
 * - `betterAuthClient.adapter(ctx)` — get database adapter for Better Auth config
 */
export const betterAuthClient = createClient(components.betterAuth, {
  verbose: false,
});
