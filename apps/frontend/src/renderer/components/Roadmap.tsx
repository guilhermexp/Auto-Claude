import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { RoadmapGenerationProgress } from './RoadmapGenerationProgress';
import { CompetitorAnalysisDialog } from './CompetitorAnalysisDialog';
import { ExistingCompetitorAnalysisDialog } from './ExistingCompetitorAnalysisDialog';
import { CompetitorAnalysisViewer } from './CompetitorAnalysisViewer';
import { AddFeatureDialog } from './AddFeatureDialog';
import { RoadmapHeader } from './roadmap/RoadmapHeader';
import { RoadmapEmptyState } from './roadmap/RoadmapEmptyState';
import { RoadmapTabs } from './roadmap/RoadmapTabs';
import { FeatureDetailPanel } from './roadmap/FeatureDetailPanel';
import {
  useRoadmapData,
  useFeatureActions,
  useRoadmapGeneration,
  useRoadmapSave,
  useFeatureDelete,
} from './roadmap/hooks';
import { getCompetitorInsightsForFeature } from './roadmap/utils';
import { useTextTranslation, type TranslationEntry } from '../hooks/useTextTranslation';
import { toast } from '../hooks/use-toast';
import type { CompetitorAnalysis, Roadmap as RoadmapModel, RoadmapFeature } from '../../shared/types';
import type { RoadmapProps } from './roadmap/types';

function collectRoadmapTranslationEntries(roadmap: RoadmapModel): TranslationEntry[] {
  const entries: TranslationEntry[] = [];

  if (roadmap.vision) {
    entries.push({ key: 'roadmap:vision', text: roadmap.vision });
  }

  if (roadmap.targetAudience.primary) {
    entries.push({ key: 'roadmap:targetAudience:primary', text: roadmap.targetAudience.primary });
  }

  roadmap.targetAudience.secondary.forEach((persona, index) => {
    entries.push({ key: `roadmap:targetAudience:secondary:${index}`, text: persona });
  });

  roadmap.targetAudience.painPoints?.forEach((painPoint, index) => {
    entries.push({ key: `roadmap:targetAudience:painPoints:${index}`, text: painPoint });
  });

  roadmap.targetAudience.goals?.forEach((goal, index) => {
    entries.push({ key: `roadmap:targetAudience:goals:${index}`, text: goal });
  });

  if (roadmap.targetAudience.usageContext) {
    entries.push({
      key: 'roadmap:targetAudience:usageContext',
      text: roadmap.targetAudience.usageContext,
    });
  }

  roadmap.phases.forEach((phase) => {
    entries.push({ key: `roadmap:phase:${phase.id}:name`, text: phase.name });
    entries.push({ key: `roadmap:phase:${phase.id}:description`, text: phase.description });

    phase.milestones.forEach((milestone) => {
      entries.push({ key: `roadmap:milestone:${milestone.id}:title`, text: milestone.title });
      entries.push({ key: `roadmap:milestone:${milestone.id}:description`, text: milestone.description });
    });
  });

  roadmap.features.forEach((feature) => {
    entries.push({ key: `roadmap:feature:${feature.id}:title`, text: feature.title });
    entries.push({ key: `roadmap:feature:${feature.id}:description`, text: feature.description });
    entries.push({ key: `roadmap:feature:${feature.id}:rationale`, text: feature.rationale });

    feature.userStories.forEach((story, index) => {
      entries.push({ key: `roadmap:feature:${feature.id}:userStory:${index}`, text: story });
    });

    feature.acceptanceCriteria.forEach((criterion, index) => {
      entries.push({ key: `roadmap:feature:${feature.id}:acceptance:${index}`, text: criterion });
    });
  });

  return entries;
}

