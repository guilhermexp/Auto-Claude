import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Key, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { cn } from '../../../lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '../../ui/collapsible';
import type { ServiceInfo } from '../../../../shared/types';

interface EnvironmentSectionProps {
  environment: ServiceInfo['environment'];
}

export function EnvironmentSection({ environment }: EnvironmentSectionProps) {
  const { t } = useTranslation('insights');
  const [expanded, setExpanded] = useState(false);

  if (!environment || environment.detected_count === 0) {
    return null;
  }

  return (
    <Collapsible
      open={expanded}
      onOpenChange={setExpanded}
      className="context-divider pt-3"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between text-xs font-medium context-section-trigger">
        <div className="flex items-center gap-2">
          <Key className="h-3 w-3" />
          {t('serviceSections.environmentVariables', { count: environment.detected_count })}
        </div>
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-1.5">
        {Object.entries(environment.variables).slice(0, 10).map(([key, envVar]) => (
          <div key={key} className="flex items-start gap-2 text-xs">
            <Badge
              variant={envVar.sensitive ? "destructive" : "outline"}
              className={cn(
                "text-xs shrink-0 context-chip",
                envVar.sensitive ? "context-chip-danger" : "context-chip-muted"
              )}
            >
              {envVar.type}
            </Badge>
            <code className="flex-1 font-mono text-muted-foreground truncate">{key}</code>
            {envVar.required && <span className="context-tone-warning shrink-0">*</span>}
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
