"""
Data models for the Review & Merge pipeline.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path


@dataclass
class ReviewFinding:
    """A single finding from CodeRabbit review."""

    file: str
    line: int | None
    severity: str  # critical, high, medium, low
    description: str
    suggestion: str | None = None
    fixed: bool = False
    fix_attempts: int = 0
    accepted: bool = False
    acceptance_reason: str = ""


@dataclass
class FixAttemptRecord:
    """Record of a single fix iteration for escalation context."""

    iteration: int
    plan_summary: str
    findings_before: int
    findings_after: int
    newly_fixed: list[str] = field(default_factory=list)
    still_remaining: list[str] = field(default_factory=list)


@dataclass
class ReviewFindings:
    """Aggregated findings from a CodeRabbit review run."""

    findings: list[ReviewFinding] = field(default_factory=list)
    raw_output: str = ""

    def has_critical_issues(self) -> bool:
        """Return True if there are unfixed and unaccepted critical or high severity findings."""
        return any(
            f.severity in ("critical", "high") and not f.fixed and not f.accepted
            for f in self.findings
        )

    @property
    def critical_count(self) -> int:
        return sum(
            1 for f in self.findings
            if f.severity == "critical" and not f.fixed and not f.accepted
        )

    @property
    def high_count(self) -> int:
        return sum(
            1 for f in self.findings
            if f.severity == "high" and not f.fixed and not f.accepted
        )

    @property
    def medium_count(self) -> int:
        return sum(1 for f in self.findings if f.severity == "medium" and not f.fixed)

    @property
    def low_count(self) -> int:
        return sum(1 for f in self.findings if f.severity == "low" and not f.fixed)

    def unfixed_critical_high(self) -> list["ReviewFinding"]:
        """Return findings that are critical/high, not fixed, and not accepted."""
        return [
            f for f in self.findings
            if f.severity in ("critical", "high") and not f.fixed and not f.accepted
        ]

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


CHECKPOINT_FILENAME = "review_merge_checkpoint.json"


@dataclass
class ReviewMergeCheckpoint:
    """Checkpoint for resuming an interrupted Review & Merge pipeline."""

    last_completed_stage: str  # reviewing, checking_conflicts, fixing, e2e_testing, creating_pr
    findings: list[dict] = field(default_factory=list)
    conflicts: list[str] = field(default_factory=list)
    iterations_used: int = 0
    fix_history: list[dict] = field(default_factory=list)

    def save(self, spec_dir: Path) -> None:
        """Persist checkpoint to spec directory."""
        path = spec_dir / CHECKPOINT_FILENAME
        path.write_text(json.dumps(asdict(self), indent=2), encoding="utf-8")

    @classmethod
    def load(cls, spec_dir: Path) -> ReviewMergeCheckpoint | None:
        """Load checkpoint from spec directory, or None if not found."""
        path = spec_dir / CHECKPOINT_FILENAME
        if not path.exists():
            return None
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            return cls(**data)
        except (json.JSONDecodeError, TypeError, KeyError):
            return None

    @staticmethod
    def clear(spec_dir: Path) -> None:
        """Remove checkpoint file after successful completion."""
        path = spec_dir / CHECKPOINT_FILENAME
        if path.exists():
            path.unlink()

    def restore_findings(self) -> ReviewFindings:
        """Reconstruct ReviewFindings from serialised dicts."""
        return ReviewFindings(
            findings=[
                ReviewFinding(
                    file=f.get("file", ""),
                    line=f.get("line"),
                    severity=f.get("severity", "medium"),
                    description=f.get("description", ""),
                    suggestion=f.get("suggestion"),
                    fixed=f.get("fixed", False),
                    fix_attempts=f.get("fix_attempts", 0),
                    accepted=f.get("accepted", False),
                    acceptance_reason=f.get("acceptance_reason", ""),
                )
                for f in self.findings
            ]
        )

    def restore_fix_history(self) -> list[FixAttemptRecord]:
        """Reconstruct FixAttemptRecord list from serialised dicts."""
        return [
            FixAttemptRecord(
                iteration=h.get("iteration", 0),
                plan_summary=h.get("plan_summary", ""),
                findings_before=h.get("findings_before", 0),
                findings_after=h.get("findings_after", 0),
                newly_fixed=h.get("newly_fixed", []),
                still_remaining=h.get("still_remaining", []),
            )
            for h in self.fix_history
        ]
