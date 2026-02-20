import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuthClient } from "../auth";
import authConfig from "../auth.config";
/**
 * Creates a Better Auth instance configured for this Convex project.
 * Called from HTTP action handlers with the current Convex context.
 */
export const createAuth = (ctx) => {
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
            organization(),
            convex({ authConfig }),
        ],
    });
};
