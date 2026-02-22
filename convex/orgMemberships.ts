import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/** Check if a user is a member of an organization. Returns the membership or null. */
export const getMembership = internalQuery({
  args: { organizationId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("org_memberships")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", args.userId)
      )
      .unique();
  },
});

/** Get all memberships for a user. */
export const getUserMemberships = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("org_memberships")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

/** Add a membership record. Idempotent — skips if already exists. */
export const addMembership = internalMutation({
  args: {
    organizationId: v.string(),
    userId: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("org_memberships")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", args.userId)
      )
      .unique();

    if (existing) {
      // Update role if changed
      if (existing.role !== args.role) {
        await ctx.db.patch(existing._id, { role: args.role });
      }
      return existing._id;
    }

    return ctx.db.insert("org_memberships", {
      organizationId: args.organizationId,
      userId: args.userId,
      role: args.role,
      joinedAt: Date.now(),
    });
  },
});

/** Remove a membership record. */
export const removeMembership = internalMutation({
  args: { organizationId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("org_memberships")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", args.userId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
