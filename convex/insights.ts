import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuthUserId, requireProjectAccess } from "./helpers";

/** Create or update an insights session. Uses LWW via updatedAt. */
export const upsertSession = mutation({
  args: {
    projectId: v.id("projects"),
    sessionId: v.string(),
    title: v.optional(v.string()),
    messages: v.any(),
    pendingAction: v.optional(v.any()),
    modelConfig: v.optional(v.any()),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    await requireProjectAccess(ctx, args.projectId);

    const existing = await ctx.db
      .query("insights_sessions")
      .withIndex("by_project_session", (q) =>
        q.eq("projectId", args.projectId).eq("sessionId", args.sessionId)
      )
      .unique();

    if (existing) {
      if (args.updatedAt <= existing.updatedAt) return existing._id;

      await ctx.db.patch(existing._id, {
        title: args.title ?? existing.title,
        messages: args.messages,
        pendingAction: args.pendingAction,
        modelConfig: args.modelConfig ?? existing.modelConfig,
        updatedAt: args.updatedAt,
        updatedBy: userId,
      });
      return existing._id;
    }

    return await ctx.db.insert("insights_sessions", {
      projectId: args.projectId,
      sessionId: args.sessionId,
      title: args.title,
      messages: args.messages,
      pendingAction: args.pendingAction,
      modelConfig: args.modelConfig,
      updatedAt: args.updatedAt,
      updatedBy: userId,
    });
  },
});

/** Get all insights sessions for a project. */
export const getSessions = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    await requireProjectAccess(ctx, args.projectId);

    return await ctx.db
      .query("insights_sessions")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});
