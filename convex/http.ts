import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { betterAuthClient } from "./auth";
import { createAuth } from "./betterAuth/auth";

const http = httpRouter();

// Register all Better Auth HTTP routes with CORS enabled:
//   POST /api/auth/sign-up/email
//   POST /api/auth/sign-in/email
//   POST /api/auth/sign-out
//   GET  /api/auth/get-session
//   POST /api/auth/organization/create
//   POST /api/auth/organization/list  (GET also)
//   POST /api/auth/organization/set-active
//   POST /api/auth/organization/get-full-organization
//   POST /api/auth/organization/add-member
//   POST /api/auth/organization/remove-member
//   GET  /.well-known/openid-configuration (for Convex JWT validation)
betterAuthClient.registerRoutes(http, createAuth, {
  cors: true,
});

// --- Custom team-sync endpoints ---

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

function corsHeaders(): Record<string, string> {
  const origin = process.env.CONVEX_SITE_URL || "https://greedy-mallard-968.convex.site";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

function errorResponse(error: string, status: number): Response {
  return jsonResponse({ error }, status);
}

/**
 * POST /api/team-sync/create-team
 * Body: { name: string, slug?: string }
 * Creates an organization with a server-generated invite code.
 * Also records membership in org_memberships table.
 */
http.route({
  path: "/api/team-sync/create-team",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = createAuth(ctx);

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return errorResponse("Not authenticated", 401);
    }

    let body: { name?: string; slug?: string };
    try {
      body = await request.json() as { name?: string; slug?: string };
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    if (!body.name?.trim()) {
      return errorResponse("name is required", 400);
    }

    const trimmed = body.name.trim();
    const slug = body.slug || `${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now()}`;
    const inviteCode = generateInviteCodeString();

    try {
      // Create org via Better Auth (handles org + owner membership internally)
      const org = await auth.api.createOrganization({
        headers: request.headers,
        body: {
          name: trimmed,
          slug,
          metadata: { inviteCode },
        },
      });

      // Store invite code in our indexed table for fast lookup
      await ctx.runMutation(internal["invite-codes"].upsertCode, {
        code: inviteCode,
        organizationId: org.id,
      });

      // Record membership in app-level table for Convex query/mutation authz
      await ctx.runMutation(internal["org-memberships"].addMembership, {
        organizationId: org.id,
        userId: session.user.id,
        role: "owner",
      });

      // Set as active organization
      await auth.api.setActiveOrganization({
        headers: request.headers,
        body: { organizationId: org.id },
      });

      return jsonResponse({
        id: org.id,
        name: org.name,
        slug: org.slug,
        inviteCode,
      });
    } catch (error) {
      return errorResponse(
        `Failed to create team: ${error instanceof Error ? error.message : String(error)}`,
        500
      );
    }
  }),
});

http.route({
  path: "/api/team-sync/create-team",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }),
});

/**
 * POST /api/team-sync/join-by-code
 * Body: { inviteCode: string }
 * Looks up an organization by invite code (via indexed invite_codes table),
 * then adds the calling user as a member.
 */
http.route({
  path: "/api/team-sync/join-by-code",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = createAuth(ctx);

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return errorResponse("Not authenticated", 401);
    }

    let body: { inviteCode?: string };
    try {
      body = await request.json() as { inviteCode?: string };
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    if (!body.inviteCode) {
      return errorResponse("inviteCode is required", 400);
    }

    const code = body.inviteCode.trim().toUpperCase();

    // Look up invite code in our indexed table (works for all users, not user-scoped)
    const codeDoc = await ctx.runQuery(internal["invite-codes"].findByCode, { code });

    if (!codeDoc) {
      return errorResponse("Invalid invite code", 404);
    }

    // Add the user as a member via Better Auth
    try {
      await auth.api.addMember({
        body: {
          organizationId: codeDoc.organizationId,
          userId: session.user.id,
          role: "member",
        },
      });
    } catch (error) {
      // User might already be a member — that's OK
      const msg = error instanceof Error ? error.message : String(error);
      if (!msg.includes("already") && !msg.includes("exists")) {
        return errorResponse(`Failed to join: ${msg}`, 500);
      }
    }

    // Record membership in app-level table
    await ctx.runMutation(internal["org-memberships"].addMembership, {
      organizationId: codeDoc.organizationId,
      userId: session.user.id,
      role: "member",
    });

    // Set as active org
    await auth.api.setActiveOrganization({
      headers: request.headers,
      body: { organizationId: codeDoc.organizationId },
    });

    // Get org name for the response
    let orgName = "";
    try {
      const fullOrg = await auth.api.getFullOrganization({
        query: { organizationId: codeDoc.organizationId },
      });
      orgName = fullOrg?.name || "";
    } catch {
      // Non-critical — name is for display only
    }

    return jsonResponse({
      organizationId: codeDoc.organizationId,
      name: orgName,
    });
  }),
});

http.route({
  path: "/api/team-sync/join-by-code",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }),
});

