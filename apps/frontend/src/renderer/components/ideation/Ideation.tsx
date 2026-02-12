import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TabsContent } from '../ui/tabs';
import { EnvConfigModal } from '../EnvConfigModal';
import { IdeationEmptyState } from './IdeationEmptyState';
import { IdeationHeader } from './IdeationHeader';
import { IdeationFilters } from './IdeationFilters';
import { IdeationDialogs } from './IdeationDialogs';
import { GenerationProgressScreen } from './GenerationProgressScreen';
import { IdeaCard } from './IdeaCard';
import { IdeaDetailPanel } from './IdeaDetailPanel';
import { useIdeation } from './hooks/useIdeation';
import { useViewState } from '../../contexts/ViewStateContext';
import { ALL_IDEATION_TYPES } from './constants';
import type { Idea } from '../../../shared/types';
import { useTextTranslation, type TranslationEntry } from '../../hooks/useTextTranslation';
import { toast } from '../../hooks/use-toast';

interface IdeationProps {
  projectId: string;
  onGoToTask?: (taskId: string) => void;
}

function collectIdeaTranslationEntries(idea: Idea): TranslationEntry[] {
  const entries: TranslationEntry[] = [
    { key: `${idea.id}:title`, text: idea.title },
    { key: `${idea.id}:description`, text: idea.description },
    { key: `${idea.id}:rationale`, text: idea.rationale },
  ]

  if ('implementationApproach' in idea && idea.implementationApproach) {
    entries.push({
      key: `${idea.id}:implementationApproach`,
      text: idea.implementationApproach,
    })
  }

  if ('buildsUpon' in idea && Array.isArray(idea.buildsUpon)) {
    idea.buildsUpon.forEach((item, index) => {
      entries.push({ key: `${idea.id}:buildsUpon:${index}`, text: item })
    })
  }

  if ('existingPatterns' in idea && Array.isArray(idea.existingPatterns)) {
    idea.existingPatterns.forEach((item, index) => {
      entries.push({ key: `${idea.id}:existingPatterns:${index}`, text: item })
    })
  }

  if ('currentState' in idea && idea.currentState) {
    entries.push({ key: `${idea.id}:currentState`, text: idea.currentState })
  }

  if ('proposedChange' in idea && idea.proposedChange) {
    entries.push({ key: `${idea.id}:proposedChange`, text: idea.proposedChange })
  }

  if ('userBenefit' in idea && idea.userBenefit) {
    entries.push({ key: `${idea.id}:userBenefit`, text: idea.userBenefit })
  }

  if ('currentDocumentation' in idea && idea.currentDocumentation) {
    entries.push({
      key: `${idea.id}:currentDocumentation`,
      text: idea.currentDocumentation,
    })
  }

  if ('proposedContent' in idea && idea.proposedContent) {
    entries.push({ key: `${idea.id}:proposedContent`, text: idea.proposedContent })
  }

  if ('vulnerability' in idea && idea.vulnerability) {
    entries.push({ key: `${idea.id}:vulnerability`, text: idea.vulnerability })
  }

  if ('currentRisk' in idea && idea.currentRisk) {
    entries.push({ key: `${idea.id}:currentRisk`, text: idea.currentRisk })
  }

  if ('remediation' in idea && idea.remediation) {
    entries.push({ key: `${idea.id}:remediation`, text: idea.remediation })
  }

  if ('currentMetric' in idea && idea.currentMetric) {
    entries.push({ key: `${idea.id}:currentMetric`, text: idea.currentMetric })
  }

  if ('expectedImprovement' in idea && idea.expectedImprovement) {
    entries.push({
      key: `${idea.id}:expectedImprovement`,
      text: idea.expectedImprovement,
    })
  }

  if ('implementation' in idea && idea.implementation) {
    entries.push({ key: `${idea.id}:implementation`, text: idea.implementation })
  }

  if ('tradeoffs' in idea && idea.tradeoffs) {
    entries.push({ key: `${idea.id}:tradeoffs`, text: idea.tradeoffs })
  }

  if ('bestPractice' in idea && idea.bestPractice) {
    entries.push({ key: `${idea.id}:bestPractice`, text: idea.bestPractice })
  }

  if ('prerequisites' in idea && Array.isArray(idea.prerequisites)) {
    idea.prerequisites.forEach((item, index) => {
      entries.push({ key: `${idea.id}:prerequisites:${index}`, text: item })
    })
  }

  return entries
}

