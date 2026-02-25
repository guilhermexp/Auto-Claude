// Re-export the Better Auth component config.
// The actual component is in @convex-dev/better-auth.
// This file exists for organizational clarity only — the app-level
// convex.config.ts imports directly from the npm package.
import betterAuth from "@convex-dev/better-auth/convex.config";

export default betterAuth;
