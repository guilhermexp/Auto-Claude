import {
  Server,
  Globe,
  Cog,
  Code,
  Package,
  GitBranch,
  FileCode,
  Lightbulb,
  FolderTree,
  AlertTriangle,
  Smartphone,
  Monitor,
  GitPullRequest,
  Bug,
  Sparkles,
  Target
} from 'lucide-react';

// Service type icon mapping
export const serviceTypeIcons: Record<string, React.ElementType> = {
  backend: Server,
  frontend: Globe,
  worker: Cog,
  scraper: Code,
  library: Package,
  proxy: GitBranch,
  mobile: Smartphone,
  desktop: Monitor,
  unknown: FileCode
};

// Service type color mapping
export const serviceTypeColors: Record<string, string> = {
  backend: 'context-chip-info',
  frontend: 'context-chip-purple',
  worker: 'context-chip-warning',
  scraper: 'context-chip-success',
  library: 'context-chip-muted',
  proxy: 'context-chip-cyan',
  mobile: 'context-chip-orange',
  desktop: 'context-chip-blue',
  unknown: 'context-chip-neutral'
};

// Memory type icon mapping
export const memoryTypeIcons: Record<string, React.ElementType> = {
  session_insight: Lightbulb,
  codebase_discovery: FolderTree,
  codebase_map: FolderTree,
  pattern: Code,
  gotcha: AlertTriangle,
  task_outcome: Target,
  qa_result: Target,
  historical_context: Lightbulb,
  pr_review: GitPullRequest,
  pr_finding: Bug,
  pr_pattern: Sparkles,
  pr_gotcha: AlertTriangle
};

// Memory type colors for badges and styling
export const memoryTypeColors: Record<string, string> = {
  session_insight: 'context-chip-warning',
  codebase_discovery: 'context-chip-blue',
  codebase_map: 'context-chip-blue',
  pattern: 'context-chip-purple',
  gotcha: 'context-chip-danger',
  task_outcome: 'context-chip-success',
  qa_result: 'context-chip-teal',
  historical_context: 'context-chip-muted',
  pr_review: 'context-chip-cyan',
  pr_finding: 'context-chip-orange',
  pr_pattern: 'context-chip-purple',
  pr_gotcha: 'context-chip-danger'
};

// Memory type labels for display
export const memoryTypeLabels: Record<string, string> = {
  session_insight: 'memoryTypes.session_insight',
  codebase_discovery: 'memoryTypes.codebase_discovery',
  codebase_map: 'memoryTypes.codebase_map',
  pattern: 'memoryTypes.pattern',
  gotcha: 'memoryTypes.gotcha',
  task_outcome: 'memoryTypes.task_outcome',
  qa_result: 'memoryTypes.qa_result',
  historical_context: 'memoryTypes.historical_context',
  pr_review: 'memoryTypes.pr_review',
  pr_finding: 'memoryTypes.pr_finding',
  pr_pattern: 'memoryTypes.pr_pattern',
  pr_gotcha: 'memoryTypes.pr_gotcha'
};

// Filter categories for grouping memory types
export const memoryFilterCategories = {
  all: { labelKey: 'filters.all', types: [] as string[] },
  pr: { labelKey: 'filters.pr', types: ['pr_review', 'pr_finding', 'pr_pattern', 'pr_gotcha'] },
  sessions: { labelKey: 'filters.sessions', types: ['session_insight', 'task_outcome', 'qa_result', 'historical_context'] },
  codebase: { labelKey: 'filters.codebase', types: ['codebase_discovery', 'codebase_map'] },
  patterns: { labelKey: 'filters.patterns', types: ['pattern', 'pr_pattern'] },
  gotchas: { labelKey: 'filters.gotchas', types: ['gotcha', 'pr_gotcha'] }
};