function getTranslatedIdea(idea: Idea, getText: (key: string, fallback: string) => string): Idea {
  const translatedIdea = {
    ...idea,
    title: getText(`${idea.id}:title`, idea.title),
    description: getText(`${idea.id}:description`, idea.description),
    rationale: getText(`${idea.id}:rationale`, idea.rationale),
  } as Idea

  if ('implementationApproach' in translatedIdea && translatedIdea.implementationApproach) {
    translatedIdea.implementationApproach = getText(
      `${idea.id}:implementationApproach`,
      translatedIdea.implementationApproach
    )
  }

  if ('buildsUpon' in translatedIdea) {
    translatedIdea.buildsUpon = translatedIdea.buildsUpon.map((item, index) =>
      getText(`${idea.id}:buildsUpon:${index}`, item)
    )
  }

  if ('existingPatterns' in translatedIdea) {
    translatedIdea.existingPatterns = translatedIdea.existingPatterns.map((item, index) =>
      getText(`${idea.id}:existingPatterns:${index}`, item)
    )
  }

  if ('currentState' in translatedIdea && translatedIdea.currentState) {
    translatedIdea.currentState = getText(
      `${idea.id}:currentState`,
      translatedIdea.currentState
    )
  }

  if ('proposedChange' in translatedIdea && translatedIdea.proposedChange) {
    translatedIdea.proposedChange = getText(
      `${idea.id}:proposedChange`,
      translatedIdea.proposedChange
    )
  }

  if ('userBenefit' in translatedIdea && translatedIdea.userBenefit) {
    translatedIdea.userBenefit = getText(`${idea.id}:userBenefit`, translatedIdea.userBenefit)
  }

  if ('currentDocumentation' in translatedIdea && translatedIdea.currentDocumentation) {
    translatedIdea.currentDocumentation = getText(
      `${idea.id}:currentDocumentation`,
      translatedIdea.currentDocumentation
    )
  }

  if ('proposedContent' in translatedIdea) {
    translatedIdea.proposedContent = getText(
      `${idea.id}:proposedContent`,
      translatedIdea.proposedContent
    )
  }

  if ('vulnerability' in translatedIdea && translatedIdea.vulnerability) {
    translatedIdea.vulnerability = getText(
      `${idea.id}:vulnerability`,
      translatedIdea.vulnerability
    )
  }

  if ('currentRisk' in translatedIdea) {
    translatedIdea.currentRisk = getText(`${idea.id}:currentRisk`, translatedIdea.currentRisk)
  }

  if ('remediation' in translatedIdea) {
    translatedIdea.remediation = getText(`${idea.id}:remediation`, translatedIdea.remediation)
  }

  if ('currentMetric' in translatedIdea && translatedIdea.currentMetric) {
    translatedIdea.currentMetric = getText(
      `${idea.id}:currentMetric`,
      translatedIdea.currentMetric
    )
  }

  if ('expectedImprovement' in translatedIdea) {
    translatedIdea.expectedImprovement = getText(
      `${idea.id}:expectedImprovement`,
      translatedIdea.expectedImprovement
    )
  }

  if ('implementation' in translatedIdea) {
    translatedIdea.implementation = getText(
      `${idea.id}:implementation`,
      translatedIdea.implementation
    )
  }

  if ('tradeoffs' in translatedIdea && translatedIdea.tradeoffs) {
    translatedIdea.tradeoffs = getText(`${idea.id}:tradeoffs`, translatedIdea.tradeoffs)
  }

  if ('bestPractice' in translatedIdea && translatedIdea.bestPractice) {
    translatedIdea.bestPractice = getText(
      `${idea.id}:bestPractice`,
      translatedIdea.bestPractice
    )
  }

  if ('prerequisites' in translatedIdea && Array.isArray(translatedIdea.prerequisites)) {
    translatedIdea.prerequisites = translatedIdea.prerequisites.map((item, index) =>
      getText(`${idea.id}:prerequisites:${index}`, item)
    )
  }

  return translatedIdea
}

