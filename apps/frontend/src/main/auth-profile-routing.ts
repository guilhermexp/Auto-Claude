import { DEFAULT_APP_SETTINGS } from '../shared/constants';
import type { AppSettings, FeatureAuthProfileConfig } from '../shared/types/settings';
import { readSettingsFile } from './settings-utils';
import { getClaudeProfileManager } from './claude-profile-manager';
import { getBestAvailableProfileEnv, ensureCleanProfileEnv } from './rate-limit-detector';
import { getOAuthModeClearVars } from './agent/env-utils';
import { getAPIProfileEnv, getAPIProfileEnvForProfileId, getAPIProfilesSnapshot } from './services/profile';

export type AuthFeatureKey =
  | 'tasks'
  | 'insights'
  | 'ideation'
  | 'roadmap'
  | 'githubIssues'
  | 'githubPrs'
  | 'utility';

type AccountSourceType = 'oauth' | 'api';

interface ParsedAccountId {
  sourceType: AccountSourceType;
  rawId: string;
}

export interface FeatureAuthEnvResolution {
  profileEnv: Record<string, string>;
  apiProfileEnv: Record<string, string>;
  oauthModeClearVars: Record<string, string>;
  resolvedAccountId?: string;
  sourceType: 'oauth' | 'api' | 'none';
  resolutionSource: 'global' | 'feature';
  fallbackUsed: boolean;
  authRoutingMode: 'global' | 'per_feature';
}

function parseUnifiedAccountId(accountId?: string): ParsedAccountId | null {
  if (!accountId) return null;
  if (accountId.startsWith('oauth-')) {
    return { sourceType: 'oauth', rawId: accountId.slice('oauth-'.length) };
  }
  if (accountId.startsWith('api-')) {
    return { sourceType: 'api', rawId: accountId.slice('api-'.length) };
  }
  return null;
}

function loadSettings(): AppSettings {
  const saved = readSettingsFile();
  return { ...DEFAULT_APP_SETTINGS, ...(saved || {}) } as AppSettings;
}

function resolveOAuthEnvForProfile(profileId: string, allowLimited: boolean): Record<string, string> | null {
  const profileManager = getClaudeProfileManager();
  const profile = profileManager.getProfile(profileId);
  if (!profile) return null;
  if (!profileManager.hasValidAuth(profileId)) return null;

  const rateStatus = profileManager.isProfileRateLimited(profileId);
  const atCapacity = (profile.usage?.weeklyUsagePercent ?? 0) >= 100;
  if (!allowLimited && (rateStatus.limited || atCapacity)) {
    return null;
  }

  const env = ensureCleanProfileEnv(profileManager.getProfileEnv(profileId));
  if (!env.CLAUDE_CONFIG_DIR && !env.CLAUDE_CODE_OAUTH_TOKEN) {
    return null;
  }
  return env;
}

async function resolveApiEnvForProfile(profileId: string): Promise<Record<string, string> | null> {
  const env = await getAPIProfileEnvForProfileId(profileId);
  if (Object.keys(env).length === 0) {
    return null;
  }
  return env;
}

function getPreferredAccountId(
  featureKey: AuthFeatureKey,
  featureAuthProfiles?: FeatureAuthProfileConfig
): string | undefined {
  return featureAuthProfiles?.[featureKey];
}

async function resolveGlobalMode(): Promise<FeatureAuthEnvResolution> {
  const apiProfileEnv = await getAPIProfileEnv();
  const oauthModeClearVars = getOAuthModeClearVars(apiProfileEnv);

  if (Object.keys(apiProfileEnv).length > 0) {
    const snapshot = await getAPIProfilesSnapshot();
    return {
      profileEnv: {},
      apiProfileEnv,
      oauthModeClearVars,
      resolvedAccountId: snapshot.activeProfileId ? `api-${snapshot.activeProfileId}` : undefined,
      sourceType: 'api',
      resolutionSource: 'global',
      fallbackUsed: false,
      authRoutingMode: 'global'
    };
  }

  const profileResult = getBestAvailableProfileEnv();
  return {
    profileEnv: profileResult.env,
    apiProfileEnv: {},
    oauthModeClearVars,
    resolvedAccountId: `oauth-${profileResult.profileId}`,
    sourceType: 'oauth',
    resolutionSource: 'global',
    fallbackUsed: profileResult.wasSwapped,
    authRoutingMode: 'global'
  };
}