/**
 * POST /api/team-sync/regenerate-invite-code
 * Body: { organizationId: string }
 * Generates a new invite code. Requires the caller to be an owner or admin.
 */
http.route({
  path: "/api/team-sync/regenerate-invite-code",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = createAuth(ctx);

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return errorResponse("Not authenticated", 401);
    }

    let body: { organizationId?: string };
    try {
      body = await request.json() as { organizationId?: string };
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    if (!body.organizationId) {
      return errorResponse("organizationId is required", 400);
    }

    // Verify the user is an owner or admin of this organization
    try {
      const fullOrg = await auth.api.getFullOrganization({
        query: { organizationId: body.organizationId },
      });

      if (!fullOrg?.members) {
        return errorResponse("Organization not found", 404);
      }

      const callerMember = fullOrg.members.find(
        (m: { userId: string }) => m.userId === session.user.id
      );

      if (!callerMember || !["owner", "admin"].includes(callerMember.role)) {
        return errorResponse("Only owners and admins can regenerate invite codes", 403);
      }
    } catch {
      return errorResponse("Failed to verify organization membership", 500);
    }

    const newCode = generateInviteCodeString();

    // Update invite code in both org metadata and our indexed table
    try {
      await auth.api.updateOrganization({
        body: {
          organizationId: body.organizationId,
          data: {
            metadata: { inviteCode: newCode },
          },
        },
      });

      await ctx.runMutation(internal["invite-codes"].upsertCode, {
        code: newCode,
        organizationId: body.organizationId,
      });
    } catch (error) {
      return errorResponse(
        `Failed to update: ${error instanceof Error ? error.message : String(error)}`,
        500
      );
    }

    return jsonResponse({ inviteCode: newCode });
  }),
});

http.route({
  path: "/api/team-sync/regenerate-invite-code",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }),
});

/**
 * POST /api/team-sync/my-teams
 * Returns the user's organizations with their role in each.
 */
http.route({
  path: "/api/team-sync/my-teams",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = createAuth(ctx);

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return errorResponse("Not authenticated", 401);
    }

    try {
      const orgs = await auth.api.listOrganizations({ headers: request.headers });

      if (!Array.isArray(orgs)) {
        return jsonResponse([]);
      }

      // For each org, get the user's role from the full org data
      const teams = await Promise.all(
        orgs.map(async (org: { id: string; name: string; slug: string; metadata?: Record<string, unknown>; createdAt: string }) => {
          let role = "member";
          let memberCount = 1;
          let inviteCode: string | undefined;

          try {
            const fullOrg = await auth.api.getFullOrganization({
              query: { organizationId: org.id },
            });

            if (fullOrg?.members) {
              memberCount = fullOrg.members.length;
              const callerMember = fullOrg.members.find(
                (m: { userId: string }) => m.userId === session.user.id
              );
              if (callerMember) {
                role = callerMember.role;
              }
            }
          } catch {
            // Fall back to defaults
          }

          // Only expose invite code to owners/admins
          if (["owner", "admin"].includes(role)) {
            inviteCode = (org.metadata?.inviteCode as string) || undefined;
          }

          // Ensure membership record exists in app table
          await ctx.runMutation(internal["org-memberships"].addMembership, {
            organizationId: org.id,
            userId: session.user.id,
            role,
          });

          return {
            id: org.id,
            name: org.name,
            role,
            memberCount,
            inviteCode,
            createdAt: org.createdAt,
          };
        })
      );

      return jsonResponse(teams);
    } catch (error) {
      return errorResponse(
        `Failed to list teams: ${error instanceof Error ? error.message : String(error)}`,
        500
      );
    }
  }),
});

http.route({
  path: "/api/team-sync/my-teams",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }),
});

/**
 * POST /api/team-sync/remove-member
 * Body: { organizationId: string, memberId: string }
 * Removes a member via Better Auth and cleans up the app-level membership table.
 */
http.route({
  path: "/api/team-sync/remove-member",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = createAuth(ctx);

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return errorResponse("Not authenticated", 401);
    }

    let body: { organizationId?: string; memberId?: string };
    try {
      body = await request.json() as { organizationId?: string; memberId?: string };
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    if (!body.organizationId || !body.memberId) {
      return errorResponse("organizationId and memberId are required", 400);
    }

    try {
      // Remove via Better Auth
      await auth.api.removeMember({
        body: {
          memberIdOrEmail: body.memberId,
          organizationId: body.organizationId,
        },
      });

      // Clean up app-level table (use memberId as userId — caller passes the userId)
      await ctx.runMutation(internal["org-memberships"].removeMembership, {
        organizationId: body.organizationId,
        userId: body.memberId,
      });

      return jsonResponse({ success: true });
    } catch (error) {
      return errorResponse(
        `Failed to remove member: ${error instanceof Error ? error.message : String(error)}`,
        500
      );
    }
  }),
});

http.route({
  path: "/api/team-sync/remove-member",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }),
});

export default http;
