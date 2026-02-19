import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  teams: defineTable({
    name: v.string(),
    ownerId: v.string(),
    inviteCode: v.string(),
    createdAt: v.number(),
  })
    .index("by_invite_code", ["inviteCode"])
    .index("by_owner", ["ownerId"]),

  team_members: defineTable({
    teamId: v.id("teams"),
    userId: v.string(),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
    status: v.union(
      v.literal("active"),
      v.literal("invited"),
      v.literal("removed")
    ),
    joinedAt: v.number(),
  })
    .index("by_team", ["teamId"])
    .index("by_user", ["userId"])
    .index("by_team_user", ["teamId", "userId"]),

  projects: defineTable({
    teamId: v.id("teams"),
    projectName: v.string(),
    projectHash: v.string(),
    settings: v.optional(v.any()),
    updatedAt: v.number(),
    updatedBy: v.string(),
  })
    .index("by_team", ["teamId"])
    .index("by_team_hash", ["teamId", "projectHash"]),

  tasks: defineTable({
    projectId: v.id("projects"),
    specId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.string(),
    reviewReason: v.optional(v.string()),
    xstateState: v.optional(v.string()),
    executionPhase: v.optional(v.string()),
    metadata: v.optional(v.any()),
    executionProgress: v.optional(v.any()),
    specContent: v.optional(v.string()),
    implementationPlan: v.optional(v.any()),
    qaReport: v.optional(v.string()),
    updatedAt: v.number(),
    updatedBy: v.string(),
    isDeleted: v.optional(v.boolean()),
  })
    .index("by_project", ["projectId"])
    .index("by_project_spec", ["projectId", "specId"]),

  task_logs: defineTable({
    taskId: v.id("tasks"),
    specId: v.string(),
    phases: v.any(),
    updatedAt: v.number(),
  }).index("by_task", ["taskId"]),

  insights_sessions: defineTable({
    projectId: v.id("projects"),
    sessionId: v.string(),
    title: v.optional(v.string()),
    messages: v.any(),
    pendingAction: v.optional(v.any()),
    modelConfig: v.optional(v.any()),
    updatedAt: v.number(),
    updatedBy: v.string(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_session", ["projectId", "sessionId"]),

  roadmap: defineTable({
    projectId: v.id("projects"),
    features: v.any(),
    updatedAt: v.number(),
    updatedBy: v.string(),
  }).index("by_project", ["projectId"]),

  ideation: defineTable({
    projectId: v.id("projects"),
    ideas: v.any(),
    config: v.optional(v.any()),
    updatedAt: v.number(),
    updatedBy: v.string(),
  }).index("by_project", ["projectId"]),

  sync_events: defineTable({
    teamId: v.id("teams"),
    userId: v.string(),
    deviceId: v.string(),
    resource: v.string(),
    resourceId: v.string(),
    action: v.union(
      v.literal("create"),
      v.literal("update"),
      v.literal("delete")
    ),
    timestamp: v.number(),
  }).index("by_team_time", ["teamId", "timestamp"]),
});
