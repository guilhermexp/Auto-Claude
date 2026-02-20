import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/** Look up an invite code. Returns the code document or null. */
export const findByCode = internalQuery({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("invite_codes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();
  },
});

/** Create or replace the invite code for an organization. */
export const upsertCode = internalMutation({
  args: { code: v.string(), organizationId: v.string() },
  handler: async (ctx, args) => {
    // Delete existing codes for this org
    const existing = await ctx.db
      .query("invite_codes")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();
    for (const doc of existing) {
      await ctx.db.delete(doc._id);
    }
    await ctx.db.insert("invite_codes", {
      code: args.code,
      organizationId: args.organizationId,
      createdAt: Date.now(),
    });
  },
});
