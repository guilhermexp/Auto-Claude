import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LogOut,
  Users,
  RefreshCw,
  Mail,
  Crown,
  Shield,
  User,
  Trash2,
  Loader2,
  UserPlus,
  Copy,
  Check,
  Send
} from 'lucide-react';
import { SettingsCard } from './SettingsCard';
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

const roleConfig: Record<string, { icon: typeof Crown; color: string }> = {
  owner: { icon: Crown, color: 'text-amber-400' },
  admin: { icon: Shield, color: 'text-blue-400' },
  member: { icon: User, color: 'text-muted-foreground' },
};

function getInitials(name?: string, email?: string): string {
  if (name) {
    return name
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
  return (email || '?')[0].toUpperCase();
}

export function TeamSyncSettings({ settings, onSettingsChange, onSave, isSaving, error }: TeamSyncSettingsProps) {
  const { t } = useTranslation(['team', 'common']);
  const {
    status,
    members,
    invitations,
    error: syncError,
    isLoading,
    initialize,
    signout,
    fetchMembers,
    removeMember,
    inviteMember,
    acceptInvitation,
    loadInvitations,
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

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [acceptInvitationId, setAcceptInvitationId] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);

  const activeTeam = status.activeTeam;
  const isOwnerOrAdmin = activeTeam?.role === 'owner' || activeTeam?.role === 'admin';
  const isAuthenticated = status.authenticated;

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (activeTeam?.id) {
      void fetchMembers(activeTeam.id);
      void loadInvitations(activeTeam.id);
    }
  }, [activeTeam?.id, fetchMembers, loadInvitations]);

  const showSuccess = (msg: string) => {
    setFeedbackSuccess(msg);
    setFeedbackError(null);
    setTimeout(() => setFeedbackSuccess(null), 4000);
  };

  const showError = (msg: string) => {
    setFeedbackError(msg);
    setFeedbackSuccess(null);
  };

  const copyToken = async (invitationId: string) => {
    try {
      await navigator.clipboard.writeText(invitationId);
      setCopiedId(invitationId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(invitationId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleInvite = async () => {
    if (!activeTeam?.id || !inviteEmail.trim()) return;
    setIsInviting(true);
    const ok = await inviteMember(activeTeam.id, inviteEmail.trim(), inviteRole);
    setIsInviting(false);
    if (ok) {
      showSuccess(t('team:invitations.sent'));
      setInviteEmail('');
    } else {
      showError(t('team:invitations.errors.sendFailed'));
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!activeTeam?.id) return;
    const ok = await removeMember(activeTeam.id, memberId);
    if (ok) {
      showSuccess(t('team:manage.removed'));
    } else {
      showError(t('team:errors.removeMember'));
    }
  };

  const rawError = syncError || error;
  const combinedError = rawError?.startsWith('team:') ? t(rawError) : rawError;

  // Get the current user's role config
  const myRoleConfig = activeTeam ? (roleConfig[activeTeam.role] || roleConfig.member) : null;
  const MyRoleIcon = myRoleConfig?.icon;

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
          <div className="rounded-xl border border-border bg-card/40 p-8 text-center">
            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm text-muted-foreground mb-4">
              {t('team:settings.signInRequired')}
            </p>
            <Button onClick={() => setShowAuthModal(true)}>
              {t('team:auth.signIn')}
            </Button>
            <TeamSyncAuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
          </div>
        ) : (
          /* Authenticated — full management */
          <>
            {/* Feedback banners */}
            {feedbackError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {feedbackError}
              </div>
            )}
            {feedbackSuccess && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                {feedbackSuccess}
              </div>
            )}

            {/* Account info + role + sign out */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-card/40 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                  {getInitials(status.user?.name, status.user?.email)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{status.user?.name || status.user?.email}</p>
                    {activeTeam && myRoleConfig && MyRoleIcon && (
                      <span className={`flex items-center gap-1 text-xs font-medium ${myRoleConfig.color}`}>
                        <MyRoleIcon className="h-3 w-3" />
                        {t(`team:roles.${activeTeam.role}`)}
                      </span>
                    )}
                  </div>
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
              {activeTeam && (
                <Badge variant="outline">{activeTeam.name}</Badge>
              )}
              {status.pendingChanges > 0 && (
                <Badge variant="secondary">
                  <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                  {t('team:status.pending')}: {status.pendingChanges}
                </Badge>
              )}
            </div>

            {/* Invite member (owner/admin + has active team) */}
            {isOwnerOrAdmin && activeTeam && (
              <div className="rounded-xl border border-border bg-card/40 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium">{t('team:invitations.invite')}</h4>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {t('team:invitations.description')}
                </p>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder={t('team:invitations.email')}
                    onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                    className="flex-1"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}
                    className="h-9 px-2 text-sm rounded-xl border border-input bg-input/30 text-foreground"
                  >
                    <option value="member">{t('team:roles.member')}</option>
                    <option value="admin">{t('team:roles.admin')}</option>
                  </select>
                  <Button
                    onClick={handleInvite}
                    disabled={!inviteEmail.trim() || isInviting}
                    size="sm"
                  >
                    {isInviting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="mr-1.5 h-3.5 w-3.5" />
                        {t('team:invitations.send')}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Pending invitations */}
            {invitations.length > 0 && (
              <div className="rounded-xl border border-border bg-card/40 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium">{t('team:invitations.pending')}</h4>
                  <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                    {invitations.length}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  {invitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-card/30 border border-border"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20">
                          <Mail className="h-3 w-3 text-amber-400" />
                        </div>
                        <div>
                          <p className="text-sm">{inv.email}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {t(`team:roles.${inv.role}`)}
                            {inv.expiresAt && (
                              <> — {t('team:invitations.expiresAt')} {new Date(inv.expiresAt).toLocaleDateString()}</>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => copyToken(inv.id)}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
                          title={t('team:invitations.copyToken')}
                        >
                          {copiedId === inv.id ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          {t('team:invitations.token')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Members list */}
            <div className="rounded-xl border border-border bg-card/40 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">{t('team:manage.members')}</h4>
                {members.length > 0 && (
                  <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                    {members.length}
                  </Badge>
                )}
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-6">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-xs text-muted-foreground">
                    {t('team:manage.onlyYou')}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {members.map((member) => {
                    const config = roleConfig[member.role] || roleConfig.member;
                    const RoleIcon = config.icon;
                    const isCurrentUser = member.userId === status.user?.id;

                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-card/30 border border-border"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/50 border border-border text-xs font-semibold">
                            {getInitials(member.name, member.email)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium">
                                {member.name || member.email}
                              </p>
                              {isCurrentUser && (
                                <span className="text-[10px] text-muted-foreground">
                                  ({t('team:manage.you')})
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              {member.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`flex items-center gap-1 text-xs font-medium ${config.color}`}>
                            <RoleIcon className="h-3 w-3" />
                            {t(`team:roles.${member.role}`)}
                          </span>
                          {member.role !== 'owner' && !isCurrentUser && isOwnerOrAdmin && (
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="p-1 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                              title={t('team:manage.removeMember')}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Accept invitation (for joining other teams) */}
            <div className="rounded-xl border border-border bg-card/40 p-5 space-y-2">
              <p className="text-sm font-medium">{t('team:invitations.accept')}</p>
              <div className="flex gap-2">
                <Input
                  value={acceptInvitationId}
                  onChange={(e) => setAcceptInvitationId(e.target.value)}
                  placeholder={t('team:invitations.tokenPlaceholder')}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!acceptInvitationId || isLoading}
                  onClick={async () => {
                    const ok = await acceptInvitation(acceptInvitationId);
                    if (ok) {
                      showSuccess(t('team:invitations.accepted'));
                      setAcceptInvitationId('');
                    }
                  }}
                >
                  {t('team:invitations.accept')}
                </Button>
              </div>
            </div>

            {/* Sync controls for current project */}
            <div className="rounded-xl border border-border bg-card/40 p-5 space-y-2">
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
          </>
        )}
      </div>
    </SettingsCard>
  );
}
