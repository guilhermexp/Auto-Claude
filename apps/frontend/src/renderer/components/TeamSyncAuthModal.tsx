import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LogIn, UserPlus, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useTeamSyncStore } from '../stores/team-sync-store';

interface TeamSyncAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeamSyncAuthModal({ open, onOpenChange }: TeamSyncAuthModalProps) {
  const { t } = useTranslation(['team', 'common']);
  const { signin, signup, isLoading, error } = useTeamSyncStore();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
  };

  const handleSubmit = async () => {
    let success: boolean;
    if (mode === 'signup') {
      success = await signup(email, name || email.split('@')[0], password);
    } else {
      success = await signin(email, password);
    }
    if (success) {
      resetForm();
      onOpenChange(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && email && password && !isLoading) {
      void handleSubmit();
    }
  };

  const isSignUp = mode === 'signup';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isSignUp ? <UserPlus className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
            {isSignUp ? t('team:auth.signUp') : t('team:auth.signIn')}
          </DialogTitle>
          <DialogDescription>
            {t('team:settings.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2" onKeyDown={handleKeyDown}>
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="team-auth-name">{t('team:auth.name')}</Label>
              <Input
                id="team-auth-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                disabled={isLoading}
                autoComplete="name"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="team-auth-email">{t('team:auth.email')}</Label>
            <Input
              id="team-auth-email"
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
            <Label htmlFor="team-auth-password">{t('team:auth.password')}</Label>
            <Input
              id="team-auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter className="flex-col gap-3 sm:flex-col">
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

          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => {
              setMode(isSignUp ? 'signin' : 'signup');
            }}
            disabled={isLoading}
          >
            {isSignUp ? t('team:auth.hasAccount') : t('team:auth.noAccount')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
