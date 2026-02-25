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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
betterAuthClient.registerRoutes(http, createAuth as any, {
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

function corsHeaders(request?: Request): Record<string, string> {
  const allowedOrigins = [
    process.env.CONVEX_SITE_URL || "https://greedy-mallard-968.convex.site",
    "http://localhost:5173",
  ];
  const origin = request?.headers.get("Origin") || "";
  const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

function jsonResponse(data: unknown, status = 200, request?: Request): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(request) },
  });
}

function errorResponse(error: string, status: number, request?: Request): Response {
  return jsonResponse({ error }, status, request);
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
      return errorResponse("Not authenticated", 401, request);
    }

    let body: { name?: string; slug?: string };
    try {
      body = await request.json() as { name?: string; slug?: string };
    } catch {
      return errorResponse("Invalid JSON body", 400, request);
    }

    if (!body.name?.trim()) {
      return errorResponse("name is required", 400, request);
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

      if (!org) {
        return errorResponse("Failed to create organization", 500, request);
      }

      // Store invite code in our indexed table for fast lookup
      await ctx.runMutation(internal.inviteCodes.upsertCode, {
        code: inviteCode,
        organizationId: org.id,
      });

      // Record membership in app-level table for Convex query/mutation authz
      await ctx.runMutation(internal.orgMemberships.addMembership, {
        organizationId: org.id,
        userId: session.user.id,
        role: "owner",
      });

      return jsonResponse({
        id: org.id,
        name: org.name,
        slug: org.slug,
        inviteCode,
      }, 200, request);
    } catch (error) {
      return errorResponse(
        `Failed to create team: ${error instanceof Error ? error.message : String(error)}`,
        500,
        request
      );
    }
  }),
});

http.route({
  path: "/api/team-sync/create-team",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
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
      return errorResponse("Not authenticated", 401, request);
    }

    let body: { inviteCode?: string };
    try {
      body = await request.json() as { inviteCode?: string };
    } catch {
      return errorResponse("Invalid JSON body", 400, request);
    }

    if (!body.inviteCode) {
      return errorResponse("inviteCode is required", 400, request);
    }

    const code = body.inviteCode.trim().toUpperCase();

    // Look up invite code in our indexed table (works for all users, not user-scoped)
    const codeDoc = await ctx.runQuery(internal.inviteCodes.findByCode, { code });

    if (!codeDoc) {
      return errorResponse("Invalid invite code", 404, request);
    }

    // Add the user as a member via Better Auth
    try {
      await auth.api.addMember({
        headers: request.headers,
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
        return errorResponse(`Failed to join: ${msg}`, 500, request);
      }
    }

    // Record membership in app-level table
    await ctx.runMutation(internal.orgMemberships.addMembership, {
      organizationId: codeDoc.organizationId,
      userId: session.user.id,
      role: "member",
    });

    // Get org name for the response
    let orgName = "";
    try {
      const fullOrg = await auth.api.getFullOrganization({
        headers: request.headers,
        query: { organizationId: codeDoc.organizationId },
      });
      orgName = fullOrg?.name || "";
    } catch {
      // Non-critical — name is for display only
    }

    return jsonResponse({
      organizationId: codeDoc.organizationId,
      name: orgName,
    }, 200, request);
  }),
});

http.route({
  path: "/api/team-sync/join-by-code",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
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
      return errorResponse("Not authenticated", 401, request);
    }

    let body: { organizationId?: string };
    try {
      body = await request.json() as { organizationId?: string };
    } catch {
      return errorResponse("Invalid JSON body", 400, request);
    }

    if (!body.organizationId) {
      return errorResponse("organizationId is required", 400, request);
    }

    // Verify the user is an owner or admin of this organization
    try {
      const fullOrg = await auth.api.getFullOrganization({
        headers: request.headers,
        query: { organizationId: body.organizationId },
      });

      if (!fullOrg?.members) {
        return errorResponse("Organization not found", 404, request);
      }

      const callerMember = fullOrg.members.find(
        (m: { userId: string }) => m.userId === session.user.id
      );

      if (!callerMember || !["owner", "admin"].includes(callerMember.role)) {
        return errorResponse("Only owners and admins can regenerate invite codes", 403, request);
      }
    } catch {
      return errorResponse("Failed to verify organization membership", 500, request);
    }

    const newCode = generateInviteCodeString();

    // Update invite code in both org metadata and our indexed table
    try {
      await auth.api.updateOrganization({
        headers: request.headers,
        body: {
          organizationId: body.organizationId,
          data: {
            metadata: { inviteCode: newCode },
          },
        },
      });

      await ctx.runMutation(internal.inviteCodes.upsertCode, {
        code: newCode,
        organizationId: body.organizationId,
      });
    } catch (error) {
      return errorResponse(
        `Failed to update: ${error instanceof Error ? error.message : String(error)}`,
        500,
        request
      );
    }

    return jsonResponse({ inviteCode: newCode }, 200, request);
  }),
});

