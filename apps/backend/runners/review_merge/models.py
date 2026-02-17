"""
Data models for the Review & Merge pipeline.
"""

from dataclasses import dataclass, field


@dataclass
class ReviewFinding:
    """A single finding from CodeRabbit review."""

    file: str
    line: int | None
    severity: str  # critical, high, medium, low
    description: str
    suggestion: str | None = None
    fixed: bool = False


@dataclass
class ReviewFindings:
    """Aggregated findings from a CodeRabbit review run."""

    findings: list[ReviewFinding] = field(default_factory=list)
    raw_output: str = ""

    def has_critical_issues(self) -> bool:
        """Return True if there are unfixed critical or high severity findings."""
        return any(
            f.severity in ("critical", "high") and not f.fixed for f in self.findings
        )

    @property
    def critical_count(self) -> int:
        return sum(1 for f in self.findings if f.severity == "critical" and not f.fixed)

    @property
    def high_count(self) -> int:
        return sum(1 for f in self.findings if f.severity == "high" and not f.fixed)

    @property
    def medium_count(self) -> int:
        return sum(1 for f in self.findings if f.severity == "medium" and not f.fixed)

    @property
    def low_count(self) -> int:
        return sum(1 for f in self.findings if f.severity == "low" and not f.fixed)

    def summary(self) -> str:
        parts = []
        if self.critical_count:
            parts.append(f"{self.critical_count} critical")
        if self.high_count:
            parts.append(f"{self.high_count} high")
        if self.medium_count:
            parts.append(f"{self.medium_count} medium")
        if self.low_count:
            parts.append(f"{self.low_count} low")
        return ", ".join(parts) if parts else "no issues"


@dataclass
class ReviewMergeResult:
    """Result of the complete Review & Merge pipeline."""

    success: bool
    message: str
    pr_url: str | None = None
    iterations_used: int = 0
    findings_summary: str | None = None
    remaining_issues: list[ReviewFinding] | None = None
