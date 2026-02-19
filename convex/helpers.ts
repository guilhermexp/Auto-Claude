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
  return user.id as string;
}

/**
 * Validates the current session and returns the user or null.
 */
export async function getOptionalAuthUser(ctx: QueryCtx | MutationCtx) {
  return betterAuthClient.safeGetAuthUser(ctx);
}

/**
 * Checks that the authenticated user is a member of the given team
 * with one of the allowed roles. Returns the membership document.
 */
export async function requireTeamMembership(
  ctx: QueryCtx | MutationCtx,
  teamId: Id<"teams">,
  allowedRoles?: Array<"owner" | "admin" | "member">
) {
  const userId = await requireAuthUserId(ctx);
  const membership = await ctx.db
    .query("team_members")
    .withIndex("by_team_user", (q) => q.eq("teamId", teamId).eq("userId", userId))
    .unique();

  if (!membership || membership.status !== "active") {
    throw new Error("Not a member of this team");
  }

  if (allowedRoles && !allowedRoles.includes(membership.role)) {
    throw new Error(`Requires one of: ${allowedRoles.join(", ")}`);
  }

  return membership;
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
  await requireTeamMembership(ctx, project.teamId);
  return project;
}
