import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockReadSettingsFile = vi.fn();
const mockGetBestAvailableProfileEnv = vi.fn();
const mockEnsureCleanProfileEnv = vi.fn();
const mockGetOAuthModeClearVars = vi.fn();
const mockGetAPIProfileEnv = vi.fn();
const mockGetAPIProfileEnvForProfileId = vi.fn();
const mockGetAPIProfilesSnapshot = vi.fn();
const mockGetClaudeProfileManager = vi.fn();

vi.mock('./settings-utils', () => ({
  readSettingsFile: () => mockReadSettingsFile(),
}));

vi.mock('./rate-limit-detector', () => ({
  getBestAvailableProfileEnv: () => mockGetBestAvailableProfileEnv(),
  ensureCleanProfileEnv: (...args: unknown[]) => mockEnsureCleanProfileEnv(...args),
}));

vi.mock('./agent/env-utils', () => ({
  getOAuthModeClearVars: (...args: unknown[]) => mockGetOAuthModeClearVars(...args),
}));

vi.mock('./services/profile', () => ({
  getAPIProfileEnv: (...args: unknown[]) => mockGetAPIProfileEnv(...args),
  getAPIProfileEnvForProfileId: (...args: unknown[]) => mockGetAPIProfileEnvForProfileId(...args),
  getAPIProfilesSnapshot: (...args: unknown[]) => mockGetAPIProfilesSnapshot(...args),
}));

vi.mock('./claude-profile-manager', () => ({
  getClaudeProfileManager: () => mockGetClaudeProfileManager(),
}));

import { resolveAuthEnvForFeature } from './auth-profile-routing';

describe('resolveAuthEnvForFeature', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockReadSettingsFile.mockReturnValue({});
    mockGetAPIProfileEnv.mockResolvedValue({});
    mockGetOAuthModeClearVars.mockReturnValue({});
    mockGetBestAvailableProfileEnv.mockReturnValue({
      env: { CLAUDE_CONFIG_DIR: '/tmp/default-oauth' },
      profileId: 'oauth-default',
      wasSwapped: false,
    });
    mockGetAPIProfilesSnapshot.mockResolvedValue({
      profiles: [{ id: 'api-default', name: 'API Default' }],
      activeProfileId: 'api-default',
    });
    mockGetAPIProfileEnvForProfileId.mockResolvedValue({});
    mockEnsureCleanProfileEnv.mockImplementation((env: Record<string, string>) => env);

    mockGetClaudeProfileManager.mockReturnValue({
      getProfile: (id: string) => ({ id, usage: { weeklyUsagePercent: 0 } }),
      hasValidAuth: () => true,
      isProfileRateLimited: () => ({ limited: false }),
      getProfileEnv: (id: string) => ({ CLAUDE_CONFIG_DIR: `/tmp/${id}` }),
      getAccountPriorityOrder: () => ['oauth-oauth-default', 'api-api-default'],
      getActiveProfile: () => ({ id: 'oauth-default' }),
      getSettings: () => ({ profiles: [{ id: 'oauth-default' }] }),
      getActiveProfileEnv: () => ({ CLAUDE_CONFIG_DIR: '/tmp/oauth-default' }),
    });
  });

  it('keeps current global behavior when authRoutingMode is global', async () => {
    mockReadSettingsFile.mockReturnValue({ authRoutingMode: 'global' });
    mockGetAPIProfileEnv.mockResolvedValue({});

    const result = await resolveAuthEnvForFeature('tasks');

    expect(result.authRoutingMode).toBe('global');
    expect(result.resolutionSource).toBe('global');
    expect(result.sourceType).toBe('oauth');
    expect(result.resolvedAccountId).toBe('oauth-oauth-default');
    expect(mockGetBestAvailableProfileEnv).toHaveBeenCalledTimes(1);
  });

  it('resolves explicit per-feature OAuth profile by id', async () => {
    mockReadSettingsFile.mockReturnValue({
      authRoutingMode: 'per_feature',
      featureAuthProfiles: { tasks: 'oauth-profile-a' },
    });

    const result = await resolveAuthEnvForFeature('tasks');

    expect(result.authRoutingMode).toBe('per_feature');
    expect(result.resolutionSource).toBe('feature');
    expect(result.sourceType).toBe('oauth');
    expect(result.resolvedAccountId).toBe('oauth-profile-a');
    expect(result.profileEnv.CLAUDE_CONFIG_DIR).toBe('/tmp/profile-a');
    expect(mockGetBestAvailableProfileEnv).not.toHaveBeenCalled();
  });

  it('resolves explicit per-feature API profile by id', async () => {
    mockReadSettingsFile.mockReturnValue({
      authRoutingMode: 'per_feature',
      featureAuthProfiles: { githubPrs: 'api-profile-b' },
    });
    mockGetAPIProfileEnvForProfileId.mockResolvedValue({
      ANTHROPIC_AUTH_TOKEN: 'token-b',
    });

    const result = await resolveAuthEnvForFeature('githubPrs');

    expect(result.authRoutingMode).toBe('per_feature');
    expect(result.resolutionSource).toBe('feature');
    expect(result.sourceType).toBe('api');
    expect(result.resolvedAccountId).toBe('api-profile-b');
    expect(result.apiProfileEnv.ANTHROPIC_AUTH_TOKEN).toBe('token-b');
    expect(mockGetBestAvailableProfileEnv).not.toHaveBeenCalled();
  });

  it('falls back in per-feature mode without mutating global resolution', async () => {
    mockReadSettingsFile.mockReturnValue({
      authRoutingMode: 'per_feature',
      featureAuthProfiles: { utility: 'oauth-missing-profile' },
    });
    mockGetClaudeProfileManager.mockReturnValue({
      getProfile: (id: string) => (id === 'oauth-default' ? { id, usage: { weeklyUsagePercent: 0 } } : null),
      hasValidAuth: () => true,
      isProfileRateLimited: () => ({ limited: false }),
      getProfileEnv: (id: string) => ({ CLAUDE_CONFIG_DIR: `/tmp/${id}` }),
      getAccountPriorityOrder: () => ['oauth-oauth-default'],
      getActiveProfile: () => ({ id: 'oauth-default' }),
      getSettings: () => ({ profiles: [{ id: 'oauth-default' }] }),
      getActiveProfileEnv: () => ({ CLAUDE_CONFIG_DIR: '/tmp/oauth-default' }),
    });

    const result = await resolveAuthEnvForFeature('utility');

    expect(result.authRoutingMode).toBe('per_feature');
    expect(result.sourceType).toBe('oauth');
    expect(result.resolvedAccountId).toBe('oauth-oauth-default');
    expect(result.fallbackUsed).toBe(true);
    expect(mockGetBestAvailableProfileEnv).not.toHaveBeenCalled();
  });
});
