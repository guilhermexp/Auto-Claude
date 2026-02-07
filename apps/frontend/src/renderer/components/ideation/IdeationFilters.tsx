import { useTranslation } from 'react-i18next';
import { Zap, Palette, BookOpen, Shield, Gauge } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';

interface IdeationFiltersProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}

export function IdeationFilters({ activeTab, onTabChange, children }: IdeationFiltersProps) {
  const { t } = useTranslation('ideation');
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="h-full flex flex-col">
      <TabsList className="shrink-0 mx-4 mt-4 flex-wrap h-auto gap-1 ideation-filters-list">
        <TabsTrigger value="all" className="ideation-filters-trigger">
          {t('filters.all')}
        </TabsTrigger>
        <TabsTrigger value="code_improvements" className="ideation-filters-trigger">
          <Zap className="h-3 w-3 mr-1" />
          {t('filters.code')}
        </TabsTrigger>
        <TabsTrigger value="ui_ux_improvements" className="ideation-filters-trigger">
          <Palette className="h-3 w-3 mr-1" />
          {t('filters.uiux')}
        </TabsTrigger>
        <TabsTrigger value="documentation_gaps" className="ideation-filters-trigger">
          <BookOpen className="h-3 w-3 mr-1" />
          {t('filters.docs')}
        </TabsTrigger>
        <TabsTrigger value="security_hardening" className="ideation-filters-trigger">
          <Shield className="h-3 w-3 mr-1" />
          {t('filters.security')}
        </TabsTrigger>
        <TabsTrigger value="performance_optimizations" className="ideation-filters-trigger">
          <Gauge className="h-3 w-3 mr-1" />
          {t('filters.performance')}
        </TabsTrigger>
      </TabsList>
      {children}
    </Tabs>
  );
}
