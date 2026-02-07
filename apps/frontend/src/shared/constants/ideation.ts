/**
 * Ideation-related constants
 * Types, categories, and configuration for AI-generated project improvements
 */

// ============================================
// Ideation Types
// ============================================

// Ideation type labels and descriptions
// Note: high_value_features removed - strategic features belong to Roadmap
// low_hanging_fruit renamed to code_improvements to cover all code-revealed opportunities
export const IDEATION_TYPE_LABELS: Record<string, string> = {
  code_improvements: 'Code Improvements',
  ui_ux_improvements: 'UI/UX Improvements',
  documentation_gaps: 'Documentation',
  security_hardening: 'Security',
  performance_optimizations: 'Performance',
  code_quality: 'Code Quality'
};

export const IDEATION_TYPE_DESCRIPTIONS: Record<string, string> = {
  code_improvements: 'Code-revealed opportunities from patterns, architecture, and infrastructure analysis',
  ui_ux_improvements: 'Visual and interaction improvements identified through app analysis',
  documentation_gaps: 'Missing or outdated documentation that needs attention',
  security_hardening: 'Security vulnerabilities and hardening opportunities',
  performance_optimizations: 'Performance bottlenecks and optimization opportunities',
  code_quality: 'Refactoring opportunities, large files, code smells, and best practice violations'
};

// Ideation type colors
export const IDEATION_TYPE_COLORS: Record<string, string> = {
  code_improvements: 'ideation-tone-code',
  ui_ux_improvements: 'ideation-tone-uiux',
  documentation_gaps: 'ideation-tone-docs',
  security_hardening: 'ideation-tone-security',
  performance_optimizations: 'ideation-tone-performance',
  code_quality: 'ideation-tone-quality'
};

// Ideation type icons (Lucide icon names)
export const IDEATION_TYPE_ICONS: Record<string, string> = {
  code_improvements: 'Zap',
  ui_ux_improvements: 'Palette',
  documentation_gaps: 'BookOpen',
  security_hardening: 'Shield',
  performance_optimizations: 'Gauge',
  code_quality: 'Code2'
};

// ============================================
// Ideation Status
// ============================================

export const IDEATION_STATUS_COLORS: Record<string, string> = {
  draft: 'ideation-tone-neutral',
  selected: 'ideation-tone-selected',
  converted: 'ideation-tone-converted',
  dismissed: 'ideation-tone-dismissed line-through',
  archived: 'ideation-tone-archived'
};

// ============================================
// Ideation Effort/Complexity
// ============================================

// Ideation effort colors (full spectrum for code_improvements)
export const IDEATION_EFFORT_COLORS: Record<string, string> = {
  trivial: 'ideation-tone-effort-trivial',
  small: 'ideation-tone-effort-small',
  medium: 'ideation-tone-effort-medium',
  large: 'ideation-tone-effort-large',
  complex: 'ideation-tone-effort-complex'
};

// ============================================
// Ideation Impact
// ============================================

export const IDEATION_IMPACT_COLORS: Record<string, string> = {
  low: 'ideation-tone-impact-low',
  medium: 'ideation-tone-impact-medium',
  high: 'ideation-tone-impact-high',
  critical: 'ideation-tone-impact-critical'
};

// ============================================
// Category-Specific Labels
// ============================================

// Security severity colors
export const SECURITY_SEVERITY_COLORS: Record<string, string> = {
  low: 'ideation-tone-severity-low',
  medium: 'ideation-tone-severity-medium',
  high: 'ideation-tone-severity-high',
  critical: 'ideation-tone-severity-critical'
};

// UI/UX category labels
export const UIUX_CATEGORY_LABELS: Record<string, string> = {
  usability: 'Usability',
  accessibility: 'Accessibility',
  performance: 'Performance',
  visual: 'Visual Design',
  interaction: 'Interaction'
};

// Documentation category labels
export const DOCUMENTATION_CATEGORY_LABELS: Record<string, string> = {
  readme: 'README',
  api_docs: 'API Documentation',
  inline_comments: 'Inline Comments',
  examples: 'Examples & Tutorials',
  architecture: 'Architecture Docs',
  troubleshooting: 'Troubleshooting Guide'
};

// Security category labels
export const SECURITY_CATEGORY_LABELS: Record<string, string> = {
  authentication: 'Authentication',
  authorization: 'Authorization',
  input_validation: 'Input Validation',
  data_protection: 'Data Protection',
  dependencies: 'Dependencies',
  configuration: 'Configuration',
  secrets_management: 'Secrets Management'
};

// Performance category labels
export const PERFORMANCE_CATEGORY_LABELS: Record<string, string> = {
  bundle_size: 'Bundle Size',
  runtime: 'Runtime Performance',
  memory: 'Memory Usage',
  database: 'Database Queries',
  network: 'Network Requests',
  rendering: 'Rendering',
  caching: 'Caching'
};

// Code quality category labels
export const CODE_QUALITY_CATEGORY_LABELS: Record<string, string> = {
  large_files: 'Large Files',
  code_smells: 'Code Smells',
  complexity: 'High Complexity',
  duplication: 'Code Duplication',
  naming: 'Naming Conventions',
  structure: 'File Structure',
  linting: 'Linting Issues',
  testing: 'Test Coverage',
  types: 'Type Safety',
  dependencies: 'Dependency Issues',
  dead_code: 'Dead Code',
  git_hygiene: 'Git Hygiene'
};

// Code quality severity colors
export const CODE_QUALITY_SEVERITY_COLORS: Record<string, string> = {
  suggestion: 'ideation-tone-quality-suggestion',
  minor: 'ideation-tone-quality-minor',
  major: 'ideation-tone-quality-major',
  critical: 'ideation-tone-quality-critical'
};

// ============================================
// Default Configuration
// ============================================

// Default ideation config
// Note: high_value_features removed, low_hanging_fruit renamed to code_improvements
export const DEFAULT_IDEATION_CONFIG = {
  enabledTypes: ['code_improvements', 'ui_ux_improvements', 'security_hardening'] as const,
  includeRoadmapContext: true,
  includeKanbanContext: true,
  maxIdeasPerType: 5
};
