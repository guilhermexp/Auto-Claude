import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { isLinux, isMacOS, isWindows } from '../platform';

const SERVICE_NAME = 'Auto-Claude-Team-Sync';
const ACCOUNT_NAME = 'session';
const FALLBACK_FILE = join(homedir(), '.auto-claude', 'team-sync-credentials.json');

export interface TeamSyncCredentials {
  email: string;
  sessionToken: string;
  activeTeamId?: string;
  deviceId: string;
}

function ensureFallbackDir(): void {
  const dir = join(homedir(), '.auto-claude');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function readFallback(): TeamSyncCredentials | null {
  if (!existsSync(FALLBACK_FILE)) return null;
  try {
    return JSON.parse(readFileSync(FALLBACK_FILE, 'utf-8')) as TeamSyncCredentials;
  } catch {
    return null;
  }
}

function writeFallback(credentials: TeamSyncCredentials): void {
  ensureFallbackDir();
  writeFileSync(FALLBACK_FILE, JSON.stringify(credentials, null, 2), { encoding: 'utf-8', mode: 0o600 });
}

export function getOrCreateDeviceId(): string {
  const existing = readFallback();
  if (existing?.deviceId) {
    return existing.deviceId;
  }
  const deviceId = randomUUID();
  writeFallback({ email: '', sessionToken: '', deviceId });
  return deviceId;
}

export function saveTeamSyncCredentials(credentials: TeamSyncCredentials): void {
  try {
    if (isMacOS()) {
      execFileSync('security', [
        'add-generic-password',
        '-a',
        ACCOUNT_NAME,
        '-s',
        SERVICE_NAME,
        '-U',
        '-w',
        JSON.stringify(credentials)
      ], { timeout: 5000 });
      return;
    }

    if (isLinux()) {
      const payload = JSON.stringify(credentials);
      execFileSync('secret-tool', [
        'store',
        '--label=Auto-Claude Team Sync',
        'service',
        SERVICE_NAME,
        'account',
        ACCOUNT_NAME
      ], { input: payload, timeout: 5000 });
      return;
    }

    if (isWindows()) {
      const payloadBase64 = Buffer.from(JSON.stringify(credentials), 'utf-8').toString('base64');
      const script = [
        "$payload = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('" + payloadBase64 + "'))",
        "$password = ConvertTo-SecureString -String $payload -AsPlainText -Force",
        "$credential = New-Object -TypeName System.Management.Automation.PSCredential -ArgumentList '" + ACCOUNT_NAME + "', $password",
        "Import-Module CredentialManager -ErrorAction SilentlyContinue",
        "New-StoredCredential -Target '" + SERVICE_NAME + "' -Credential $credential -Type Generic -Persist LocalMachine"
      ].join('; ');
      execFileSync('powershell', ['-NoProfile', '-Command', script], { timeout: 10000 });
      return;
    }
  } catch (error) {
    console.warn('[team-sync] Failed to store credentials in secure store, falling back to file:', error);
  }

  writeFallback(credentials);
}

export function loadTeamSyncCredentials(): TeamSyncCredentials | null {
  try {
    if (isMacOS()) {
      const raw = execFileSync('security', [
        'find-generic-password',
        '-a',
        ACCOUNT_NAME,
        '-s',
        SERVICE_NAME,
        '-w'
      ], { encoding: 'utf-8', timeout: 5000 }).trim();
      return JSON.parse(raw) as TeamSyncCredentials;
    }

    if (isLinux()) {
      const raw = execFileSync('secret-tool', [
        'lookup',
        'service',
        SERVICE_NAME,
        'account',
        ACCOUNT_NAME
      ], { encoding: 'utf-8', timeout: 5000 }).trim();
      if (raw) {
        return JSON.parse(raw) as TeamSyncCredentials;
      }
    }
  } catch {
    // Fall through to fallback file.
  }

  return readFallback();
}

export function clearTeamSyncCredentials(): void {
  try {
    if (isMacOS()) {
      execFileSync('security', ['delete-generic-password', '-a', ACCOUNT_NAME, '-s', SERVICE_NAME], { timeout: 5000 });
      return;
    }

    if (isLinux()) {
      execFileSync('secret-tool', ['clear', 'service', SERVICE_NAME, 'account', ACCOUNT_NAME], { timeout: 5000 });
      return;
    }
  } catch {
    // Best effort.
  }

  ensureFallbackDir();
  writeFileSync(FALLBACK_FILE, '', 'utf-8');
}
