import WebSocket from "ws";
import { ConvexClient, ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
// FunctionReference imported but used via anyApi at runtime (untyped access)

// Polyfill WebSocket for Node.js (Electron main process)
if (typeof globalThis.WebSocket === "undefined") {
  (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = WebSocket as unknown as typeof globalThis.WebSocket;
}

const CONVEX_URL = "https://greedy-mallard-968.convex.cloud";
const CONVEX_SITE_URL = "https://greedy-mallard-968.convex.site";

type UnsubscribeFn = () => void;

/**
 * Real Convex client for Team Sync.
 * Uses ConvexClient (WebSocket) for subscriptions and ConvexHttpClient for one-shot queries.
 */
export class TeamSyncConvexClient {
  private url: string;
  private siteUrl: string;
  private wsClient: ConvexClient | null = null;
  private httpClient: ConvexHttpClient | null = null;
  private connected = false;
  private authToken: string | undefined;

  constructor(url?: string) {
    this.url = url || CONVEX_URL;
    this.siteUrl = this.url.replace(".convex.cloud", ".convex.site");
    if (!this.siteUrl.includes(".convex.site")) {
      this.siteUrl = CONVEX_SITE_URL;
    }
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    try {
      this.wsClient = new ConvexClient(this.url);
      this.httpClient = new ConvexHttpClient(this.url);
      if (this.authToken) {
        this.wsClient.setAuth(() => Promise.resolve(this.authToken ?? null));
        this.httpClient.setAuth(this.authToken);
      }
      this.connected = true;
    } catch (error) {
      console.error("[team-sync] Failed to connect to Convex:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.wsClient) {
      await this.wsClient.close();
      this.wsClient = null;
    }
    this.httpClient = null;
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  setAuthToken(token?: string): void {
    this.authToken = token;
    if (this.wsClient) {
      if (token) {
        this.wsClient.setAuth(() => Promise.resolve(token));
      } else {
        this.wsClient.setAuth(() => Promise.resolve(null));
      }
    }
    if (this.httpClient && token) {
      this.httpClient.setAuth(token);
    }
  }

  /**
   * Execute a Convex query (one-shot).
   */
  async query<T = unknown>(name: string, args: Record<string, unknown> = {}): Promise<T> {
    if (!this.httpClient) {
      await this.connect();
    }
    const ref = buildFunctionRef(name, "query");
    return await this.httpClient!.query(ref, args) as T;
  }

  /**
   * Execute a Convex mutation.
   */
  async mutation<T = unknown>(name: string, args: Record<string, unknown> = {}): Promise<T> {
    if (!this.wsClient) {
      await this.connect();
    }
    const ref = buildFunctionRef(name, "mutation");
    return await this.wsClient!.mutation(ref, args) as T;
  }

  /**
   * Subscribe to a Convex query with live updates.
   * Returns an unsubscribe function.
   */
  subscribe<T = unknown>(
    name: string,
    args: Record<string, unknown>,
    callback: (payload: T) => void
  ): UnsubscribeFn {
    if (!this.wsClient) {
      // Auto-connect for subscriptions — track the real unsubscribe for cleanup
      let realUnsubscribe: UnsubscribeFn | null = null;
      let cancelled = false;
      this.connect().then(() => {
        if (cancelled || !this.wsClient) return;
        const ref = buildFunctionRef(name, "query");
        realUnsubscribe = this.wsClient.onUpdate(ref, args, (result: unknown) => {
          callback(result as T);
        });
      });
      return () => {
        cancelled = true;
        if (realUnsubscribe) realUnsubscribe();
      };
    }

    const ref = buildFunctionRef(name, "query");
    const unsubscribe = this.wsClient.onUpdate(ref, args, (result: unknown) => {
      callback(result as T);
    });

    return unsubscribe;
  }

  /**
   * Get the cloud URL.
   */
  getUrl(): string {
    return this.url;
  }

  /**
   * Get the HTTP actions site URL (for Better Auth endpoints).
   */
  getSiteUrl(): string {
    return this.siteUrl;
  }

  /**
   * Call a Better Auth HTTP endpoint directly.
   */
  async authRequest(
    path: string,
    body?: Record<string, unknown>,
    method: "GET" | "POST" = "POST"
  ): Promise<Response> {
    const url = `${this.siteUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.authToken) {
      headers["Authorization"] = `Bearer ${this.authToken}`;
    }

    return fetch(url, {
      method,
      headers,
      body: method === "POST" ? JSON.stringify(body) : undefined,
    });
  }
}

/**
 * Build a function reference from a string like "teams:createTeam".
 * Uses anyApi for untyped access (since the Electron app doesn't share
 * Convex's _generated types).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildFunctionRef(name: string, _type: "query" | "mutation"): any {
  const parts = name.split(":");
  if (parts.length === 2) {
    const [module, fn] = parts;
    return (anyApi as Record<string, Record<string, unknown>>)[module]?.[fn];
  }
  // Support dot notation too: "teams.createTeam"
  const dotParts = name.split(".");
  if (dotParts.length === 2) {
    const [module, fn] = dotParts;
    return (anyApi as Record<string, Record<string, unknown>>)[module]?.[fn];
  }
  throw new Error(`Invalid function name: ${name}. Expected "module:function" or "module.function"`);
}