export function Ideation({ projectId, onGoToTask }: IdeationProps) {
  const { t, i18n } = useTranslation('ideation');
  // Get showArchived from shared context for cross-page sync
  const { showArchived } = useViewState();
  const isPortugueseUi = i18n.resolvedLanguage === 'pt'
  const {
    isEnabled: isTranslationEnabled,
    isTranslating,
    lastError,
    toggleEnabled: toggleTranslation,
    clearError: clearTranslationError,
    getText: getTranslatedText,
    ensureTranslations,
  } = useTextTranslation('pt')

  // Pass showArchived directly to the hook to avoid render lag from useEffect sync
  const {
    session,
    generationStatus,
    isGenerating,
    config,
    logs,
    typeStates,
    selectedIdea,
    activeTab,
    showConfigDialog,
    showDismissed,
    showEnvConfigModal,
    showAddMoreDialog,
    typesToAdd,
    hasToken,
    isCheckingToken,
    summary,
    activeIdeas,
    selectedIds,
    convertingIdeas,
    setSelectedIdea,
    setActiveTab,
    setShowConfigDialog,
    setShowDismissed,
    setShowEnvConfigModal,
    setShowAddMoreDialog,
    setTypesToAdd,
    setConfig,
    handleGenerate,
    handleRefresh,
    handleStop,
    handleDismissAll,
    handleDeleteSelected,
    handleSelectAll,
    handleEnvConfigured,
    getAvailableTypesToAdd,
    handleAddMoreIdeas,
    toggleTypeToAdd,
    handleConvertToTask,
    handleGoToTask,
    handleDismiss,
    toggleIdeationType,
    toggleSelectIdea,
    clearSelection,
    getIdeasByType
  } = useIdeation(projectId, { onGoToTask, showArchived });

  const ideasForTranslation = useMemo(() => {
    const byId = new Map(activeIdeas.map((idea) => [idea.id, idea]))
    if (selectedIdea) {
      byId.set(selectedIdea.id, selectedIdea)
    }
    return Array.from(byId.values())
  }, [activeIdeas, selectedIdea])

  const translationEntries = useMemo(() => {
    if (!isPortugueseUi || !isTranslationEnabled) {
      return []
    }

    const deduplicatedEntries = new Map<string, string>()

    for (const idea of ideasForTranslation) {
      collectIdeaTranslationEntries(idea).forEach((entry) => {
        deduplicatedEntries.set(entry.key, entry.text)
      })
    }

    return Array.from(deduplicatedEntries.entries()).map(([key, text]) => ({ key, text }))
  }, [ideasForTranslation, isPortugueseUi, isTranslationEnabled])

  useEffect(() => {
    if (!isTranslationEnabled) {
      return
    }

    void ensureTranslations(translationEntries)
  }, [isTranslationEnabled, ensureTranslations, translationEntries])

  useEffect(() => {
    if (!lastError) {
      return
    }

    toast({
      variant: 'destructive',
      title: t('header.translation.errorTitle'),
      description: t('header.translation.errorDescription'),
    })
    clearTranslationError()
  }, [lastError, clearTranslationError, t])

  const displayedActiveIdeas = useMemo(
    () => activeIdeas.map((idea) => getTranslatedIdea(idea, getTranslatedText)),
    [activeIdeas, getTranslatedText]
  )

  const displayedSelectedIdea = useMemo(
    () => (selectedIdea ? getTranslatedIdea(selectedIdea, getTranslatedText) : null),
    [selectedIdea, getTranslatedText]
  )

  // Show generation progress with streaming ideas (use isGenerating flag for reliable state)
  if (isGenerating) {
    return (
      <GenerationProgressScreen
        generationStatus={generationStatus}
        logs={logs}
        typeStates={typeStates}
        enabledTypes={config.enabledTypes}
        session={session}
        onSelectIdea={setSelectedIdea}
        selectedIdea={selectedIdea}
        onConvert={handleConvertToTask}
        onGoToTask={handleGoToTask}
        onDismiss={handleDismiss}
        onStop={handleStop}
      />
    );
  }

  // Show empty state only when no session exists (first run)
  if (!session) {
    return (
      <>
        <IdeationEmptyState
          config={config}
          hasToken={hasToken}
          isCheckingToken={isCheckingToken}
          onGenerate={handleGenerate}
          onOpenConfig={() => setShowConfigDialog(true)}
          onToggleIdeationType={toggleIdeationType}
        />

        <IdeationDialogs
          showConfigDialog={showConfigDialog}
          showAddMoreDialog={false}
          config={config}
          typesToAdd={[]}
          availableTypesToAdd={[]}
          onToggleIdeationType={toggleIdeationType}
          onToggleTypeToAdd={() => {}}
          onSetConfig={setConfig}
          onCloseConfigDialog={() => setShowConfigDialog(false)}
          onCloseAddMoreDialog={() => {}}
          onConfirmAddMore={() => {}}
        />

        <EnvConfigModal
          open={showEnvConfigModal}
          onOpenChange={setShowEnvConfigModal}
          onConfigured={handleEnvConfigured}
          title={t('envConfig.title')}
          description={t('envConfig.description')}
          projectId={projectId}
        />
      </>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden worktrees-page">
      {/* Header */}
      <IdeationHeader
        totalIdeas={summary.totalIdeas}
        ideaCountByType={summary.byType}
        showDismissed={showDismissed}
        selectedCount={selectedIds.size}
        onToggleShowDismissed={() => setShowDismissed(!showDismissed)}
        onOpenConfig={() => setShowConfigDialog(true)}
        onOpenAddMore={() => {
          setTypesToAdd([]);
          setShowAddMoreDialog(true);
        }}
        onDismissAll={handleDismissAll}
        onDeleteSelected={handleDeleteSelected}
        onSelectAll={() => handleSelectAll(activeIdeas)}
        onClearSelection={clearSelection}
        onRefresh={handleRefresh}
        hasActiveIdeas={activeIdeas.length > 0}
        canAddMore={getAvailableTypesToAdd().length > 0}
        showTranslateToggle={isPortugueseUi}
        isTranslateEnabled={isTranslationEnabled}
        isTranslating={isTranslating}
        onToggleTranslate={toggleTranslation}
      />

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <IdeationFilters activeTab={activeTab} onTabChange={setActiveTab}>
          {/* All Ideas View */}
          <TabsContent value="all" className="flex-1 overflow-auto p-6 pt-4">
            <div className="grid gap-3">
              {displayedActiveIdeas.map((idea) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  isSelected={selectedIds.has(idea.id)}
                  onClick={() => setSelectedIdea(displayedSelectedIdea?.id === idea.id ? null : idea)}
                  onConvert={handleConvertToTask}
                  onGoToTask={handleGoToTask}
                  onDismiss={handleDismiss}
                  onToggleSelect={toggleSelectIdea}
                />
              ))}
              {activeIdeas.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {t('list.empty')}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Type-specific Views */}
            {ALL_IDEATION_TYPES.map((type) => {
            const typeIdeas = getIdeasByType(type).filter((idea) => {
              if (!showDismissed && idea.status === 'dismissed') return false;
              if (!showArchived && idea.status === 'archived') return false;
              return true;
            });
            const displayedTypeIdeas = typeIdeas.map((idea) =>
              getTranslatedIdea(idea, getTranslatedText)
            )
            return (
              <TabsContent key={type} value={type} className="flex-1 overflow-auto p-6 pt-4">
                <div className="mb-4 p-3 rounded-lg ideation-type-description">
                  <p className="text-sm text-muted-foreground">
                    {t(`typeDescriptions.${type}`)}
                  </p>
                </div>
                <div className="grid gap-3">
                  {displayedTypeIdeas.map((idea) => (
                    <IdeaCard
                      key={idea.id}
                      idea={idea}
                      isSelected={selectedIds.has(idea.id)}
                      onClick={() => setSelectedIdea(displayedSelectedIdea?.id === idea.id ? null : idea)}
                      onConvert={handleConvertToTask}
                      onGoToTask={handleGoToTask}
                      onDismiss={handleDismiss}
                      onToggleSelect={toggleSelectIdea}
                    />
                  ))}
                </div>
              </TabsContent>
            );
          })}
        </IdeationFilters>
      </div>

      {/* Idea Detail Panel */}
      {displayedSelectedIdea && (
        <IdeaDetailPanel
          idea={displayedSelectedIdea}
          onClose={() => setSelectedIdea(null)}
          onConvert={handleConvertToTask}
          onGoToTask={handleGoToTask}
          onDismiss={handleDismiss}
          isConverting={convertingIdeas.has(displayedSelectedIdea.id)}
        />
      )}

      {/* Dialogs */}
      <IdeationDialogs
        showConfigDialog={showConfigDialog}
        showAddMoreDialog={showAddMoreDialog}
        config={config}
        typesToAdd={typesToAdd}
        availableTypesToAdd={getAvailableTypesToAdd()}
        onToggleIdeationType={toggleIdeationType}
        onToggleTypeToAdd={toggleTypeToAdd}
        onSetConfig={setConfig}
        onCloseConfigDialog={() => setShowConfigDialog(false)}
        onCloseAddMoreDialog={() => setShowAddMoreDialog(false)}
        onConfirmAddMore={handleAddMoreIdeas}
      />

      {/* Environment Configuration Modal */}
      <EnvConfigModal
        open={showEnvConfigModal}
        onOpenChange={setShowEnvConfigModal}
        onConfigured={handleEnvConfigured}
        title={t('envConfig.title')}
        description={t('envConfig.description')}
        projectId={projectId}
      />
    </div>
  );
}