function getTranslatedRoadmap(
  roadmap: RoadmapModel,
  getText: (key: string, fallback: string) => string
): RoadmapModel {
  return {
    ...roadmap,
    vision: getText('roadmap:vision', roadmap.vision),
    targetAudience: {
      ...roadmap.targetAudience,
      primary: getText('roadmap:targetAudience:primary', roadmap.targetAudience.primary),
      secondary: roadmap.targetAudience.secondary.map((persona, index) =>
        getText(`roadmap:targetAudience:secondary:${index}`, persona)
      ),
      painPoints: roadmap.targetAudience.painPoints?.map((painPoint, index) =>
        getText(`roadmap:targetAudience:painPoints:${index}`, painPoint)
      ),
      goals: roadmap.targetAudience.goals?.map((goal, index) =>
        getText(`roadmap:targetAudience:goals:${index}`, goal)
      ),
      usageContext: roadmap.targetAudience.usageContext
        ? getText('roadmap:targetAudience:usageContext', roadmap.targetAudience.usageContext)
        : roadmap.targetAudience.usageContext,
    },
    phases: roadmap.phases.map((phase) => ({
      ...phase,
      name: getText(`roadmap:phase:${phase.id}:name`, phase.name),
      description: getText(`roadmap:phase:${phase.id}:description`, phase.description),
      milestones: phase.milestones.map((milestone) => ({
        ...milestone,
        title: getText(`roadmap:milestone:${milestone.id}:title`, milestone.title),
        description: getText(
          `roadmap:milestone:${milestone.id}:description`,
          milestone.description
        ),
      })),
    })),
    features: roadmap.features.map((feature) => ({
      ...feature,
      title: getText(`roadmap:feature:${feature.id}:title`, feature.title),
      description: getText(`roadmap:feature:${feature.id}:description`, feature.description),
      rationale: getText(`roadmap:feature:${feature.id}:rationale`, feature.rationale),
      userStories: feature.userStories.map((story, index) =>
        getText(`roadmap:feature:${feature.id}:userStory:${index}`, story)
      ),
      acceptanceCriteria: feature.acceptanceCriteria.map((criterion, index) =>
        getText(`roadmap:feature:${feature.id}:acceptance:${index}`, criterion)
      ),
    })),
  };
}

function collectCompetitorAnalysisTranslationEntries(analysis: CompetitorAnalysis): TranslationEntry[] {
  const entries: TranslationEntry[] = [];

  entries.push({
    key: 'competitorAnalysis:projectContext:projectType',
    text: analysis.projectContext.projectType,
  });
  entries.push({
    key: 'competitorAnalysis:projectContext:targetAudience',
    text: analysis.projectContext.targetAudience,
  });

  analysis.competitors.forEach((competitor) => {
    if (competitor.description) {
      entries.push({
        key: `competitorAnalysis:competitor:${competitor.id}:description`,
        text: competitor.description,
      });
    }

    if (competitor.marketPosition) {
      entries.push({
        key: `competitorAnalysis:competitor:${competitor.id}:marketPosition`,
        text: competitor.marketPosition,
      });
    }

    competitor.strengths.forEach((strength, index) => {
      entries.push({
        key: `competitorAnalysis:competitor:${competitor.id}:strength:${index}`,
        text: strength,
      });
    });

    competitor.painPoints.forEach((painPoint) => {
      entries.push({
        key: `competitorAnalysis:painPoint:${painPoint.id}:description`,
        text: painPoint.description,
      });

      if (painPoint.source) {
        entries.push({
          key: `competitorAnalysis:painPoint:${painPoint.id}:source`,
          text: painPoint.source,
        });
      }

      if (painPoint.frequency) {
        entries.push({
          key: `competitorAnalysis:painPoint:${painPoint.id}:frequency`,
          text: painPoint.frequency,
        });
      }

      if (painPoint.opportunity) {
        entries.push({
          key: `competitorAnalysis:painPoint:${painPoint.id}:opportunity`,
          text: painPoint.opportunity,
        });
      }
    });
  });

  analysis.marketGaps.forEach((marketGap) => {
    entries.push({
      key: `competitorAnalysis:marketGap:${marketGap.id}:description`,
      text: marketGap.description,
    });
    entries.push({
      key: `competitorAnalysis:marketGap:${marketGap.id}:suggestedFeature`,
      text: marketGap.suggestedFeature,
    });
  });

  analysis.insightsSummary.topPainPoints.forEach((item, index) => {
    entries.push({ key: `competitorAnalysis:summary:topPainPoints:${index}`, text: item });
  });
  analysis.insightsSummary.differentiatorOpportunities.forEach((item, index) => {
    entries.push({
      key: `competitorAnalysis:summary:differentiatorOpportunities:${index}`,
      text: item,
    });
  });
  analysis.insightsSummary.marketTrends.forEach((item, index) => {
    entries.push({ key: `competitorAnalysis:summary:marketTrends:${index}`, text: item });
  });

  analysis.researchMetadata.searchQueriesUsed.forEach((item, index) => {
    entries.push({ key: `competitorAnalysis:research:searchQueries:${index}`, text: item });
  });
  analysis.researchMetadata.limitations.forEach((item, index) => {
    entries.push({ key: `competitorAnalysis:research:limitations:${index}`, text: item });
  });

  return entries;
}

