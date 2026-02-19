import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuthUserId, requireTeamMembership } from "./helpers";

/** Create a new team. The calling user becomes the owner. */
export const createTeam = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    const inviteCode = generateInviteCodeString();

    const teamId = await ctx.db.insert("teams", {
      name: args.name,
      ownerId: userId,
      inviteCode,
      createdAt: Date.now(),
    });

    await ctx.db.insert("team_members", {
      teamId,
      userId,
      role: "owner",
      status: "active",
      joinedAt: Date.now(),
    });

    return { teamId, inviteCode };
  },
});

/** Join a team using an invite code. */
export const joinTeam = mutation({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);

    const team = await ctx.db
      .query("teams")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", args.inviteCode))
      .unique();

    if (!team) {
      throw new Error("Invalid invite code");
    }

    // Check if already a member
    const existing = await ctx.db
      .query("team_members")
      .withIndex("by_team_user", (q) =>
        q.eq("teamId", team._id).eq("userId", userId)
      )
      .unique();

    if (existing) {
      if (existing.status === "removed") {
        await ctx.db.patch(existing._id, { status: "active", joinedAt: Date.now() });
        return { teamId: team._id };
      }
      return { teamId: team._id };
    }

    await ctx.db.insert("team_members", {
      teamId: team._id,
      userId,
      role: "member",
      status: "active",
      joinedAt: Date.now(),
    });

    return { teamId: team._id };
  },
});

/** Get all teams the current user belongs to. */
export const getMyTeams = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuthUserId(ctx);

    const memberships = await ctx.db
      .query("team_members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const activeMembers = memberships.filter((m) => m.status === "active");

    const teams = await Promise.all(
      activeMembers.map(async (m) => {
        const team = await ctx.db.get(m.teamId);
        if (!team) return null;

        const memberCount = (
          await ctx.db
            .query("team_members")
            .withIndex("by_team", (q) => q.eq("teamId", team._id))
            .collect()
        ).filter((tm) => tm.status === "active").length;

        return {
          _id: team._id,
          name: team.name,
          role: m.role,
          memberCount,
          inviteCode: m.role === "owner" ? team.inviteCode : undefined,
          createdAt: team.createdAt,
        };
      })
    );

    return teams.filter(Boolean);
  },
});

/** Get members of a team (requires membership). */
export const getTeamMembers = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    await requireTeamMembership(ctx, args.teamId);

    const members = await ctx.db
      .query("team_members")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    return members.filter((m) => m.status !== "removed");
  },
});

/** Remove a member from a team (owner/admin only). */
export const removeMember = mutation({
  args: {
    teamId: v.id("teams"),
    memberId: v.id("team_members"),
  },
  handler: async (ctx, args) => {
    await requireTeamMembership(ctx, args.teamId, ["owner", "admin"]);

    const member = await ctx.db.get(args.memberId);
    if (!member || member.teamId !== args.teamId) {
      throw new Error("Member not found in this team");
    }

    if (member.role === "owner") {
      throw new Error("Cannot remove the team owner");
    }

    await ctx.db.patch(args.memberId, { status: "removed" });
    return { success: true };
  },
});

/** Generate a new invite code for a team (owner/admin only). */
export const generateInviteCode = mutation({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    await requireTeamMembership(ctx, args.teamId, ["owner", "admin"]);

    const newCode = generateInviteCodeString();
    await ctx.db.patch(args.teamId, { inviteCode: newCode });

    return newCode;
  },
});

function generateInviteCodeString(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const randomValues = new Uint8Array(8);
  crypto.getRandomValues(randomValues);
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}