http.route({
  path: "/api/team-sync/regenerate-invite-code",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
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
      return errorResponse("Not authenticated", 401, request);
    }

    try {
      const orgs = await auth.api.listOrganizations({ headers: request.headers });

      if (!Array.isArray(orgs)) {
        return jsonResponse([], 200, request);
      }

      // For each org, get the user's role from the full org data
      const teams = await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        orgs.map(async (org: any) => {
          let role = "member";
          let memberCount = 1;
          let inviteCode: string | undefined;

          try {
            const fullOrg = await auth.api.getFullOrganization({
              headers: request.headers,
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
          await ctx.runMutation(internal.orgMemberships.addMembership, {
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

      return jsonResponse(teams, 200, request);
    } catch (error) {
      return errorResponse(
        `Failed to list teams: ${error instanceof Error ? error.message : String(error)}`,
        500,
        request
      );
    }
  }),
});

http.route({
  path: "/api/team-sync/my-teams",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
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
      return errorResponse("Not authenticated", 401, request);
    }

    let body: { organizationId?: string; memberId?: string };
    try {
      body = await request.json() as { organizationId?: string; memberId?: string };
    } catch {
      return errorResponse("Invalid JSON body", 400, request);
    }

    if (!body.organizationId || !body.memberId) {
      return errorResponse("organizationId and memberId are required", 400, request);
    }

    try {
      // Remove via Better Auth
      await auth.api.removeMember({
        headers: request.headers,
        body: {
          memberIdOrEmail: body.memberId,
          organizationId: body.organizationId,
        },
      });

      // Clean up app-level table (use memberId as userId — caller passes the userId)
      await ctx.runMutation(internal.orgMemberships.removeMembership, {
        organizationId: body.organizationId,
        userId: body.memberId,
      });

      return jsonResponse({ success: true }, 200, request);
    } catch (error) {
      return errorResponse(
        `Failed to remove member: ${error instanceof Error ? error.message : String(error)}`,
        500,
        request
      );
    }
  }),
});

http.route({
  path: "/api/team-sync/remove-member",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }),
});

// --- Better Auth Invitation Token System ---

/**
 * POST /api/team-sync/invite-member
 * Body: { organizationId: string, email: string, role?: "member" | "admin" }
 * Creates an invitation via Better Auth's organization plugin.
 * Requires owner/admin role.
 */
http.route({
  path: "/api/team-sync/invite-member",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    const auth = createAuth(_ctx);

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return errorResponse("Not authenticated", 401, request);
    }

    let body: { organizationId?: string; email?: string; role?: string };
    try {
      body = await request.json() as { organizationId?: string; email?: string; role?: string };
    } catch {
      return errorResponse("Invalid JSON body", 400, request);
    }

    if (!body.organizationId || !body.email) {
      return errorResponse("organizationId and email are required", 400, request);
    }

    // Verify the caller is an owner or admin
    try {
      const fullOrg = await auth.api.getFullOrganization({
        headers: request.headers,
        query: { organizationId: body.organizationId },
      });

      if (!fullOrg?.members) {
        return errorResponse("Organization not found", 404, request);
      }

      const callerMember = fullOrg.members.find(
        (m: { userId: string }) => m.userId === session.user.id
      );

      if (!callerMember || !["owner", "admin"].includes(callerMember.role)) {
        return errorResponse("Only owners and admins can invite members", 403, request);
      }
    } catch {
      return errorResponse("Failed to verify organization membership", 500, request);
    }

    try {
      const invitation = await auth.api.createInvitation({
        headers: request.headers,
        body: {
          organizationId: body.organizationId,
          email: body.email,
          role: (body.role as "member" | "admin") || "member",
        },
      });

      return jsonResponse({
        invitationId: invitation.id,
        email: body.email,
        role: body.role || "member",
        status: "pending",
      }, 200, request);
    } catch (error) {
      return errorResponse(
        `Failed to create invitation: ${error instanceof Error ? error.message : String(error)}`,
        500,
        request
      );
    }
  }),
});

