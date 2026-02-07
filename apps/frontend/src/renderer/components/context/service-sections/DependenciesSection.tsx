import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '../../ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '../../ui/collapsible';

interface DependenciesSectionProps {
  dependencies: string[];
}

export function DependenciesSection({ dependencies }: DependenciesSectionProps) {
  const { t } = useTranslation('insights');
  const [expanded, setExpanded] = useState(false);

  if (!dependencies || dependencies.length === 0) {
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
          <Package className="h-3 w-3" />
          {t('serviceSections.dependencies', { count: dependencies.length })}
        </div>
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className="flex flex-wrap gap-1">
          {dependencies.slice(0, 20).map(dep => (
            <Badge key={dep} variant="outline" className="text-xs font-mono context-chip context-chip-muted">
              {dep}
            </Badge>
          ))}
          {dependencies.length > 20 && (
            <Badge variant="secondary" className="text-xs context-chip context-chip-neutral">
              {t('serviceSections.moreDependencies', { count: dependencies.length - 20 })}
            </Badge>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