function getTranslatedCompetitorAnalysis(
  analysis: CompetitorAnalysis,
  getText: (key: string, fallback: string) => string
): CompetitorAnalysis {
  return {
    ...analysis,
    projectContext: {
      ...analysis.projectContext,
      projectType: getText(
        'competitorAnalysis:projectContext:projectType',
        analysis.projectContext.projectType
      ),
      targetAudience: getText(
        'competitorAnalysis:projectContext:targetAudience',
        analysis.projectContext.targetAudience
      ),
    },
    competitors: analysis.competitors.map((competitor) => ({
      ...competitor,
      description: competitor.description
        ? getText(
            `competitorAnalysis:competitor:${competitor.id}:description`,
            competitor.description
          )
        : competitor.description,
      marketPosition: competitor.marketPosition
        ? getText(
            `competitorAnalysis:competitor:${competitor.id}:marketPosition`,
            competitor.marketPosition
          )
        : competitor.marketPosition,
      strengths: competitor.strengths.map((strength, index) =>
        getText(`competitorAnalysis:competitor:${competitor.id}:strength:${index}`, strength)
      ),
      painPoints: competitor.painPoints.map((painPoint) => ({
        ...painPoint,
        description: getText(
          `competitorAnalysis:painPoint:${painPoint.id}:description`,
          painPoint.description
        ),
        source: painPoint.source
          ? getText(`competitorAnalysis:painPoint:${painPoint.id}:source`, painPoint.source)
          : painPoint.source,
        frequency: painPoint.frequency
          ? getText(`competitorAnalysis:painPoint:${painPoint.id}:frequency`, painPoint.frequency)
          : painPoint.frequency,
        opportunity: painPoint.opportunity
          ? getText(
              `competitorAnalysis:painPoint:${painPoint.id}:opportunity`,
              painPoint.opportunity
            )
          : painPoint.opportunity,
      })),
    })),
    marketGaps: analysis.marketGaps.map((marketGap) => ({
      ...marketGap,
      description: getText(
        `competitorAnalysis:marketGap:${marketGap.id}:description`,
        marketGap.description
      ),
      suggestedFeature: getText(
        `competitorAnalysis:marketGap:${marketGap.id}:suggestedFeature`,
        marketGap.suggestedFeature
      ),
    })),
    insightsSummary: {
      ...analysis.insightsSummary,
      topPainPoints: analysis.insightsSummary.topPainPoints.map((item, index) =>
        getText(`competitorAnalysis:summary:topPainPoints:${index}`, item)
      ),
      differentiatorOpportunities: analysis.insightsSummary.differentiatorOpportunities.map(
        (item, index) =>
          getText(`competitorAnalysis:summary:differentiatorOpportunities:${index}`, item)
      ),
      marketTrends: analysis.insightsSummary.marketTrends.map((item, index) =>
        getText(`competitorAnalysis:summary:marketTrends:${index}`, item)
      ),
    },
    researchMetadata: {
      ...analysis.researchMetadata,
      searchQueriesUsed: analysis.researchMetadata.searchQueriesUsed.map((item, index) =>
        getText(`competitorAnalysis:research:searchQueries:${index}`, item)
      ),
      limitations: analysis.researchMetadata.limitations.map((item, index) =>
        getText(`competitorAnalysis:research:limitations:${index}`, item)
      ),
    },
  };
}

