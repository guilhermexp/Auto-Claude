import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuthUserId, requireTeamMembership } from "./helpers";

/** Create or update a project for a team. */
export const upsertProject = mutation({
  args: {
    teamId: v.id("teams"),
    projectName: v.string(),
    projectHash: v.string(),
    settings: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    await requireTeamMembership(ctx, args.teamId);

    const existing = await ctx.db
      .query("projects")
      .withIndex("by_team_hash", (q) =>
        q.eq("teamId", args.teamId).eq("projectHash", args.projectHash)
      )
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        projectName: args.projectName,
        settings: args.settings ?? existing.settings,
        updatedAt: now,
        updatedBy: userId,
      });
      return existing._id;
    }

    return await ctx.db.insert("projects", {
      teamId: args.teamId,
      projectName: args.projectName,
      projectHash: args.projectHash,
      settings: args.settings,
      updatedAt: now,
      updatedBy: userId,
    });
  },
});

/** Get all projects for a team. */
export const getTeamProjects = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    await requireTeamMembership(ctx, args.teamId);

    return await ctx.db
      .query("projects")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});
