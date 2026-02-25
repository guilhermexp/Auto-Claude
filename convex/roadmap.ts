import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuthUserId, requireProjectAccess } from "./helpers";

/** Create or update the roadmap for a project. Uses LWW via updatedAt. */
export const upsertRoadmap = mutation({
  args: {
    projectId: v.id("projects"),
    features: v.any(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    await requireProjectAccess(ctx, args.projectId);

    const existing = await ctx.db
      .query("roadmap")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .unique();

    if (existing) {
      if (args.updatedAt <= existing.updatedAt) return existing._id;

      await ctx.db.patch(existing._id, {
        features: args.features,
        updatedAt: args.updatedAt,
        updatedBy: userId,
      });
      return existing._id;
    }

    return await ctx.db.insert("roadmap", {
      projectId: args.projectId,
      features: args.features,
      updatedAt: args.updatedAt,
      updatedBy: userId,
    });
  },
});

/** Get roadmap for a project. */
export const getRoadmap = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    await requireProjectAccess(ctx, args.projectId);

    return await ctx.db
      .query("roadmap")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .unique();
  },
});
