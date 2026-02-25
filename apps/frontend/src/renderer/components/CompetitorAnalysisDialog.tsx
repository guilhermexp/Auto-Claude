import { Search, Globe, AlertTriangle, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
  AlertDialogCancel,
} from './ui/alert-dialog';
import { Button } from './ui/button';
import { AddCompetitorDialog } from './AddCompetitorDialog';

interface CompetitorAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
  onDecline: () => void;
  projectId: string;
}

export function CompetitorAnalysisDialog({
  open,
  onOpenChange,
  onAccept,
  onDecline,
  projectId,
}: CompetitorAnalysisDialogProps) {
  const { t } = useTranslation('dialogs');
  const handleAccept = () => {
    onAccept();
    onOpenChange(false);
  };

  const handleDecline = () => {
    onDecline();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[500px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-foreground">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t('competitorAnalysis.enableTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            {t('competitorAnalysis.enableDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4 space-y-4">
          {/* What it does */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <h4 className="text-sm font-medium text-foreground mb-2">
              {t('competitorAnalysis.whatItDoesTitle')}
            </h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <Search className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <span>{t('competitorAnalysis.whatItDoes.item1')}</span>
              </li>
              <li className="flex items-start gap-2">
                <Globe className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <span>
                  {t('competitorAnalysis.whatItDoes.item2')}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <span>
                  {t('competitorAnalysis.whatItDoes.item3')}
                </span>
              </li>
            </ul>
          </div>

          {/* Add Known Competitors section */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground">
                  {t('competitorAnalysis.privacyTitle')}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('competitorAnalysis.privacyDescription')}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5"
                onClick={() => setShowAddDialog(true)}
              >
                <UserPlus className="h-3.5 w-3.5" />
                {t('dialogs:competitorAnalysis.addKnownCompetitors', 'Add Known Competitors')}
                {addedCount > 0 && (
                  <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                    {t('dialogs:competitorAnalysis.competitorsAdded', '{{count}} added', { count: addedCount })}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Optional info */}
          <p className="text-xs text-muted-foreground">
            {t('competitorAnalysis.optionalInfo')}
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDecline}>
            {t('competitorAnalysis.cancelEnable')}
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleAccept}>
            {t('competitorAnalysis.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
