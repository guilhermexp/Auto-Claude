/**
 * Severity configuration for PR review findings
 */

import {
  XCircle,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Shield,
  Code,
  FileText,
  TestTube,
  Zap,
} from 'lucide-react';

export type SeverityGroup = 'critical' | 'high' | 'medium' | 'low';

export const SEVERITY_ORDER: SeverityGroup[] = ['critical', 'high', 'medium', 'low'];

export const SEVERITY_CONFIG: Record<SeverityGroup, {
  labelKey: string;
  color: string;
  bgColor: string;
  icon: typeof XCircle;
  descriptionKey: string;
}> = {
  critical: {
    labelKey: 'prReview.severity.critical',
    color: 'github-pr-severity-critical-text',
    bgColor: 'github-pr-severity-critical-surface',
    icon: XCircle,
    descriptionKey: 'prReview.severity.criticalDesc',
  },
  high: {
    labelKey: 'prReview.severity.high',
    color: 'github-pr-severity-high-text',
    bgColor: 'github-pr-severity-high-surface',
    icon: AlertTriangle,
    descriptionKey: 'prReview.severity.highDesc',
  },
  medium: {
    labelKey: 'prReview.severity.medium',
    color: 'github-pr-severity-medium-text',
    bgColor: 'github-pr-severity-medium-surface',
    icon: AlertCircle,
    descriptionKey: 'prReview.severity.mediumDesc',
  },
  low: {
    labelKey: 'prReview.severity.low',
    color: 'github-pr-severity-low-text',
    bgColor: 'github-pr-severity-low-surface',
    icon: CheckCircle,
    descriptionKey: 'prReview.severity.lowDesc',
  },
};

export const CATEGORY_ICONS: Record<string, typeof Shield> = {
  security: Shield,
  quality: Code,
  docs: FileText,
  test: TestTube,
  performance: Zap,
  style: Code,
  pattern: Code,
  logic: AlertCircle,
};

export function getCategoryIcon(category: string) {
  return CATEGORY_ICONS[category] || Code;
}
