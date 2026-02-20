import { betterAuthClient } from "./auth";
import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Validates the current session and returns the authenticated user's Better Auth ID.
 * Throws if not authenticated.
 */
export async function requireAuthUserId(
  ctx: QueryCtx | MutationCtx
): Promise<string> {
  const user = await betterAuthClient.getAuthUser(ctx);
  // Better Auth Convex adapter uses _id (Convex doc ID), not id
  return (user._id ?? (user as Record<string, unknown>).id) as string;
}

/**
 * Validates the current session and returns the user or null.
 */
export async function getOptionalAuthUser(ctx: QueryCtx | MutationCtx) {
  return betterAuthClient.safeGetAuthUser(ctx);
}

/**
 * Verifies the user is authenticated AND is a member of the given team.
 * Checks the app-level org_memberships table (populated by our HTTP endpoints).
 */
export async function requireTeamAccess(
  ctx: QueryCtx | MutationCtx,
  teamId: string
): Promise<string> {
  if (!teamId) {
    throw new Error("teamId is required");
  }

  const userId = await requireAuthUserId(ctx);

  const membership = await ctx.db
    .query("org_memberships")
    .withIndex("by_org_user", (q) =>
      q.eq("organizationId", teamId).eq("userId", userId)
    )
    .unique();

  if (!membership) {
    throw new Error("Not a member of this team");
  }

  return userId;
}

/**
 * Checks that the authenticated user has access to the given project
 * (via team membership). Returns the project document.
 */
export async function requireProjectAccess(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">
) {
  const project = await ctx.db.get(projectId);
  if (!project) {
    throw new Error("Project not found");
  }
  await requireTeamAccess(ctx, project.teamId);
  return project;
}
