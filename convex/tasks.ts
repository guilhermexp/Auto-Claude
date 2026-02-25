import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuthUserId, requireProjectAccess } from "./helpers";

/** Create or update a task. Uses LWW (Last-Writer-Wins) via updatedAt. */
export const upsertTask = mutation({
  args: {
    projectId: v.id("projects"),
    specId: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    reviewReason: v.optional(v.string()),
    xstateState: v.optional(v.string()),
    executionPhase: v.optional(v.string()),
    metadata: v.optional(v.any()),
    executionProgress: v.optional(v.any()),
    specContent: v.optional(v.string()),
    implementationPlan: v.optional(v.any()),
    qaReport: v.optional(v.string()),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    await requireProjectAccess(ctx, args.projectId);

    const existing = await ctx.db
      .query("tasks")
      .withIndex("by_project_spec", (q) =>
        q.eq("projectId", args.projectId).eq("specId", args.specId)
      )
      .unique();

    if (existing) {
      // LWW: only apply if incoming is newer
      if (args.updatedAt <= existing.updatedAt) {
        return existing._id;
      }

      const patch: Record<string, unknown> = {
        updatedAt: args.updatedAt,
        updatedBy: userId,
      };
      if (args.title !== undefined) patch.title = args.title;
      if (args.description !== undefined) patch.description = args.description;
      if (args.status !== undefined) patch.status = args.status;
      if (args.reviewReason !== undefined) patch.reviewReason = args.reviewReason;
      if (args.xstateState !== undefined) patch.xstateState = args.xstateState;
      if (args.executionPhase !== undefined) patch.executionPhase = args.executionPhase;
      if (args.metadata !== undefined) patch.metadata = args.metadata;
      if (args.executionProgress !== undefined) patch.executionProgress = args.executionProgress;
      if (args.specContent !== undefined) patch.specContent = args.specContent;
      if (args.implementationPlan !== undefined) patch.implementationPlan = args.implementationPlan;
      if (args.qaReport !== undefined) patch.qaReport = args.qaReport;

      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    return await ctx.db.insert("tasks", {
      projectId: args.projectId,
      specId: args.specId,
      title: args.title ?? `Task ${args.specId}`,
      description: args.description,
      status: args.status ?? "draft",
      reviewReason: args.reviewReason,
      xstateState: args.xstateState,
      executionPhase: args.executionPhase,
      metadata: args.metadata,
      executionProgress: args.executionProgress,
      specContent: args.specContent,
      implementationPlan: args.implementationPlan,
      qaReport: args.qaReport,
      updatedAt: args.updatedAt,
      updatedBy: userId,
    });
  },
});

/** Soft-delete a task. */
export const deleteTask = mutation({
  args: {
    projectId: v.id("projects"),
    specId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx);
    await requireProjectAccess(ctx, args.projectId);

    const existing = await ctx.db
      .query("tasks")
      .withIndex("by_project_spec", (q) =>
        q.eq("projectId", args.projectId).eq("specId", args.specId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isDeleted: true,
        updatedAt: Date.now(),
        updatedBy: userId,
      });
    }
  },
});

/** Get all tasks for a project (subscription-friendly query). */
export const getProjectTasks = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    await requireProjectAccess(ctx, args.projectId);

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return tasks.filter((t) => !t.isDeleted);
  },
});

/** Upsert task logs (phase execution logs). */
export const upsertTaskLogs = mutation({
  args: {
    taskId: v.id("tasks"),
    specId: v.string(),
    phases: v.any(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");
    await requireProjectAccess(ctx, task.projectId);

    const existing = await ctx.db
      .query("task_logs")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .unique();

    if (existing) {
      if (args.updatedAt <= existing.updatedAt) return existing._id;
      await ctx.db.patch(existing._id, {
        phases: args.phases,
        updatedAt: args.updatedAt,
      });
      return existing._id;
    }

    return await ctx.db.insert("task_logs", {
      taskId: args.taskId,
      specId: args.specId,
      phases: args.phases,
      updatedAt: args.updatedAt,
    });
  },
});

/** Get task logs for a task. */
export const getTaskLogs = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");
    await requireProjectAccess(ctx, task.projectId);

    return await ctx.db
      .query("task_logs")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .unique();
  },
});
