import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockResolveAuthEnvForFeature = vi.fn();
const mockGetPythonEnv = vi.fn();
const mockGetGitHubTokenForSubprocess = vi.fn();

vi.mock('../../../../python-env-manager', () => ({
  pythonEnvManager: {
    getPythonEnv: () => mockGetPythonEnv(),
  },
}));

vi.mock('../../../../auth-profile-routing', () => ({
  resolveAuthEnvForFeature: (...args: unknown[]) => mockResolveAuthEnvForFeature(...args),
}));

// Mock getGitHubTokenForSubprocess to avoid calling gh CLI in tests
// Path is relative to the module being mocked (runner-env.ts), which imports from '../utils'
vi.mock('../../utils', () => ({
  getGitHubTokenForSubprocess: () => mockGetGitHubTokenForSubprocess(),
}));

import { getRunnerEnv } from '../runner-env';

describe('getRunnerEnv', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for Python env - minimal env for testing
    mockGetPythonEnv.mockReturnValue({
      PYTHONDONTWRITEBYTECODE: '1',
      PYTHONIOENCODING: 'utf-8',
      PYTHONNOUSERSITE: '1',
      PYTHONPATH: '/bundled/site-packages',
    });
    mockResolveAuthEnvForFeature.mockResolvedValue({
      profileEnv: {},
      apiProfileEnv: {},
      oauthModeClearVars: {},
      sourceType: 'none',
      resolutionSource: 'global',
      authRoutingMode: 'global',
      fallbackUsed: false
    });
    // Default mock for GitHub token - returns null (no token) by default
    mockGetGitHubTokenForSubprocess.mockResolvedValue(null);
  });

  it('merges Python env with API profile env and OAuth clear vars', async () => {
    mockResolveAuthEnvForFeature.mockResolvedValue({
      profileEnv: {},
      apiProfileEnv: {
        ANTHROPIC_AUTH_TOKEN: 'token',
        ANTHROPIC_BASE_URL: 'https://api.example.com',
      },
      oauthModeClearVars: {
        ANTHROPIC_AUTH_TOKEN: '',
      },
      sourceType: 'api',
      resolutionSource: 'global',
      authRoutingMode: 'global',
      fallbackUsed: false
    });

    const result = await getRunnerEnv();

    // Python env is included first, then overridden by OAuth clear vars
    expect(result).toMatchObject({
      PYTHONPATH: '/bundled/site-packages',
      PYTHONDONTWRITEBYTECODE: '1',
      ANTHROPIC_AUTH_TOKEN: '',
      ANTHROPIC_BASE_URL: 'https://api.example.com',
    });
  });

  it('includes extra env values with highest precedence', async () => {
    mockResolveAuthEnvForFeature.mockResolvedValue({
      profileEnv: {},
      apiProfileEnv: {
        ANTHROPIC_AUTH_TOKEN: 'token',
      },
      oauthModeClearVars: {},
      sourceType: 'api',
      resolutionSource: 'feature',
      authRoutingMode: 'per_feature',
      fallbackUsed: false
    });

    const result = await getRunnerEnv({ USE_CLAUDE_MD: 'true' });

    expect(result).toMatchObject({
      PYTHONPATH: '/bundled/site-packages',
      ANTHROPIC_AUTH_TOKEN: 'token',
      USE_CLAUDE_MD: 'true',
    });
  });

  it('includes PYTHONPATH for bundled packages (fixes #139)', async () => {
    mockResolveAuthEnvForFeature.mockResolvedValue({
      profileEnv: {},
      apiProfileEnv: {},
      oauthModeClearVars: {},
      sourceType: 'none',
      resolutionSource: 'global',
      authRoutingMode: 'global',
      fallbackUsed: false
    });
    mockGetPythonEnv.mockReturnValue({
      PYTHONPATH: '/app/Contents/Resources/python-site-packages',
    });

    const result = await getRunnerEnv();

    expect(result.PYTHONPATH).toBe('/app/Contents/Resources/python-site-packages');
  });

  it('includes profileEnv for OAuth token (fixes #563)', async () => {
    mockResolveAuthEnvForFeature.mockResolvedValue({
      profileEnv: { CLAUDE_CODE_OAUTH_TOKEN: 'oauth-token-123' },
      apiProfileEnv: {},
      oauthModeClearVars: {},
      sourceType: 'oauth',
      resolutionSource: 'global',
      authRoutingMode: 'global',
      fallbackUsed: false
    });

    const result = await getRunnerEnv();

    expect(result.CLAUDE_CODE_OAUTH_TOKEN).toBe('oauth-token-123');
  });

  it('applies correct precedence order with profileEnv overriding pythonEnv', async () => {
    mockGetPythonEnv.mockReturnValue({
      SHARED_VAR: 'from-python',
    });
    mockResolveAuthEnvForFeature.mockResolvedValue({
      profileEnv: { SHARED_VAR: 'from-profile' },
      apiProfileEnv: { SHARED_VAR: 'from-api-profile' },
      oauthModeClearVars: {},
      sourceType: 'oauth',
      resolutionSource: 'feature',
      authRoutingMode: 'per_feature',
      fallbackUsed: false
    });

    const result = await getRunnerEnv({ SHARED_VAR: 'from-extra' });

    // extraEnv has highest precedence
    expect(result.SHARED_VAR).toBe('from-extra');
  });

  it('includes GitHub token from gh CLI when available (fixes #151)', async () => {
    mockResolveAuthEnvForFeature.mockResolvedValue({
      profileEnv: {},
      apiProfileEnv: {},
      oauthModeClearVars: {},
      sourceType: 'none',
      resolutionSource: 'global',
      authRoutingMode: 'global',
      fallbackUsed: false
    });
    mockGetGitHubTokenForSubprocess.mockResolvedValue('gh-token-123');

    const result = await getRunnerEnv();

    expect(result.GITHUB_TOKEN).toBe('gh-token-123');
  });

  it('omits GITHUB_TOKEN when gh CLI returns null', async () => {
    mockResolveAuthEnvForFeature.mockResolvedValue({
      profileEnv: {},
      apiProfileEnv: {},
      oauthModeClearVars: {},
      sourceType: 'none',
      resolutionSource: 'global',
      authRoutingMode: 'global',
      fallbackUsed: false
    });
    mockGetGitHubTokenForSubprocess.mockResolvedValue(null);

    const result = await getRunnerEnv();

    expect(result.GITHUB_TOKEN).toBeUndefined();
  });
});