export function Roadmap({ projectId, onGoToTask }: RoadmapProps) {
  const { t, i18n } = useTranslation('roadmap');
  const isPortugueseUi = i18n.resolvedLanguage === 'pt';

  // State management
  const [selectedFeature, setSelectedFeature] = useState<RoadmapFeature | null>(null);
  const [activeTab, setActiveTab] = useState('kanban');
  const [showAddFeatureDialog, setShowAddFeatureDialog] = useState(false);
  const [showCompetitorViewer, setShowCompetitorViewer] = useState(false);
  const [pendingArchiveFeatureId, setPendingArchiveFeatureId] = useState<string | null>(null);

  const {
    isEnabled: isTranslationEnabled,
    isTranslating,
    lastError,
    toggleEnabled: toggleTranslation,
    clearError: clearTranslationError,
    getText: getTranslatedText,
    ensureTranslations,
  } = useTextTranslation('pt');

  const {
    isEnabled: isTranslationEnabled,
    isTranslating,
    lastError,
    toggleEnabled: toggleTranslation,
    clearError: clearTranslationError,
    getText: getTranslatedText,
    ensureTranslations,
  } = useTextTranslation('pt');

  // Custom hooks
  const { roadmap, competitorAnalysis, generationStatus } = useRoadmapData(projectId);
  const { convertFeatureToSpec } = useFeatureActions();
  const { saveRoadmap } = useRoadmapSave(projectId);
  const { deleteFeature } = useFeatureDelete(projectId);
  const {
    competitorAnalysisDate,
    // New dialog for existing analysis
    showExistingAnalysisDialog,
    setShowExistingAnalysisDialog,
    handleUseExistingAnalysis,
    handleRunNewAnalysis,
    handleSkipAnalysis,
    // Original dialog for no existing analysis
    showCompetitorDialog,
    setShowCompetitorDialog,
    handleGenerate,
    handleRefresh,
    handleCompetitorDialogAccept,
    handleCompetitorDialogDecline,
    handleStop,
  } = useRoadmapGeneration(projectId);

  const translationEntries = useMemo(() => {
    if (!isPortugueseUi || !isTranslationEnabled || !roadmap) {
      return [];
    }

    const deduplicatedEntries = new Map<string, string>();

    collectRoadmapTranslationEntries(roadmap).forEach((entry) => {
      deduplicatedEntries.set(entry.key, entry.text);
    });

    if (competitorAnalysis) {
      collectCompetitorAnalysisTranslationEntries(competitorAnalysis).forEach((entry) => {
        deduplicatedEntries.set(entry.key, entry.text);
      });
    }

    return Array.from(deduplicatedEntries.entries()).map(([key, text]) => ({ key, text }));
  }, [isPortugueseUi, isTranslationEnabled, roadmap, competitorAnalysis]);

  useEffect(() => {
    if (!isTranslationEnabled) {
      return;
    }

    void ensureTranslations(translationEntries);
  }, [isTranslationEnabled, ensureTranslations, translationEntries]);

  useEffect(() => {
    if (!lastError) {
      return;
    }

    toast({
      variant: 'destructive',
      title: t('header.translation.errorTitle'),
      description: t('header.translation.errorDescription'),
    });
    clearTranslationError();
  }, [lastError, clearTranslationError, t]);

  const displayedRoadmap = useMemo(() => {
    if (!roadmap || !isTranslationEnabled) {
      return roadmap;
    }

    return getTranslatedRoadmap(roadmap, getTranslatedText);
  }, [roadmap, isTranslationEnabled, getTranslatedText]);

  const displayedCompetitorAnalysis = useMemo(() => {
    if (!competitorAnalysis || !isTranslationEnabled) {
      return competitorAnalysis;
    }

    return getTranslatedCompetitorAnalysis(competitorAnalysis, getTranslatedText);
  }, [competitorAnalysis, isTranslationEnabled, getTranslatedText]);

  const getOriginalFeatureById = useCallback(
    (featureId: string): RoadmapFeature | null => {
      if (!roadmap) {
        return null;
      }

      return roadmap.features.find((feature) => feature.id === featureId) ?? null;
    },
    [roadmap]
  );

  // Event handlers
  const handleConvertToSpec = async (feature: RoadmapFeature) => {
    const originalFeature = getOriginalFeatureById(feature.id) ?? feature;
    await convertFeatureToSpec(projectId, originalFeature, selectedFeature, setSelectedFeature);
  };

  const handleFeatureSelect = (feature: RoadmapFeature) => {
    const originalFeature = getOriginalFeatureById(feature.id) ?? feature;
    setSelectedFeature(originalFeature);
  };

  const displayedSelectedFeature = useMemo(() => {
    if (!selectedFeature || !displayedRoadmap || !isTranslationEnabled) {
      return selectedFeature;
    }

    return displayedRoadmap.features.find((feature) => feature.id === selectedFeature.id) ?? selectedFeature;
  }, [selectedFeature, displayedRoadmap, isTranslationEnabled]);

  const displayedCompetitorInsights = useMemo(() => {
    if (!displayedSelectedFeature) {
      return [];
    }

    return getCompetitorInsightsForFeature(
      displayedSelectedFeature,
      displayedCompetitorAnalysis ?? competitorAnalysis
    );
  }, [displayedSelectedFeature, displayedCompetitorAnalysis, competitorAnalysis]);

  const handleGoToTask = (specId: string) => {
    if (onGoToTask) {
      onGoToTask(specId);
    }
  };

  const handleArchiveFeature = (featureId: string) => {
    setPendingArchiveFeatureId(featureId);
  };

  const confirmArchiveFeature = async () => {
    if (!pendingArchiveFeatureId) return;
    try {
      await deleteFeature(pendingArchiveFeatureId);
      if (selectedFeature?.id === pendingArchiveFeatureId) {
        setSelectedFeature(null);
      }
    } finally {
      setPendingArchiveFeatureId(null);
    }
  };

  // Show generation progress
  if (generationStatus.phase !== 'idle' && generationStatus.phase !== 'complete') {
    return (
      <div className="flex h-full items-center justify-center">
        <RoadmapGenerationProgress
          generationStatus={generationStatus}
          className="w-full max-w-md"
          onStop={handleStop}
        />
      </div>
    );
  }

  // Show empty state
  if (!roadmap) {
    return (
      <>
        <RoadmapEmptyState onGenerate={handleGenerate} />
        {/* Dialog for projects WITHOUT existing competitor analysis */}
        <CompetitorAnalysisDialog
          open={showCompetitorDialog}
          onOpenChange={setShowCompetitorDialog}
          onAccept={handleCompetitorDialogAccept}
          onDecline={handleCompetitorDialogDecline}
          projectId={projectId}
        />
        {/* Dialog for projects WITH existing competitor analysis */}
        <ExistingCompetitorAnalysisDialog
          open={showExistingAnalysisDialog}
          onOpenChange={setShowExistingAnalysisDialog}
          onUseExisting={handleUseExistingAnalysis}
          onRunNew={handleRunNewAnalysis}
          onSkip={handleSkipAnalysis}
          analysisDate={competitorAnalysisDate}
          projectId={projectId}
        />
      </>
    );
  }

  const roadmapForDisplay = displayedRoadmap ?? roadmap;

  // Main roadmap view
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <RoadmapHeader
        roadmap={roadmapForDisplay}
        competitorAnalysis={displayedCompetitorAnalysis}
        onAddFeature={() => setShowAddFeatureDialog(true)}
        onRefresh={handleRefresh}
        onViewCompetitorAnalysis={() => setShowCompetitorViewer(true)}
        showTranslateToggle={isPortugueseUi}
        isTranslateEnabled={isTranslationEnabled}
        isTranslating={isTranslating}
        onToggleTranslate={toggleTranslation}
      />

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <RoadmapTabs
          roadmap={roadmapForDisplay}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onFeatureSelect={handleFeatureSelect}
          onConvertToSpec={handleConvertToSpec}
          onGoToTask={handleGoToTask}
          onSave={saveRoadmap}
          onArchive={handleArchiveFeature}
        />
      </div>

      {/* Feature Detail Panel */}
      {displayedSelectedFeature && (
        <FeatureDetailPanel
          feature={displayedSelectedFeature}
          onClose={() => setSelectedFeature(null)}
          onConvertToSpec={handleConvertToSpec}
          onGoToTask={handleGoToTask}
          onDelete={deleteFeature}
          competitorInsights={displayedCompetitorInsights}
        />
      )}

      {/* Competitor Analysis Permission Dialog (no existing analysis) */}
      <CompetitorAnalysisDialog
        open={showCompetitorDialog}
        onOpenChange={setShowCompetitorDialog}
        onAccept={handleCompetitorDialogAccept}
        onDecline={handleCompetitorDialogDecline}
        projectId={projectId}
      />

      {/* Competitor Analysis Options Dialog (existing analysis) */}
      <ExistingCompetitorAnalysisDialog
        open={showExistingAnalysisDialog}
        onOpenChange={setShowExistingAnalysisDialog}
        onUseExisting={handleUseExistingAnalysis}
        onRunNew={handleRunNewAnalysis}
        onSkip={handleSkipAnalysis}
        analysisDate={competitorAnalysisDate}
        projectId={projectId}
      />

      {/* Competitor Analysis Viewer */}
      <CompetitorAnalysisViewer
        analysis={displayedCompetitorAnalysis}
        open={showCompetitorViewer}
        onOpenChange={setShowCompetitorViewer}
        projectId={projectId}
      />

      {/* Add Feature Dialog */}
      <AddFeatureDialog
        phases={roadmapForDisplay.phases}
        open={showAddFeatureDialog}
        onOpenChange={setShowAddFeatureDialog}
      />

      {/* Archive Confirmation Dialog */}
      <AlertDialog
        open={!!pendingArchiveFeatureId}
        onOpenChange={(open) => { if (!open) setPendingArchiveFeatureId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-muted-foreground" />
              <AlertDialogTitle>{t('roadmap.archiveFeatureConfirmTitle')}</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              {t('roadmap.archiveFeatureConfirmDescription', {
                title: pendingArchiveFeatureId
                  ? roadmap.features.find((f) => f.id === pendingArchiveFeatureId)?.title ?? ''
                  : '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmArchiveFeature}>
              {t('roadmap.archiveFeature')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