http.route({
  path: "/api/team-sync/invite-member",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }),
});

/**
 * POST /api/team-sync/accept-invitation
 * Body: { invitationId: string }
 * Accepts an invitation via Better Auth.
 * Also records membership in org_memberships table.
 */
http.route({
  path: "/api/team-sync/accept-invitation",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = createAuth(ctx);

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return errorResponse("Not authenticated", 401, request);
    }

    let body: { invitationId?: string };
    try {
      body = await request.json() as { invitationId?: string };
    } catch {
      return errorResponse("Invalid JSON body", 400, request);
    }

    if (!body.invitationId) {
      return errorResponse("invitationId is required", 400, request);
    }

    try {
      const result = await auth.api.acceptInvitation({
        headers: request.headers,
        body: {
          invitationId: body.invitationId,
        },
      });

      // Record membership in app-level table
      if (result?.member?.organizationId) {
        await ctx.runMutation(internal.orgMemberships.addMembership, {
          organizationId: result.member.organizationId,
          userId: session.user.id,
          role: result.member.role || "member",
        });

        // Get org name for the response
        let orgName = "";
        try {
          const fullOrg = await auth.api.getFullOrganization({
            headers: request.headers,
            query: { organizationId: result.member.organizationId },
          });
          orgName = fullOrg?.name || "";
        } catch {
          // Non-critical
        }

        return jsonResponse({
          organizationId: result.member.organizationId,
          name: orgName,
        }, 200, request);
      }

      return jsonResponse({ success: true }, 200, request);
    } catch (error) {
      return errorResponse(
        `Failed to accept invitation: ${error instanceof Error ? error.message : String(error)}`,
        500,
        request
      );
    }
  }),
});

http.route({
  path: "/api/team-sync/accept-invitation",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }),
});

/**
 * POST /api/team-sync/list-invitations
 * Body: { organizationId: string }
 * Lists pending invitations. Requires owner/admin role.
 */
http.route({
  path: "/api/team-sync/list-invitations",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    const auth = createAuth(_ctx);

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return errorResponse("Not authenticated", 401, request);
    }

    let body: { organizationId?: string };
    try {
      body = await request.json() as { organizationId?: string };
    } catch {
      return errorResponse("Invalid JSON body", 400, request);
    }

    if (!body.organizationId) {
      return errorResponse("organizationId is required", 400, request);
    }

    try {
      const fullOrg = await auth.api.getFullOrganization({
        headers: request.headers,
        query: { organizationId: body.organizationId },
      });

      if (!fullOrg?.members) {
        return errorResponse("Organization not found", 404, request);
      }

      // Verify caller is owner/admin
      const callerMember = fullOrg.members.find(
        (m: { userId: string }) => m.userId === session.user.id
      );

      if (!callerMember || !["owner", "admin"].includes(callerMember.role)) {
        return errorResponse("Only owners and admins can list invitations", 403, request);
      }

      const invitations = (fullOrg.invitations || []).map(
        (inv: { id: string; email: string; role: string; status: string; expiresAt?: Date | string }) => ({
          id: inv.id,
          email: inv.email,
          role: inv.role,
          status: inv.status,
          expiresAt: inv.expiresAt instanceof Date ? inv.expiresAt.toISOString() : inv.expiresAt,
        })
      );

      return jsonResponse({ invitations }, 200, request);
    } catch (error) {
      return errorResponse(
        `Failed to list invitations: ${error instanceof Error ? error.message : String(error)}`,
        500,
        request
      );
    }
  }),
});

http.route({
  path: "/api/team-sync/list-invitations",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }),
});

export default http;
