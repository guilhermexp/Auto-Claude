import { RefreshCw, Check, FileText } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import type { WizardStep } from './hooks/useChangelog';

interface ChangelogHeaderProps {
  step: WizardStep;
  onRefresh: () => void;
}

export function ChangelogHeader({ step, onRefresh }: ChangelogHeaderProps) {
  return (
    <div className="shrink-0 border-b border-border/40 px-6 py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <FileText className="h-6 w-6" />
            Changelog Generator
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === 1
              ? 'Select completed tasks to include'
              : step === 2
                ? 'Configure and generate your changelog'
                : 'Release and archive tasks'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="github-pr-action-button flex h-9 items-center gap-1 rounded-full px-2">
            <StepIndicator step={1} currentStep={step} label="Select" />
            <StepDivider />
            <StepIndicator step={2} currentStep={step} label="Generate" />
            <StepDivider />
            <StepIndicator step={3} currentStep={step} label="Release" />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            className="worktrees-action-button h-9 px-3"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
    </div>
  );
}

function StepDivider() {
  return <div className="h-4 w-px bg-border/45" />;
}

interface StepIndicatorProps {
  step: WizardStep;
  currentStep: WizardStep;
  label: string;
}

function StepIndicator({ step, currentStep, label }: StepIndicatorProps) {
  const isActive = step === currentStep;
  const isComplete = step < currentStep;

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full px-2 py-1 text-xs transition-colors',
        isActive ? 'bg-muted/70 text-foreground' : 'text-muted-foreground'
      )}
    >
      <span
        className={cn(
          'flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-semibold',
          isActive || isComplete
            ? 'border-primary/40 bg-primary/12 text-foreground'
            : 'border-border/60 text-muted-foreground'
        )}
      >
        {isComplete ? <Check className="h-2.5 w-2.5" /> : step}
      </span>
      <span className={cn('leading-none', isActive && 'font-medium')}>
        {label}
      </span>
    </div>
  );
}
