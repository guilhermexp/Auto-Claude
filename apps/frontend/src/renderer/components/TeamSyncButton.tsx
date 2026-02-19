import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, CloudOff } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { Button } from './ui/button';
import { useTeamSyncStore } from '../stores/team-sync-store';
import { TeamSyncAuthModal } from './TeamSyncAuthModal';

export function TeamSyncButton() {
  const { t } = useTranslation(['team', 'common']);
  const { status } = useTeamSyncStore();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const isAuthenticated = status.authenticated;
  const isConnected = status.connected;
  const Icon = isAuthenticated ? Users : CloudOff;

  const handleClick = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
    } else {
      window.dispatchEvent(
        new CustomEvent('open-app-settings', { detail: 'team-sync' })
      );
    }
  };

  return (
    <>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={handleClick}
              aria-label={t('team:settings.title')}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold">
                {isAuthenticated ? t('team:status.connected') : t('team:auth.signIn')}
              </span>
              {isConnected && status.pendingChanges > 0 && (
                <span className="ml-0.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                  {status.pendingChanges}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {isAuthenticated
              ? t('team:status.connectedToTeam', { team: status.activeTeam?.name ?? '' })
              : t('team:settings.description')}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TeamSyncAuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
    </>
  );
}
