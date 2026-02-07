# Accounts Re-auth Troubleshooting

This guide documents how the `Settings > Accounts` re-authentication flow should behave for Claude profiles, especially after profile migration from `~/.claude` to `~/.claude-profiles/*`.

## Symptoms

- Account row stays on `Needs re-auth` even after successful `claude /login`.
- Auth terminal shows `Login successful`, but the warning badge remains red.
- Re-auth modal appears again after app restart for a profile that was already re-authenticated.

## Root Cause Patterns

1. Stale migration state
- Migrated profiles are marked for re-auth by default.
- If this flag is not cleared after successful login, UI keeps showing re-auth required.

2. Stale `needsReauthentication` cache
- On startup (`currentUsage === null`), usage snapshots can be built from stale state.
- If `needsReauthProfiles` is only appended to, stale entries persist.

3. In-flight auth race in renderer
- During active auth terminal flow, usage status can still show the old `needsReauth` state before the next refresh.

## Required Lifecycle (Post-fix)

After `Login success detected for profile: <id>`:

1. Profile auth status is persisted (`isAuthenticated = true`).
2. Usage monitor clears auth failure status for that profile.
3. Migrated-profile flag is cleared for that profile.
4. UI refreshes profile list and forces usage refresh.
5. `Needs re-auth` is suppressed while auth terminal is active.

## Implementation Guardrails

- `apps/frontend/src/main/terminal/claude-integration-handler.ts`
  - On login success, call usage monitor clear (`clearAuthFailedProfile`) and clear migrated flag.
- `apps/frontend/src/main/claude-profile/usage-monitor.ts`
  - When `currentUsage` is empty at startup, synchronize `needsReauthProfiles` by adding/removing based on `isProfileAuthenticated(profile)`.
- `apps/frontend/src/renderer/components/settings/AccountSettings.tsx`
  - Force usage refresh on auth success.
  - Do not render `Needs re-auth` while that profile is currently in auth flow.

## Manual Verification Checklist

1. Open `Settings > Accounts` with a migrated profile that shows `Needs re-auth`.
2. Run auth flow and complete `claude /login`.
3. Confirm logs show login success and no new auth failure for the same profile.
4. Confirm badge clears without requiring app restart.
5. Restart app and confirm profile does not return to `Needs re-auth` unless credentials are actually missing.

## Regression Safety

- Run test suite after changes:
  - `npm test`
- Validate real flow in dev mode (`bun dev`) with at least one migrated profile.
