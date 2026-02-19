import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuthUserId, requireProjectAccess } from "./helpers";

/** Create or update ideation data for a project. Uses LWW via updatedAt. */
export const upsertIdeation = mutation({
  args: {
    projectId: v.id("projects"),
    ideas: v.any(),
    config: v.optional(v.any()),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    await requireProjectAccess(ctx, args.projectId);

    const existing = await ctx.db
      .query("ideation")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .unique();

    if (existing) {
      if (args.updatedAt <= existing.updatedAt) return existing._id;

      await ctx.db.patch(existing._id, {
        ideas: args.ideas,
        config: args.config ?? existing.config,
        updatedAt: args.updatedAt,
        updatedBy: userId,
      });
      return existing._id;
    }

    return await ctx.db.insert("ideation", {
      projectId: args.projectId,
      ideas: args.ideas,
      config: args.config,
      updatedAt: args.updatedAt,
      updatedBy: userId,
    });
  },
});

/** Get ideation data for a project. */
export const getIdeation = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    await requireProjectAccess(ctx, args.projectId);

    return await ctx.db
      .query("ideation")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .unique();
  },
});
