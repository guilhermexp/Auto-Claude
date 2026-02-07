/**
 * Roadmap-related constants
 * Feature priority, complexity, and impact indicators
 */

// ============================================
// Roadmap Priority
// ============================================

export const ROADMAP_PRIORITY_LABELS: Record<string, string> = {
  must: 'Must Have',
  should: 'Should Have',
  could: 'Could Have',
  wont: "Won't Have"
};

export const ROADMAP_PRIORITY_COLORS: Record<string, string> = {
  must: 'roadmap-chip roadmap-chip-must',
  should: 'roadmap-chip roadmap-chip-should',
  could: 'roadmap-chip roadmap-chip-could',
  wont: 'roadmap-chip roadmap-chip-wont'
};

// ============================================
// Roadmap Complexity
// ============================================

export const ROADMAP_COMPLEXITY_COLORS: Record<string, string> = {
  low: 'roadmap-chip roadmap-chip-complexity-low',
  medium: 'roadmap-chip roadmap-chip-complexity-medium',
  high: 'roadmap-chip roadmap-chip-complexity-high'
};

// ============================================
// Roadmap Impact
// ============================================

export const ROADMAP_IMPACT_COLORS: Record<string, string> = {
  low: 'roadmap-chip roadmap-chip-impact-low',
  medium: 'roadmap-chip roadmap-chip-impact-medium',
  high: 'roadmap-chip roadmap-chip-impact-high'
};

// ============================================
// Roadmap Status (for Kanban columns)
// ============================================

export interface RoadmapStatusColumn {
  id: string;
  label: string;
  color: string;
  icon: string;
}

export const ROADMAP_STATUS_COLUMNS: RoadmapStatusColumn[] = [
  { id: 'under_review', label: 'Under Review', color: 'border-t-muted-foreground/50', icon: 'Eye' },
  { id: 'planned', label: 'Planned', color: 'border-t-info', icon: 'Calendar' },
  { id: 'in_progress', label: 'In Progress', color: 'border-t-primary', icon: 'Play' },
  { id: 'done', label: 'Done', color: 'border-t-success', icon: 'Check' }
];

export const ROADMAP_STATUS_LABELS: Record<string, string> = {
  under_review: 'Under Review',
  planned: 'Planned',
  in_progress: 'In Progress',
  done: 'Done'
};

export const ROADMAP_STATUS_COLORS: Record<string, string> = {
  under_review: 'bg-muted text-muted-foreground',
  planned: 'bg-info/10 text-info',
  in_progress: 'bg-primary/10 text-primary',
  done: 'bg-success/10 text-success'
};
