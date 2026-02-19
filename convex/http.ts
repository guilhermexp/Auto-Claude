import { httpRouter } from "convex/server";
import { betterAuthClient } from "./auth";
import { createAuth } from "./betterAuth/auth";

const http = httpRouter();

// Register all Better Auth HTTP routes with CORS enabled:
//   POST /api/auth/sign-up/email
//   POST /api/auth/sign-in/email
//   POST /api/auth/sign-out
//   GET  /api/auth/get-session
//   GET  /.well-known/openid-configuration (for Convex JWT validation)
betterAuthClient.registerRoutes(http, createAuth, {
  cors: true,
});

export default http;
