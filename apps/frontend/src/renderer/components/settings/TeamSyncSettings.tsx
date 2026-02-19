import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut, Users, RefreshCw } from 'lucide-react';
import { SettingsCard } from './SettingsCard';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import type { AppSettings } from '../../../shared/types';
import { useTeamSyncStore } from '../../stores/team-sync-store';
import { useProjectStore } from '../../stores/project-store';
import { TeamSyncAuthModal } from '../TeamSyncAuthModal';

interface TeamSyncSettingsProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  onSave?: () => void;
  isSaving?: boolean;
  error?: string | null;
}

export function TeamSyncSettings({ settings, onSettingsChange, onSave, isSaving, error }: TeamSyncSettingsProps) {
  const { t } = useTranslation(['team', 'common']);
  const {
    status,
    teams,
    members,
    updates,
    error: syncError,
    initialize,
    signout,
    createTeam,
    joinTeam,
    fetchMembers,
    enableSync,
    disableSync,
    forcePush,
    forcePull
  } = useTeamSyncStore();

  const projects = useProjectStore((state) => state.projects);
  const selectedProjectId = useProjectStore((state) => state.selectedProjectId);
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId]
  );

  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (status.activeTeam?.id) {
      void fetchMembers(status.activeTeam.id);
    }
  }, [status.activeTeam?.id, fetchMembers]);

  const rawError = syncError || error;
  const combinedError = rawError?.startsWith('team:') ? t(rawError) : rawError;
  const isAuthenticated = status.authenticated;

  return (
    <SettingsCard
      title={t('team:settings.title')}
      description={t('team:settings.description')}
      onSave={onSave}
      isSaving={isSaving}
      error={combinedError}
    >
      <div className="space-y-5">
        {!isAuthenticated ? (
          /* Not authenticated — prompt to sign in */
          <div className="flex flex-col items-center gap-4 rounded-md border border-border/60 bg-card/40 p-6">
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">
              {t('team:settings.signInRequired')}
            </p>
            <Button onClick={() => setShowAuthModal(true)}>
              {t('team:auth.signIn')}
            </Button>
            <TeamSyncAuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
          </div>
        ) : (
          /* Authenticated — show account, teams, sync */
          <>
            {/* Account info + sign out */}
            <div className="flex items-center justify-between rounded-md border border-border/60 bg-card/40 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                  {(status.user?.name || status.user?.email || '?')[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{status.user?.name || status.user?.email}</p>
                  {status.user?.name && (
                    <p className="text-xs text-muted-foreground">{status.user.email}</p>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void signout()}
              >
                <LogOut className="mr-1.5 h-3.5 w-3.5" />
                {t('team:auth.signOut')}
              </Button>
            </div>

            {/* Connection status */}
            <div className="flex items-center gap-2">
              <Badge variant={status.connected ? 'default' : 'secondary'}>
                {status.connected ? t('team:status.connected') : t('team:status.disconnected')}
              </Badge>
              <Badge variant="outline">{t(`team:mode.${status.mode}`)}</Badge>
              {status.pendingChanges > 0 && (
                <Badge variant="secondary">
                  <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                  {t('team:status.pending')}: {status.pendingChanges}
                </Badge>
              )}
            </div>

            {/* Create / Join team */}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('team:manage.createTeam')}</Label>
                <div className="flex gap-2">
                  <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder={t('team:manage.teamName')} />
                  <Button
                    size="sm"
                    disabled={!teamName}
                    onClick={async () => {
                      await createTeam(teamName);
                      setTeamName('');
                    }}
                  >
                    {t('team:manage.create')}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('team:manage.joinTeam')}</Label>
                <div className="flex gap-2">
                  <Input value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="ABC12345" />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!inviteCode}
                    onClick={async () => {
                      await joinTeam(inviteCode);
                      setInviteCode('');
                    }}
                  >
                    {t('team:manage.join')}
                  </Button>
                </div>
              </div>
            </div>

            {/* Sync controls for current project */}
            <div className="rounded-md border border-border/60 bg-card/30 p-3 space-y-2">
              <p className="text-sm font-medium">{t('team:sync.currentProject')}</p>
              <p className="text-xs text-muted-foreground">
                {selectedProject ? `${selectedProject.name} (${selectedProject.id})` : t('team:sync.selectProject')}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={!selectedProject}
                  onClick={async () => {
                    if (!selectedProject) return;
                    await enableSync(selectedProject.id, selectedProject.path);
                  }}
                >
                  {t('team:sync.enableSync')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!selectedProject}
                  onClick={async () => {
                    if (!selectedProject) return;
                    await disableSync(selectedProject.id);
                  }}
                >
                  {t('team:sync.disableSync')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!selectedProject}
                  onClick={async () => {
                    if (!selectedProject) return;
                    await forcePush(selectedProject.id);
                  }}
                >
                  {t('team:sync.forcePush')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!selectedProject}
                  onClick={async () => {
                    if (!selectedProject) return;
                    await forcePull(selectedProject.id);
                  }}
                >
                  {t('team:sync.forcePull')}
                </Button>
              </div>
            </div>

            {/* Teams + Members */}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border border-border/60 bg-card/30 p-3">
                <p className="mb-2 text-sm font-medium">{t('team:manage.teams')}</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {teams.length === 0 ? <p>{t('team:manage.noTeams')}</p> : teams.map((team) => (
                    <p key={team.id}>{team.name} ({team.role})</p>
                  ))}
                </div>
              </div>
              <div className="rounded-md border border-border/60 bg-card/30 p-3">
                <p className="mb-2 text-sm font-medium">{t('team:manage.members')}</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {members.length === 0 ? <p>{t('team:manage.noMembers')}</p> : members.map((member) => (
                    <p key={member.id}>{member.email} ({member.role})</p>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent events */}
            <div className="rounded-md border border-border/60 bg-card/30 p-3">
              <p className="mb-2 text-sm font-medium">{t('team:events.title')}</p>
              <div className="max-h-40 space-y-1 overflow-auto text-xs text-muted-foreground">
                {updates.length === 0 ? (
                  <p>{t('team:events.noEvents')}</p>
                ) : (
                  updates.slice(0, 10).map((item, index) => (
                    <p key={`${item.timestamp}-${index}`}>{item.timestamp} - {item.type} - {item.message || ''}</p>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </SettingsCard>
  );
}
