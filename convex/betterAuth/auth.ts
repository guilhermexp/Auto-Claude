import { betterAuth } from "better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuthClient } from "../auth";
import authConfig from "../auth.config";
import type { DataModel } from "../_generated/dataModel";
import type { GenericQueryCtx, GenericMutationCtx, GenericActionCtx } from "convex/server";

type Ctx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel> | GenericActionCtx<DataModel>;

/**
 * Creates a Better Auth instance configured for this Convex project.
 * Called from HTTP action handlers with the current Convex context.
 */
export const createAuth = (ctx: Ctx) => {
  return betterAuth({
    database: betterAuthClient.adapter(ctx),
    baseURL: process.env.CONVEX_SITE_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    emailAndPassword: {
      enabled: true,
    },
    session: {
      expiresIn: 30 * 24 * 60 * 60, // 30 days
    },
    trustedOrigins: [
      process.env.CONVEX_SITE_URL ?? "",
    ],
    plugins: [
      convex({ authConfig }),
    ],
  });
};
