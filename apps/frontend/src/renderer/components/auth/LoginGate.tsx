import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LogIn, UserPlus, Loader2 } from 'lucide-react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useTeamSyncStore } from '../../stores/team-sync-store';

export function LoginGate() {
  const { t } = useTranslation(['team', 'common']);
  const { signin, signup, joinTeam, isLoading, error } = useTeamSyncStore();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const handleSubmit = async () => {
    if (mode === 'signup') {
      const success = await signup(email, name || email.split('@')[0], password);
      if (success && inviteCode.trim()) {
        await joinTeam(inviteCode.trim());
      }
    } else {
      await signin(email, password);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && email && password && !isLoading) {
      void handleSubmit();
    }
  };

  const isSignUp = mode === 'signup';

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 px-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">{t('team:gate.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('team:gate.subtitle')}</p>
        </div>

        {/* Form */}
        <div className="space-y-4 rounded-lg border border-border bg-card p-6" onKeyDown={handleKeyDown}>
          <div className="flex items-center gap-2 text-sm font-medium">
            {isSignUp ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            {isSignUp ? t('team:auth.signUp') : t('team:auth.signIn')}
          </div>

          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="gate-name">{t('team:auth.name')}</Label>
              <Input
                id="gate-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                disabled={isLoading}
                autoComplete="name"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="gate-email">{t('team:auth.email')}</Label>
            <Input
              id="gate-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="team@company.com"
              disabled={isLoading}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gate-password">{t('team:auth.password')}</Label>
            <Input
              id="gate-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
          </div>

          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="gate-invite-code">
                {t('team:auth.inviteCode')}
                <span className="ml-1 text-xs text-muted-foreground font-normal">
                  ({t('common:labels.optional')})
                </span>
              </Label>
              <Input
                id="gate-invite-code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="ABCD1234"
                disabled={isLoading}
                autoComplete="off"
                maxLength={8}
                className="font-mono tracking-wider"
              />
              <p className="text-xs text-muted-foreground">
                {t('team:auth.inviteCodeHint')}
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            className="w-full"
            disabled={isLoading || !email || !password}
            onClick={() => void handleSubmit()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common:labels.loading')}
              </>
            ) : isSignUp ? (
              t('team:auth.signUp')
            ) : (
              t('team:auth.signIn')
            )}
          </Button>

          <div className="text-center">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMode(isSignUp ? 'signin' : 'signup')}
              disabled={isLoading}
            >
              {isSignUp ? t('team:auth.hasAccount') : t('team:auth.noAccount')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