function addCandidate(candidates: string[], seen: Set<string>, value?: string | null): void {
  if (!value || seen.has(value)) return;
  seen.add(value);
  candidates.push(value);
}

async function buildAccountCandidates(featureKey: AuthFeatureKey, settings: AppSettings): Promise<string[]> {
  const profileManager = getClaudeProfileManager();
  const apiSnapshot = await getAPIProfilesSnapshot();
  const candidates: string[] = [];
  const seen = new Set<string>();

  addCandidate(candidates, seen, getPreferredAccountId(featureKey, settings.featureAuthProfiles));

  for (const accountId of profileManager.getAccountPriorityOrder()) {
    addCandidate(candidates, seen, accountId);
  }

  if (apiSnapshot.activeProfileId) {
    addCandidate(candidates, seen, `api-${apiSnapshot.activeProfileId}`);
  }

  const activeOauth = profileManager.getActiveProfile();
  if (activeOauth) {
    addCandidate(candidates, seen, `oauth-${activeOauth.id}`);
  }

  for (const profile of profileManager.getSettings().profiles) {
    addCandidate(candidates, seen, `oauth-${profile.id}`);
  }
  for (const profile of apiSnapshot.profiles) {
    addCandidate(candidates, seen, `api-${profile.id}`);
  }

  return candidates;
}

export async function resolveAuthEnvForFeature(featureKey: AuthFeatureKey): Promise<FeatureAuthEnvResolution> {
  const settings = loadSettings();
  if ((settings.authRoutingMode || 'global') !== 'per_feature') {
    return resolveGlobalMode();
  }

  const preferredAccountId = getPreferredAccountId(featureKey, settings.featureAuthProfiles);
  const candidates = await buildAccountCandidates(featureKey, settings);
  const oauthModeClearVarsEmpty = getOAuthModeClearVars({});

  for (const allowLimited of [false, true]) {
    for (const accountId of candidates) {
      const parsed = parseUnifiedAccountId(accountId);
      if (!parsed) continue;

      if (parsed.sourceType === 'oauth') {
        const profileEnv = resolveOAuthEnvForProfile(parsed.rawId, allowLimited);
        if (!profileEnv) continue;
        return {
          profileEnv,
          apiProfileEnv: {},
          oauthModeClearVars: oauthModeClearVarsEmpty,
          resolvedAccountId: `oauth-${parsed.rawId}`,
          sourceType: 'oauth',
          resolutionSource: 'feature',
          fallbackUsed: !!preferredAccountId && preferredAccountId !== `oauth-${parsed.rawId}`,
          authRoutingMode: 'per_feature'
        };
      }

      const apiProfileEnv = await resolveApiEnvForProfile(parsed.rawId);
      if (!apiProfileEnv) continue;
      return {
        profileEnv: {},
        apiProfileEnv,
        oauthModeClearVars: getOAuthModeClearVars(apiProfileEnv),
        resolvedAccountId: `api-${parsed.rawId}`,
        sourceType: 'api',
        resolutionSource: 'feature',
        fallbackUsed: !!preferredAccountId && preferredAccountId !== `api-${parsed.rawId}`,
        authRoutingMode: 'per_feature'
      };
    }
  }

  // Last-resort no-side-effect fallback: currently active OAuth profile env (without swaps)
  const profileManager = getClaudeProfileManager();
  const profileEnv = ensureCleanProfileEnv(profileManager.getActiveProfileEnv());
  return {
    profileEnv,
    apiProfileEnv: {},
    oauthModeClearVars: oauthModeClearVarsEmpty,
    resolvedAccountId: profileManager.getActiveProfile() ? `oauth-${profileManager.getActiveProfile().id}` : undefined,
    sourceType: Object.keys(profileEnv).length > 0 ? 'oauth' : 'none',
    resolutionSource: 'feature',
    fallbackUsed: true,
    authRoutingMode: 'per_feature'
  };
}
