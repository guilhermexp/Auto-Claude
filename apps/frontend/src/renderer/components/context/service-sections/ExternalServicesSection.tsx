import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Server, ChevronDown, ChevronRight, HardDrive, Mail, CreditCard, Zap } from 'lucide-react';
import { Badge } from '../../ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '../../ui/collapsible';
import type { ServiceInfo } from '../../../../shared/types';

interface ExternalServicesSectionProps {
  services: ServiceInfo['services'];
}

export function ExternalServicesSection({ services }: ExternalServicesSectionProps) {
  const { t } = useTranslation('insights');
  const [expanded, setExpanded] = useState(false);

  if (!services || !Object.values(services).some(arr => arr && arr.length > 0)) {
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
          <Server className="h-3 w-3" />
          {t('serviceSections.externalServices')}
        </div>
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2">
        {services.databases && services.databases.length > 0 && (
          <div>
            <span className="text-xs text-muted-foreground">{t('serviceSections.databases')}</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {services.databases.map((db, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs context-chip context-chip-neutral">
                  <HardDrive className="h-3 w-3 mr-1" />
                  {db.type || db.client}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {services.email && services.email.length > 0 && (
          <div>
            <span className="text-xs text-muted-foreground">{t('serviceSections.email')}</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {services.email.map((email, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs context-chip context-chip-neutral">
                  <Mail className="h-3 w-3 mr-1" />
                  {email.provider || email.client}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {services.payments && services.payments.length > 0 && (
          <div>
            <span className="text-xs text-muted-foreground">{t('serviceSections.payments')}</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {services.payments.map((payment, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs context-chip context-chip-neutral">
                  <CreditCard className="h-3 w-3 mr-1" />
                  {payment.provider || payment.client}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {services.cache && services.cache.length > 0 && (
          <div>
            <span className="text-xs text-muted-foreground">{t('serviceSections.cache')}</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {services.cache.map((cache, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs context-chip context-chip-neutral">
                  <Zap className="h-3 w-3 mr-1" />
                  {cache.type || cache.client}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
