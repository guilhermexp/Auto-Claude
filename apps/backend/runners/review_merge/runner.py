#!/usr/bin/env python3
"""
Review & Merge Runner
=====================

Orchestrates the complete review-merge pipeline:
  1. REVIEW: CodeRabbit CLI review
  2. CONFLICT CHECK: Git merge dry-run
  3. FIX LOOP: AI-driven plan → build → verify (max N iterations)
  4. CREATE PR: Push branch and create PR
  5. MERGE: Merge worktree into base branch

Usage:
    python -m runners.review_merge.runner --spec 001-feature --project-dir /path/to/project
"""

import sys

if sys.version_info < (3, 10):  # noqa: UP036
    sys.exit(
        f"Error: Auto Claude requires Python 3.10 or higher.\n"
        f"You are running Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    )

import asyncio
import io
import json
import os
import re
import signal
import shutil
import subprocess
import time
import urllib.request
from collections import deque
from pathlib import Path

# Configure safe encoding on Windows
if sys.platform == "win32":
    for _stream_name in ("stdout", "stderr"):
        _stream = getattr(sys, _stream_name)
        if hasattr(_stream, "reconfigure"):
            try:
                _stream.reconfigure(encoding="utf-8", errors="replace")
                continue
            except (AttributeError, io.UnsupportedOperation, OSError):
                pass
        try:
            if hasattr(_stream, "buffer"):
                _new_stream = io.TextIOWrapper(
                    _stream.buffer,
                    encoding="utf-8",
                    errors="replace",
                    line_buffering=True,
                )
                setattr(sys, _stream_name, _new_stream)
        except (AttributeError, io.UnsupportedOperation, OSError):
            pass
    del _stream_name, _stream
    if "_new_stream" in dir():
        del _new_stream

# Add auto-claude to path (parent of runners/)
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from core.dependency_validator import validate_platform_dependencies

validate_platform_dependencies()

from cli.utils import import_dotenv

load_dotenv = import_dotenv()

env_file = Path(__file__).parent.parent.parent / ".env"
dev_env_file = (
    Path(__file__).parent.parent.parent.parent / "dev" / "auto-claude" / ".env"
)
if env_file.exists():
    load_dotenv(env_file)
elif dev_env_file.exists():
    load_dotenv(dev_env_file)

from core.sentry import capture_exception, init_sentry

init_sentry(component="review-merge-runner")

from core.client import create_client
from core.phase_event import ExecutionPhase, emit_phase
from core.worktree import WorktreeManager
from debug import debug, debug_error, debug_section, debug_success, debug_warning
from phase_config import (
    get_fast_mode,
    get_phase_client_thinking_kwargs,
    get_phase_model,
    get_phase_model_betas,
    sanitize_thinking_level,
)

from .models import (
    FixAttemptRecord,
    ReviewFinding,
    ReviewFindings,
    ReviewMergeCheckpoint,
    ReviewMergeResult,
)

# Progress event marker for frontend parsing
REVIEW_MERGE_MARKER = "__REVIEW_MERGE__:"
REVIEW_MERGE_LOG_MARKER = "__REVIEW_MERGE_LOG__:"


def emit_review_merge_log(
    event_type: str,
    *,
    tool_name: str | None = None,
    tool_input: str | None = None,
    content: str | None = None,
    success: bool = True,
    detail: str | None = None,
    stage: str | None = None,
) -> None:
    """Emit a tool-level log entry for frontend rendering (TaskLogs-style)."""
    payload: dict = {"type": event_type}
    if tool_name is not None:
        payload["tool_name"] = tool_name
    if tool_input is not None:
        payload["tool_input"] = tool_input
    if content is not None:
        payload["content"] = content
    if not success:
        payload["success"] = False
    if detail is not None:
        payload["detail"] = detail
    if stage is not None:
        payload["stage"] = stage

    try:
        print(f"{REVIEW_MERGE_LOG_MARKER}{json.dumps(payload, default=str)}", flush=True)
    except (OSError, UnicodeEncodeError):
        pass


def emit_review_merge_progress(
    stage: str,
    message: str,
    *,
    iteration: int | None = None,
    max_iterations: int | None = None,
    percent: int = 0,
    findings_summary: str | None = None,
    conflicts: list[str] | None = None,
) -> None:
    """Emit structured progress event for frontend parsing."""
    payload = {
        "stage": stage,
        "message": message,
        "percent": max(0, min(100, percent)),
    }
    if iteration is not None:
        payload["iteration"] = iteration
    if max_iterations is not None:
        payload["maxIterations"] = max_iterations
    if findings_summary is not None:
        payload["findingsSummary"] = findings_summary
    if conflicts is not None:
        payload["conflicts"] = conflicts

    try:
        print(f"{REVIEW_MERGE_MARKER}{json.dumps(payload, default=str)}", flush=True)
    except (OSError, UnicodeEncodeError):
        pass


def _extract_tool_display(block) -> str | None:
    """Extract readable tool input for logging."""
    inp = getattr(block, "input", None)
    if not inp or not isinstance(inp, dict):
        return None
    if "pattern" in inp:
        return f"pattern: {inp['pattern']}"
    if "file_path" in inp:
        fp = inp["file_path"]
        return f"...{fp[-47:]}" if len(fp) > 50 else fp
    if "command" in inp:
        cmd = inp["command"]
        return f"{cmd[:47]}..." if len(cmd) > 50 else cmd
    if "path" in inp:
        return inp["path"]
    return None


class ReviewMergeRunner:
    """Orchestrates the review → fix → PR → merge pipeline."""

    def __init__(
        self,
        project_dir: Path,
        spec_name: str,
        base_branch: str | None = None,
        max_iterations: int = 5,
        model: str | None = None,
        thinking_level: str | None = None,
        pr_target: str | None = None,
        pr_title: str | None = None,
        pr_draft: bool = False,
        skip_merge: bool = False,
        skip_e2e: bool = False,
        continue_run: bool = False,
    ):
        self.project_dir = project_dir.resolve()
        self.spec_name = spec_name
        self.max_iterations = max_iterations
        self.model = model
        self.thinking_level = thinking_level
        self.pr_target = pr_target
        self.pr_title = pr_title
        self.pr_draft = pr_draft
        self.skip_merge = skip_merge
        self.skip_e2e = skip_e2e
        self.continue_run = continue_run

        self.spec_dir = self.project_dir / ".auto-claude" / "specs" / spec_name
        self.worktree_mgr = WorktreeManager(
            self.project_dir, base_branch or "main"
        )

        # Resolve worktree path
        self.worktree_path = self._find_worktree_path()
        self.base_branch = base_branch or self._detect_base_branch()

    def _find_worktree_path(self) -> Path:
        """Find the worktree directory for this spec."""
        worktrees_base = self.project_dir / ".auto-claude" / "worktrees"
        # Try spec_name directly
        candidate = worktrees_base / self.spec_name
        if candidate.exists():
            return candidate

        # Try matching by prefix
        if worktrees_base.exists():
            for item in worktrees_base.iterdir():
                if item.is_dir() and item.name.startswith(self.spec_name.split("-")[0]):
                    return item

        # Fallback: ask git for worktree paths
        try:
            result = subprocess.run(
                ["git", "worktree", "list", "--porcelain"],
                cwd=str(self.project_dir),
                capture_output=True,
                text=True,
            )
            for line in result.stdout.splitlines():
                if line.startswith("worktree ") and self.spec_name in line:
                    return Path(line.split(" ", 1)[1])
        except subprocess.SubprocessError:
            pass

        raise FileNotFoundError(
            f"Worktree not found for spec '{self.spec_name}' in {worktrees_base}"
        )

    def _detect_base_branch(self) -> str:
        """Detect the base branch from worktree config or project."""
        try:
            result = subprocess.run(
                ["git", "rev-parse", "--abbrev-ref", "HEAD"],
                cwd=str(self.project_dir),
                capture_output=True,
                text=True,
            )
            return result.stdout.strip() or "main"
        except subprocess.SubprocessError:
            return "main"

    # ── Agent execution ──

    async def _run_agent_with_tools(
        self, client, prompt: str, stage: str
    ) -> tuple[str, str]:
        """Run agent session with full tool access, emitting structured log events.

        Mirrors run_agent_session() pattern from agents/session.py but outputs
        via emit_review_merge_log() for frontend parsing.

        Returns: (status, response_text) where status is 'complete' or 'error'
        """
        await client.query(prompt)
        response_text = ""
        current_tools: deque[str] = deque()

        async for msg in client.receive_response():
            msg_type = type(msg).__name__

            if msg_type == "AssistantMessage" and hasattr(msg, "content"):
                for block in msg.content:
                    block_type = type(block).__name__

                    if block_type == "TextBlock" and hasattr(block, "text"):
                        response_text += block.text
                        if block.text.strip():
                            emit_review_merge_log(
                                "info",
                                content=block.text[:500],
                                stage=stage,
                            )

                    elif block_type == "ToolUseBlock" and hasattr(block, "name"):
                        current_tools.append(block.name)
                        tool_input = _extract_tool_display(block)
                        emit_review_merge_log(
                            "tool_start",
                            tool_name=block.name,
                            tool_input=tool_input,
                            stage=stage,
                        )

            elif msg_type == "UserMessage" and hasattr(msg, "content"):
                for block in msg.content:
                    block_type = type(block).__name__
                    if block_type == "ToolResultBlock":
                        is_error = getattr(block, "is_error", False)
                        result_content = str(getattr(block, "content", ""))
                        tool_name = current_tools.popleft() if current_tools else "unknown"
                        emit_review_merge_log(
                            "tool_end",
                            tool_name=tool_name,
                            success=not is_error,
                            detail=result_content[:2000],
                            stage=stage,
                        )

        return "complete", response_text

    # ── Review methods ──

    def _get_diff(self) -> str:
        """Get the git diff between worktree branch and base branch."""
        emit_review_merge_log("tool_start", tool_name="Bash", tool_input=f"git diff origin/{self.base_branch}...HEAD", stage="reviewing")
        try:
            result = subprocess.run(
                ["git", "diff", f"origin/{self.base_branch}...HEAD"],
                cwd=str(self.worktree_path),
                capture_output=True,
                text=True,
                timeout=60,
            )
            diff = result.stdout or ""
            # Fallback: if no remote diff, try local diff
            if not diff.strip():
                result = subprocess.run(
                    ["git", "diff", f"{self.base_branch}...HEAD"],
                    cwd=str(self.worktree_path),
                    capture_output=True,
                    text=True,
                    timeout=60,
                )
                diff = result.stdout or ""
            emit_review_merge_log("tool_end", tool_name="Bash", detail=f"{len(diff)} bytes diff", stage="reviewing")
            return diff
        except (subprocess.TimeoutExpired, subprocess.SubprocessError) as e:
            emit_review_merge_log("tool_end", tool_name="Bash", success=False, detail=str(e), stage="reviewing")
            return ""

    def _get_changed_files(self) -> list[str]:
        """Get list of changed files in worktree vs base."""
        try:
            result = subprocess.run(
                ["git", "diff", "--name-only", f"{self.base_branch}...HEAD"],
                cwd=str(self.worktree_path),
                capture_output=True,
                text=True,
                timeout=30,
            )
            return [f.strip() for f in result.stdout.splitlines() if f.strip()]
        except (subprocess.TimeoutExpired, subprocess.SubprocessError):
            return []

    async def _run_code_review(self) -> ReviewFindings:
        """Multi-source code review: Claude agent + optional CodeRabbit CLI."""
        debug_section("review_merge", "Running code review")

        # Step 1: Get the diff
        emit_review_merge_log("info", content="Gathering changes...", stage="reviewing")
        diff = self._get_diff()
        changed_files = self._get_changed_files()

        if not diff.strip():
            emit_review_merge_log("info", content="No changes detected in worktree", stage="reviewing")
            return ReviewFindings(raw_output="No changes detected")

        emit_review_merge_log("info", content=f"Reviewing {len(changed_files)} changed file(s)", stage="reviewing")

        # Step 2: Claude agent review (bugs, security, patterns)
        claude_findings = await self._run_claude_review(diff, changed_files)

        # Step 3: CodeRabbit CLI review (optional — skipped silently if not installed)
        coderabbit_findings = self._run_coderabbit_review_optional()

        # Step 4: Merge findings (deduplicate)
        all_findings = self._merge_findings(claude_findings, coderabbit_findings)

        summary = all_findings.summary()
        debug("review_merge", f"Review found {len(all_findings.findings)} issues: {summary}")
        emit_review_merge_log("info", content=f"Review complete: {summary}", stage="reviewing")

        return all_findings

    async def _run_claude_review(self, diff: str, changed_files: list[str]) -> ReviewFindings:
        """Run Claude agent with tool access to review code changes."""
        # Truncate diff if too large
        max_diff_chars = 80000
        truncated = False
        review_diff = diff
        if len(diff) > max_diff_chars:
            review_diff = diff[:max_diff_chars]
            truncated = True

        files_list = "\n".join(f"- {f}" for f in changed_files[:50])
        worktree = str(self.worktree_path)

        prompt = f"""You are a senior code reviewer. Review the following code changes and identify issues.
Focus ONLY on changes introduced in this diff — not pre-existing problems.

## Working directory
{worktree}

## Changed files
{files_list}

## Diff
```diff
{review_diff}
```
{"(diff truncated due to size)" if truncated else ""}

## Instructions
You have access to Read, Glob, Grep, and Bash tools. If the diff is truncated or you need more context to understand the changes, USE these tools to read the affected files before forming your assessment. For example:
- Use Read to examine the full file when the diff context is insufficient
- Use Grep to search for related usage patterns across the codebase
- Use Bash to run `git log` for recent commit context

## Review areas
Analyze the diff for:
1. **Bugs**: Logic errors, off-by-one, null/undefined access, race conditions, incorrect types
2. **Security**: XSS, injection, auth bypass, data exposure, insecure patterns
3. **Performance**: N+1 queries, memory leaks, unnecessary re-renders, missing caching
4. **Patterns**: Breaking existing code conventions, inconsistent naming, missing error handling

## Output format
After your analysis, return ONLY a JSON array of findings. Each finding must have:
- "file": file path
- "line": line number or null
- "severity": "critical" | "high" | "medium" | "low"
- "description": clear description of the issue
- "suggestion": how to fix it (or null)

If no issues found, return an empty array: []

Rules:
- Ignore style/formatting issues (linters handle those)
- Ignore missing tests or documentation unless security-critical
- Only flag things a senior engineer would flag in code review
- Score critical/high ONLY for real bugs or security issues
- Use medium for patterns and performance, low for minor suggestions

Your final output must be ONLY the JSON array."""

        qa_model = get_phase_model(self.spec_dir, "qa", self.model)
        qa_betas = get_phase_model_betas(self.spec_dir, "qa", qa_model)
        fast_mode = get_fast_mode(self.spec_dir)
        qa_thinking_kwargs = get_phase_client_thinking_kwargs(
            self.spec_dir, "qa", qa_model, self.thinking_level
        )

        emit_review_merge_log("info", content=f"Using model: {qa_model}", stage="reviewing")

        try:
            client = create_client(
                self.project_dir,
                self.spec_dir,
                qa_model,
                agent_type="review_merge_reviewer",
                betas=qa_betas,
                fast_mode=fast_mode,
                **qa_thinking_kwargs,
            )

            async with client:
                _status, response = await self._run_agent_with_tools(
                    client, prompt, "reviewing"
                )

            return self._parse_json_findings(response, source="claude")

        except Exception as e:
            debug_error("review_merge", f"Claude review failed: {e}")
            capture_exception(e)
            emit_review_merge_log("tool_end", tool_name="Bash", success=False, detail=str(e), stage="reviewing")
            emit_review_merge_log("error", content=f"Claude review agent failed: {e}", stage="reviewing")
            return ReviewFindings(raw_output=f"Claude review failed: {e}")

    def _run_coderabbit_review_optional(self) -> ReviewFindings:
        """Run CodeRabbit CLI if installed. Silently skip if not available."""
        if not shutil.which("coderabbit"):
            emit_review_merge_log("info", content="CodeRabbit CLI not installed — skipping static analysis", stage="reviewing")
            return ReviewFindings()

        emit_review_merge_log("tool_start", tool_name="Bash", tool_input=f"coderabbit review --plain --base {self.base_branch}", stage="reviewing")

        try:
            result = subprocess.run(
                ["coderabbit", "review", "--plain", "--base", self.base_branch],
                cwd=str(self.worktree_path),
                capture_output=True,
                text=True,
                timeout=300,
            )

            raw_output = result.stdout + result.stderr
            findings = self._parse_coderabbit_output(raw_output)
            emit_review_merge_log(
                "tool_end", tool_name="Bash",
                success=result.returncode == 0,
                detail=raw_output[:2000] if raw_output else "No output",
                stage="reviewing",
            )
            emit_review_merge_log("info", content=f"CodeRabbit: {findings.summary()}", stage="reviewing")
            return findings

        except (FileNotFoundError, subprocess.TimeoutExpired, subprocess.SubprocessError) as e:
            emit_review_merge_log("tool_end", tool_name="Bash", success=False, detail=str(e), stage="reviewing")
            return ReviewFindings()

    def _parse_coderabbit_output(self, output: str) -> ReviewFindings:
        """Parse CodeRabbit plain text output into structured findings."""
        findings: list[ReviewFinding] = []

        severity_pattern = re.compile(
            r"(?:^|\n)\s*(?:[-*]\s+)?(?:(\S+?)(?::(\d+))?\s*[-:]\s*)?\[(\w+)\]\s*(.+?)(?:\n|$)",
            re.MULTILINE,
        )

        for match in severity_pattern.finditer(output):
            file_path = match.group(1) or ""
            line_num = int(match.group(2)) if match.group(2) else None
            severity = match.group(3).lower()
            description = match.group(4).strip()

            if severity not in ("critical", "high", "medium", "low"):
                if severity in ("error", "bug"):
                    severity = "high"
                elif severity in ("warning", "warn"):
                    severity = "medium"
                elif severity in ("info", "note", "suggestion"):
                    severity = "low"
                else:
                    severity = "medium"

            findings.append(
                ReviewFinding(
                    file=file_path,
                    line=line_num,
                    severity=severity,
                    description=f"[coderabbit] {description}",
                )
            )

        return ReviewFindings(findings=findings, raw_output=output)

    def _parse_json_findings(self, response: str, source: str = "claude") -> ReviewFindings:
        """Parse JSON array of findings from Claude agent response."""
        findings: list[ReviewFinding] = []

        # Extract JSON array from response (may have markdown fencing)
        json_text = response.strip()
        if "```" in json_text:
            # Extract content between first ``` and last ```
            parts = json_text.split("```")
            for part in parts:
                stripped = part.strip()
                if stripped.startswith("json"):
                    stripped = stripped[4:].strip()
                if stripped.startswith("["):
                    json_text = stripped
                    break

        try:
            items = json.loads(json_text)
            if not isinstance(items, list):
                items = []
        except (json.JSONDecodeError, ValueError):
            debug_warning("review_merge", f"Failed to parse review JSON, treating as raw output")
            return ReviewFindings(raw_output=response)

        for item in items:
            if not isinstance(item, dict):
                continue
            severity = str(item.get("severity", "medium")).lower()
            if severity not in ("critical", "high", "medium", "low"):
                severity = "medium"

            findings.append(
                ReviewFinding(
                    file=str(item.get("file", "")),
                    line=item.get("line"),
                    severity=severity,
                    description=str(item.get("description", "")),
                    suggestion=item.get("suggestion"),
                )
            )

        return ReviewFindings(findings=findings, raw_output=response)

    def _merge_findings(self, *sources: ReviewFindings) -> ReviewFindings:
        """Merge findings from multiple sources, deduplicating by file+description similarity."""
        all_findings: list[ReviewFinding] = []
        seen: set[str] = set()

        for source in sources:
            for f in source.findings:
                # Simple dedup key: file + first 60 chars of description
                key = f"{f.file}:{f.description[:60].lower()}"
                if key not in seen:
                    seen.add(key)
                    all_findings.append(f)

        raw = "\n---\n".join(s.raw_output for s in sources if s.raw_output)
        return ReviewFindings(findings=all_findings, raw_output=raw)

    def _get_escalation_level(self, iteration: int) -> str:
        """Determine escalation level based on iteration number."""
        if iteration <= 2:
            return "normal"
        elif iteration < self.max_iterations:
            return "escalated"
        else:
            return "force_resolve"

    def _check_conflicts(self) -> list[str]:
        """Dry-run merge to detect conflicts. Returns list of conflicting files."""
        debug_section("review_merge", "Checking for merge conflicts")

        try:
            # Fetch latest base branch
            fetch_cmd = f"git fetch origin {self.base_branch}"
            emit_review_merge_log("tool_start", tool_name="Bash", tool_input=fetch_cmd, stage="checking_conflicts")
            fetch_result = subprocess.run(
                ["git", "fetch", "origin", self.base_branch],
                cwd=str(self.worktree_path),
                capture_output=True,
                text=True,
                timeout=60,
            )
            emit_review_merge_log("tool_end", tool_name="Bash", success=fetch_result.returncode == 0, stage="checking_conflicts")

            # Dry-run merge
            merge_cmd = f"git merge --no-commit --no-ff origin/{self.base_branch}"
            emit_review_merge_log("tool_start", tool_name="Bash", tool_input=merge_cmd, stage="checking_conflicts")
            result = subprocess.run(
                [
                    "git",
                    "merge",
                    "--no-commit",
                    "--no-ff",
                    f"origin/{self.base_branch}",
                ],
                cwd=str(self.worktree_path),
                capture_output=True,
                text=True,
                timeout=60,
            )

            merge_output = (result.stdout + result.stderr)[:1000]

            # Detect dirty worktree blocking merge (uncommitted changes)
            if "local changes" in merge_output and "would be overwritten" in merge_output:
                emit_review_merge_log(
                    "tool_end", tool_name="Bash",
                    success=False,
                    detail=merge_output,
                    stage="checking_conflicts",
                )
                # Auto-commit uncommitted changes so merge can proceed
                emit_review_merge_log("info", content="Committing uncommitted worktree changes before merge...", stage="checking_conflicts")
                subprocess.run(
                    ["git", "add", "-A"],
                    cwd=str(self.worktree_path),
                    capture_output=True,
                    text=True,
                )
                subprocess.run(
                    ["git", "commit", "-m", "chore: commit worktree changes before merge"],
                    cwd=str(self.worktree_path),
                    capture_output=True,
                    text=True,
                )
                # Retry the dry-run merge
                result = subprocess.run(
                    ["git", "merge", "--no-commit", "--no-ff", f"origin/{self.base_branch}"],
                    cwd=str(self.worktree_path),
                    capture_output=True,
                    text=True,
                    timeout=60,
                )
                merge_output = (result.stdout + result.stderr)[:1000]

            conflict_files = []
            if result.returncode != 0:
                # Parse conflict file names
                for line in (result.stdout + result.stderr).splitlines():
                    if "CONFLICT" in line:
                        # Extract filename from "CONFLICT (content): Merge conflict in <file>"
                        conflict_match = re.search(
                            r"(?:Merge conflict in|CONFLICT.*?)\s+(\S+)", line
                        )
                        if conflict_match:
                            conflict_files.append(conflict_match.group(1))

            emit_review_merge_log(
                "tool_end", tool_name="Bash",
                success=result.returncode == 0,
                detail=merge_output if merge_output else "Clean merge",
                stage="checking_conflicts",
            )

            # Always abort the dry-run merge
            subprocess.run(
                ["git", "merge", "--abort"],
                cwd=str(self.worktree_path),
                capture_output=True,
                text=True,
            )

            if conflict_files:
                emit_review_merge_log("error", content=f"Conflicts in: {', '.join(conflict_files)}", stage="checking_conflicts")
            else:
                emit_review_merge_log("success", content="No merge conflicts detected", stage="checking_conflicts")

            debug(
                "review_merge",
                f"Conflict check: {len(conflict_files)} conflicts found",
                files=conflict_files,
            )
            return conflict_files

        except subprocess.TimeoutExpired:
            # Clean up on timeout
            subprocess.run(
                ["git", "merge", "--abort"],
                cwd=str(self.worktree_path),
                capture_output=True,
                text=True,
            )
            debug_error("review_merge", "Conflict check timed out")
            emit_review_merge_log("error", content="Conflict check timed out", stage="checking_conflicts")
            return []
        except subprocess.SubprocessError as e:
            debug_error("review_merge", f"Conflict check failed: {e}")
            emit_review_merge_log("error", content=f"Conflict check failed: {e}", stage="checking_conflicts")
            return []

    async def _run_targeted_verification(
        self, previous_findings: ReviewFindings
    ) -> ReviewFindings:
        """Verify ONLY previously identified findings — do NOT discover new issues.

        Unlike _run_code_review(), this instructs the agent to check only the
        specific findings from the previous iteration and report which are fixed.
        """
        unfixed = previous_findings.unfixed_critical_high()
        if not unfixed:
            return previous_findings

        worktree = str(self.worktree_path)

        findings_list = []
        for i, f in enumerate(unfixed):
            loc = f"{f.file}:{f.line}" if f.line else f.file
            findings_list.append(
                f"  {i}: [{f.severity.upper()}] {loc} — {f.description}"
            )

        prompt = f"""You are a senior code reviewer performing a TARGETED verification.

## Working directory
{worktree}

## Previous findings to verify
{chr(10).join(findings_list)}

## Instructions
You have access to Read, Glob, Grep, and Bash tools. For EACH finding above:
1. Use Read to examine the file at the indicated location
2. Determine if the issue has been FIXED or is STILL PRESENT
3. Be precise — only mark as "fixed" if the specific issue described is genuinely resolved

IMPORTANT: Do NOT look for NEW issues. ONLY verify the findings listed above.

## Output format
Return ONLY a JSON array. For each finding, output:
{{"index": <number>, "status": "fixed" | "still_present"}}

Example: [{{"index": 0, "status": "fixed"}}, {{"index": 1, "status": "still_present"}}]"""

        qa_model = get_phase_model(self.spec_dir, "qa", self.model)
        qa_betas = get_phase_model_betas(self.spec_dir, "qa", qa_model)
        fast_mode = get_fast_mode(self.spec_dir)
        qa_thinking_kwargs = get_phase_client_thinking_kwargs(
            self.spec_dir, "qa", qa_model, self.thinking_level
        )

        emit_review_merge_log(
            "info",
            content=f"Verifying {len(unfixed)} previous finding(s) (targeted)",
            stage="verifying",
        )

        try:
            client = create_client(
                self.project_dir,
                self.spec_dir,
                qa_model,
                agent_type="review_merge_reviewer",
                betas=qa_betas,
                fast_mode=fast_mode,
                **qa_thinking_kwargs,
            )

            async with client:
                _status, response = await self._run_agent_with_tools(
                    client, prompt, "verifying"
                )

            # Parse verification results
            json_text = response.strip()
            if "```" in json_text:
                parts = json_text.split("```")
                for part in parts:
                    stripped = part.strip()
                    if stripped.startswith("json"):
                        stripped = stripped[4:].strip()
                    if stripped.startswith("["):
                        json_text = stripped
                        break

            try:
                results = json.loads(json_text)
                if not isinstance(results, list):
                    results = []
            except (json.JSONDecodeError, ValueError):
                debug_warning("review_merge", "Failed to parse verification JSON")
                results = []

            # Update findings based on verification
            for item in results:
                if not isinstance(item, dict):
                    continue
                idx = item.get("index")
                status = item.get("status", "")
                if isinstance(idx, int) and 0 <= idx < len(unfixed):
                    if status == "fixed":
                        unfixed[idx].fixed = True
                    else:
                        unfixed[idx].fix_attempts += 1

            fixed_count = sum(1 for r in results if isinstance(r, dict) and r.get("status") == "fixed")
            emit_review_merge_log(
                "info",
                content=f"Verification: {fixed_count}/{len(unfixed)} fixed",
                stage="verifying",
            )

        except Exception as e:
            debug_error("review_merge", f"Targeted verification failed: {e}")
            capture_exception(e)
            emit_review_merge_log(
                "error",
                content=f"Targeted verification failed: {e}",
                stage="verifying",
            )
            # On failure, increment fix_attempts for all unfixed
            for f in unfixed:
                f.fix_attempts += 1

        return previous_findings

    async def _plan_fixes(
        self, findings: ReviewFindings, conflicts: list[str],
        escalation_level: str = "normal",
        fix_history: list[FixAttemptRecord] | None = None,
        iteration: int = 1,
    ) -> str:
        """Use Claude agent with tool access to plan fixes."""
        # Build context for the planner — exclude fixed and accepted findings
        issues_text = []
        for f in findings.findings:
            if f.severity in ("critical", "high") and not f.fixed and not f.accepted:
                loc = f"{f.file}:{f.line}" if f.line else f.file
                attempts_note = f" (attempted {f.fix_attempts}x)" if f.fix_attempts > 0 else ""
                issues_text.append(
                    f"- [{f.severity.upper()}] {loc}: {f.description}{attempts_note}"
                    + (f" (suggestion: {f.suggestion})" if f.suggestion else "")
                )

        conflicts_text = ""
        if conflicts:
            conflicts_text = "\n\nMerge conflicts in:\n" + "\n".join(
                f"- {c}" for c in conflicts
            )

        worktree = str(self.worktree_path)

        prompt = f"""You are a senior engineer planning fixes for code review findings.

## Working directory
{worktree}

## Code Review Findings
{chr(10).join(issues_text) if issues_text else 'No critical/high issues.'}
{conflicts_text}

## Instructions
You have access to Read, Glob, Grep, and Bash tools. You MUST use them:
1. Use Read to examine each affected file and understand surrounding context
2. Use Grep to find related patterns or usages that might be affected by fixes
3. Use Glob to discover related test files or configuration

After reading the code, output a structured fix plan as a numbered list. For each fix:
- State which file(s) to modify and what change to make
- Explain WHY the change fixes the issue
- Note any dependencies between fixes (order matters)
- Prioritize: critical first, then high severity
- For merge conflicts, describe the resolution strategy

Keep fixes minimal and targeted — do not suggest refactoring beyond what's needed."""

        # Append escalation context based on level
        if escalation_level == "escalated" and fix_history:
            history_lines = []
            for record in fix_history:
                history_lines.append(
                    f"- Iteration {record.iteration}: planned '{record.plan_summary[:100]}', "
                    f"fixed {len(record.newly_fixed)}, remaining {len(record.still_remaining)}"
                )
            prompt += f"""

## ESCALATION — Previous attempts have NOT resolved these issues

### History of previous attempts
{chr(10).join(history_lines)}

### What to do differently
- You MUST take a DIFFERENT approach from what was tried before
- Consider a deeper root cause — the surface-level fix did not work
- Consider a broader refactor if the issue is structural
- Read MORE surrounding context to understand why previous fixes failed
- If the issue involves generated code or config, check the generator/config source"""

        elif escalation_level == "force_resolve" and fix_history:
            history_lines = []
            for record in fix_history:
                history_lines.append(
                    f"- Iteration {record.iteration}: planned '{record.plan_summary[:100]}', "
                    f"fixed {len(record.newly_fixed)}, remaining {len(record.still_remaining)}"
                )
            prompt += f"""

## FORCE RESOLUTION — This is the FINAL iteration

### History of ALL previous attempts
{chr(10).join(history_lines)}

### Mandatory resolution strategy
For EACH remaining finding, you MUST provide TWO strategies:

**Strategy A (preferred)**: A definitive code fix using a completely different approach than before.

**Strategy B (last resort)**: If Strategy A is not feasible, accept the finding by:
1. Adding a `// TODO(review-merge): <description of the issue>` comment at the relevant code location
2. Documenting WHY the automated fix could not resolve it

Every finding MUST be addressed — no finding can be left without an action plan."""

        qa_model = get_phase_model(self.spec_dir, "qa", self.model)
        qa_betas = get_phase_model_betas(self.spec_dir, "qa", qa_model)
        fast_mode = get_fast_mode(self.spec_dir)
        qa_thinking_kwargs = get_phase_client_thinking_kwargs(
            self.spec_dir, "qa", qa_model, self.thinking_level
        )

        issues_summary = f"{len(issues_text)} issues, {len(conflicts)} conflicts"
        emit_review_merge_log("info", content=f"Planning fixes: {issues_summary}", stage="planning")
        emit_review_merge_log("info", content=f"Using model: {qa_model}", stage="planning")

        client = create_client(
            self.project_dir,
            self.spec_dir,
            qa_model,
            agent_type="review_merge_planner",
            betas=qa_betas,
            fast_mode=fast_mode,
            **qa_thinking_kwargs,
        )

        async with client:
            _status, response = await self._run_agent_with_tools(
                client, prompt, "planning"
            )
            return response

    async def _apply_fixes(self, plan: str, escalation_level: str = "normal") -> None:
        """Use Claude agent with tool access to implement fixes."""
        worktree = str(self.worktree_path)

        prompt = f"""You are a senior engineer applying code fixes in a git worktree.

## Working directory
{worktree}

## Fix Plan
{plan}

## Instructions
You have access to Read, Write, Edit, Glob, Grep, and Bash tools. You MUST use them:
1. Use Read to examine each file BEFORE modifying it
2. Use Edit for targeted changes (preferred over Write for partial modifications)
3. Use Write only when creating new files or rewriting entire files
4. Use Bash to run `git add` and `git commit` after each logical fix
5. Use Bash to run tests if a test runner is available (e.g., `npm test`, `pytest`)

Rules:
- Make minimal, targeted changes — do not refactor beyond the fix plan
- Read each file before editing to ensure the edit target string is exact
- Commit each logical fix separately with a descriptive message
- If a test fails after your fix, investigate and adjust before committing
- All file paths are relative to the working directory above"""

        if escalation_level == "force_resolve":
            prompt += """

## FINAL ITERATION — Every issue MUST be addressed
- This is the FINAL iteration. Every issue in the plan MUST be resolved.
- For issues marked as Strategy B (acceptance), add a `// TODO(review-merge): <description>` comment at the relevant location.
- Commit ALL changes, including acceptance comments."""

        qa_model = get_phase_model(self.spec_dir, "qa", self.model)
        qa_betas = get_phase_model_betas(self.spec_dir, "qa", qa_model)
        fast_mode = get_fast_mode(self.spec_dir)
        qa_thinking_kwargs = get_phase_client_thinking_kwargs(
            self.spec_dir, "qa", qa_model, self.thinking_level
        )

        emit_review_merge_log("info", content="Applying fix plan...", stage="building")
        emit_review_merge_log("info", content=f"Using model: {qa_model}", stage="building")

        client = create_client(
            self.project_dir,
            self.spec_dir,
            qa_model,
            agent_type="review_merge_fixer",
            betas=qa_betas,
            fast_mode=fast_mode,
            **qa_thinking_kwargs,
        )

        async with client:
            _status, response = await self._run_agent_with_tools(
                client, prompt, "building"
            )

    # ── E2E Smoke Testing ──

    def _should_run_e2e(self) -> bool:
        """Determine if E2E smoke testing should run."""
        if self.skip_e2e:
            emit_review_merge_log("info", content="E2E testing skipped (--skip-e2e flag)", stage="e2e_testing")
            return False

        # Check that playwright-cli is available
        if not shutil.which("playwright-cli") and not shutil.which("npx"):
            emit_review_merge_log("info", content="E2E testing skipped (playwright-cli not available)", stage="e2e_testing")
            return False

        server_info = self._detect_dev_server_command()
        if not server_info:
            emit_review_merge_log("info", content="E2E testing skipped (no web dev server detected)", stage="e2e_testing")
            return False

        return True

    def _detect_dev_server_command(self) -> tuple[str, int] | None:
        """Detect dev server command and port from package.json.

        Returns (command, port) or None if not a web project.
        Skips Electron projects automatically.
        """
        package_json_path = self.worktree_path / "package.json"
        if not package_json_path.exists():
            return None

        try:
            with open(package_json_path, encoding="utf-8") as f:
                pkg = json.load(f)
        except (json.JSONDecodeError, OSError):
            return None

        scripts = pkg.get("scripts", {})
        if not scripts:
            return None

        # Priority order for dev server scripts
        script_priority = ["dev", "start", "serve"]

        for script_name in script_priority:
            cmd = scripts.get(script_name, "")
            if not cmd:
                continue
            # Skip Electron scripts
            if "electron" in cmd.lower():
                continue

            # Detect port from command
            port = 3000  # default
            port_match = re.search(r"--port\s+(\d+)", cmd)
            if port_match:
                port = int(port_match.group(1))
            elif "vite" in cmd.lower():
                port = 5173
            elif "next" in cmd.lower():
                port = 3000

            # Use npm/npx to run the script
            run_cmd = f"npm run {script_name}"
            return (run_cmd, port)

        return None

    def _start_dev_server(self, cmd: str, port: int) -> tuple[str, subprocess.Popen]:
        """Start dev server and wait for it to be ready.

        Returns (url, process).
        Raises TimeoutError if server doesn't start within 60s.
        """
        emit_review_merge_log("info", content=f"Starting dev server: {cmd} (port {port})", stage="e2e_testing")

        env = os.environ.copy()
        env["PORT"] = str(port)
        env["BROWSER"] = "none"  # Don't auto-open browser

        # Start process in its own process group for clean shutdown
        kwargs: dict = {
            "cwd": str(self.worktree_path),
            "stdout": subprocess.DEVNULL,
            "stderr": subprocess.DEVNULL,
            "env": env,
            "shell": True,
        }
        if os.name != "nt":
            kwargs["preexec_fn"] = os.setsid

        process = subprocess.Popen(cmd, **kwargs)

        # Poll until server is ready
        url = f"http://localhost:{port}"
        timeout = 60
        start_time = time.time()

        while time.time() - start_time < timeout:
            try:
                req = urllib.request.Request(url, method="HEAD")
                with urllib.request.urlopen(req, timeout=2):
                    emit_review_merge_log("success", content=f"Dev server ready at {url}", stage="e2e_testing")
                    return (url, process)
            except Exception:
                pass

            # Check if process died
            if process.poll() is not None:
                raise RuntimeError(f"Dev server exited with code {process.returncode}")

            time.sleep(2)

        raise TimeoutError(f"Dev server did not start within {timeout}s")

    def _stop_dev_server(self, process: subprocess.Popen) -> None:
        """Stop the dev server process and its children."""
        try:
            if os.name != "nt":
                os.killpg(process.pid, signal.SIGTERM)
            else:
                subprocess.run(
                    ["taskkill", "/T", "/F", "/PID", str(process.pid)],
                    capture_output=True,
                    timeout=10,
                )
            process.wait(timeout=5)
        except (OSError, subprocess.TimeoutExpired, ProcessLookupError):
            try:
                if os.name != "nt":
                    os.killpg(process.pid, signal.SIGKILL)
                process.wait(timeout=3)
            except Exception:
                pass
        except Exception:
            pass

    async def _run_e2e_smoke_test(self, dev_server_url: str) -> tuple[bool, str]:
        """Run E2E smoke test agent against the dev server.

        Returns (passed, error_summary).
        """
        changed_files = self._get_changed_files()
        files_list = "\n".join(f"- {f}" for f in changed_files[:30])

        # Load prompt template
        prompt_path = Path(__file__).parent.parent.parent / "prompts" / "review_merge_e2e_tester.md"
        try:
            prompt_template = prompt_path.read_text(encoding="utf-8")
        except FileNotFoundError:
            prompt_template = ""

        prompt = prompt_template.replace("{{url}}", dev_server_url).replace("{{changed_files}}", files_list)
        if not prompt.strip():
            # Fallback inline prompt if template not found
            prompt = f"""You are an E2E smoke test agent. Use playwright-cli via Bash to test a running web app.

Steps:
1. Run: playwright-cli open {dev_server_url}
2. Run: playwright-cli console  (check for JS errors)
3. Run: playwright-cli snapshot  (identify navigation links by ref)
4. Click links: playwright-cli click <ref>
5. After each click: playwright-cli console
6. Test at most 10 pages
7. Run: playwright-cli close
8. Output results as JSON

Changed files:
{files_list}

Output ONLY valid JSON on the last line:
{{"passed": true|false, "pages_tested": N, "errors": [{{"page": "/path", "type": "console_error", "message": "...", "severity": "high"}}]}}
"""

        qa_model = get_phase_model(self.spec_dir, "qa", self.model)
        qa_betas = get_phase_model_betas(self.spec_dir, "qa", qa_model)
        fast_mode = get_fast_mode(self.spec_dir)
        qa_thinking_kwargs = get_phase_client_thinking_kwargs(
            self.spec_dir, "qa", qa_model, self.thinking_level
        )

        emit_review_merge_log("info", content=f"E2E testing with model: {qa_model}", stage="e2e_testing")

        client = create_client(
            self.project_dir,
            self.spec_dir,
            qa_model,
            agent_type="review_merge_e2e_tester",
            betas=qa_betas,
            fast_mode=fast_mode,
            **qa_thinking_kwargs,
        )

        async with client:
            _status, response = await self._run_agent_with_tools(
                client, prompt, "e2e_testing"
            )

        # Parse JSON result from last line
        return self._parse_e2e_result(response)

    def _parse_e2e_result(self, response: str) -> tuple[bool, str]:
        """Parse E2E smoke test agent response.

        Returns (passed, error_summary).
        Tries JSON parsing first, then falls back to keyword detection
        for agents that return markdown instead of JSON.
        """
        # Try to find JSON in the response (last JSON object)
        json_text = ""
        for line in reversed(response.strip().splitlines()):
            line = line.strip()
            if line.startswith("{"):
                json_text = line
                break

        # Also try extracting from markdown code blocks
        if not json_text and "```" in response:
            parts = response.split("```")
            for part in parts:
                stripped = part.strip()
                if stripped.startswith("json"):
                    stripped = stripped[4:].strip()
                if stripped.startswith("{"):
                    json_text = stripped.split("\n")[0] if "\n" in stripped else stripped
                    break

        # Try regex to find {"passed": ...} anywhere in text
        if not json_text:
            json_match = re.search(r'\{[^{}]*"passed"\s*:\s*(true|false)[^{}]*\}', response)
            if json_match:
                json_text = json_match.group(0)

        if json_text:
            try:
                result = json.loads(json_text)
                passed = result.get("passed", False)
                errors = result.get("errors", [])
                if errors:
                    error_msgs = [f"{e.get('page', '?')}: {e.get('message', '?')}" for e in errors[:5]]
                    return (passed, "; ".join(error_msgs))
                return (passed, "")
            except (json.JSONDecodeError, ValueError):
                pass

        # Fallback: keyword detection for markdown-formatted results
        response_lower = response.lower()
        has_passed = any(
            marker in response_lower
            for marker in ["✅ passed", "status: passed", "**passed**", "status:**passed"]
        )
        has_failed = any(
            marker in response_lower
            for marker in ["❌ failed", "status: failed", "**failed**", "status:**failed"]
        )

        if has_passed and not has_failed:
            debug("review_merge", "E2E result parsed via keyword fallback: PASSED")
            return (True, "")
        elif has_failed:
            debug("review_merge", "E2E result parsed via keyword fallback: FAILED")
            # Try to extract error summary from response
            error_summary = ""
            for line in response.splitlines():
                if "error" in line.lower() and (":" in line or "-" in line):
                    error_summary = line.strip()[:200]
                    break
            return (False, error_summary or "E2E test failed (details in agent output)")

        debug_warning("review_merge", "Failed to parse E2E test result JSON or keywords")
        return (False, "Could not parse E2E test results")

    def _save_checkpoint(
        self,
        stage: str,
        findings: "ReviewFindings",
        conflicts: list[str],
        iterations_used: int,
        fix_history: list[FixAttemptRecord],
    ) -> None:
        """Save pipeline checkpoint for --continue resume."""
        from dataclasses import asdict
        checkpoint = ReviewMergeCheckpoint(
            last_completed_stage=stage,
            findings=[asdict(f) for f in findings.findings],
            conflicts=conflicts,
            iterations_used=iterations_used,
            fix_history=[asdict(h) for h in fix_history],
        )
        checkpoint.save(self.spec_dir)
        debug("review_merge", f"Checkpoint saved: stage={stage}, iterations={iterations_used}")

    async def run(self) -> ReviewMergeResult:
        """Execute the complete review-merge pipeline."""
        debug_section("review_merge", "Starting Review & Merge Pipeline")
        debug(
            "review_merge",
            f"spec={self.spec_name}, worktree={self.worktree_path}, base={self.base_branch}",
        )

        emit_review_merge_log("info", content=f"Worktree: {self.worktree_path}", stage="reviewing")
        emit_review_merge_log("info", content=f"Base branch: {self.base_branch}", stage="reviewing")

        # ── RESUME FROM CHECKPOINT (--continue) ──
        checkpoint: ReviewMergeCheckpoint | None = None
        if self.continue_run:
            checkpoint = ReviewMergeCheckpoint.load(self.spec_dir)
            if checkpoint:
                debug(
                    "review_merge",
                    f"Resuming from checkpoint: stage={checkpoint.last_completed_stage}, "
                    f"iterations_used={checkpoint.iterations_used}",
                )
                emit_review_merge_log(
                    "info",
                    content=f"Resuming from checkpoint (last stage: {checkpoint.last_completed_stage})",
                    stage="reviewing",
                )
            else:
                debug_warning("review_merge", "No checkpoint found — starting fresh")
                emit_review_merge_log(
                    "info",
                    content="No checkpoint found — starting from the beginning",
                    stage="reviewing",
                )

        if checkpoint and checkpoint.last_completed_stage in (
            "reviewing", "checking_conflicts", "fixing", "e2e_testing", "creating_pr",
        ):
            # Restore state from checkpoint
            findings = checkpoint.restore_findings()
            fix_history = checkpoint.restore_fix_history()
            iterations_used = checkpoint.iterations_used

            emit_review_merge_progress(
                "reviewing",
                f"Restored review findings: {findings.summary()}",
                percent=20,
                findings_summary=findings.summary(),
            )

            # Always re-check conflicts (fast operation, state may have changed)
            emit_review_merge_progress(
                "checking_conflicts", "Re-checking merge conflicts...", percent=25
            )
            conflicts = self._check_conflicts()
            if conflicts:
                emit_review_merge_progress(
                    "checking_conflicts",
                    f"Found {len(conflicts)} conflict(s)",
                    percent=30,
                    conflicts=conflicts,
                )
        else:
            # ── PHASE 1: REVIEW (Claude agent + optional CodeRabbit) ──
            emit_review_merge_progress("reviewing", "Running code review...", percent=5)
            emit_phase(ExecutionPhase.QA_REVIEW, "Running code review")

            findings = await self._run_code_review()
            emit_review_merge_progress(
                "reviewing",
                f"Review complete: {findings.summary()}",
                percent=20,
                findings_summary=findings.summary(),
            )

            # ── PHASE 2: CONFLICT CHECK ──
            emit_review_merge_progress(
                "checking_conflicts", "Checking for merge conflicts...", percent=25
            )
            conflicts = self._check_conflicts()

            if conflicts:
                emit_review_merge_progress(
                    "checking_conflicts",
                    f"Found {len(conflicts)} conflict(s)",
                    percent=30,
                    conflicts=conflicts,
                )

            # Save checkpoint after review + conflict check
            iterations_used = 0
            fix_history: list[FixAttemptRecord] = []
            self._save_checkpoint("checking_conflicts", findings, conflicts, iterations_used, fix_history)

        # ── PHASE 3: FIX LOOP (autonomous — always completes) ──
        # When resuming, skip fix loop if it was already completed
        skip_fix_loop = checkpoint is not None and checkpoint.last_completed_stage in (
            "e2e_testing", "creating_pr",
        )

        if not skip_fix_loop and (findings.has_critical_issues() or conflicts):
            for iteration in range(1, self.max_iterations + 1):
                iterations_used = iteration
                loop_base = 30
                loop_range = 40  # 30-70% range for fix loop
                iter_percent = loop_base + int(
                    (iteration / self.max_iterations) * loop_range
                )

                escalation_level = self._get_escalation_level(iteration)
                unfixed_before = findings.unfixed_critical_high()
                findings_before_count = len(unfixed_before)

                if escalation_level != "normal":
                    debug(
                        "review_merge",
                        f"Escalation level: {escalation_level} (iteration {iteration})",
                    )

                # PLAN
                emit_review_merge_progress(
                    "planning",
                    f"Planning fixes (iteration {iteration}/{self.max_iterations}, {escalation_level})",
                    iteration=iteration,
                    max_iterations=self.max_iterations,
                    percent=iter_percent,
                    findings_summary=findings.summary(),
                )
                emit_phase(
                    ExecutionPhase.QA_FIXING,
                    f"Planning fixes — iteration {iteration}",
                )

                try:
                    plan = await self._plan_fixes(
                        findings, conflicts,
                        escalation_level=escalation_level,
                        fix_history=fix_history,
                        iteration=iteration,
                    )
                except Exception as e:
                    debug_error("review_merge", f"Planning failed: {e}")
                    capture_exception(e)
                    emit_review_merge_progress(
                        "planning",
                        f"Planning attempt failed, retrying: {e}",
                        percent=iter_percent,
                    )
                    self._save_checkpoint("fixing", findings, conflicts, iterations_used, fix_history)
                    continue

                # BUILD
                emit_review_merge_progress(
                    "building",
                    f"Applying fixes (iteration {iteration}/{self.max_iterations})",
                    iteration=iteration,
                    max_iterations=self.max_iterations,
                    percent=iter_percent + 5,
                )

                try:
                    await self._apply_fixes(plan, escalation_level=escalation_level)
                except Exception as e:
                    debug_error("review_merge", f"Fix application failed: {e}")
                    capture_exception(e)
                    emit_review_merge_progress(
                        "building",
                        f"Fix attempt failed, retrying: {e}",
                        percent=iter_percent,
                    )
                    self._save_checkpoint("fixing", findings, conflicts, iterations_used, fix_history)
                    continue

                # VERIFY (targeted — only checks previous findings, no new discoveries)
                emit_review_merge_progress(
                    "verifying",
                    f"Verifying fixes (iteration {iteration}/{self.max_iterations})",
                    iteration=iteration,
                    max_iterations=self.max_iterations,
                    percent=iter_percent + 10,
                )
                emit_phase(
                    ExecutionPhase.QA_REVIEW,
                    f"Verifying fixes — iteration {iteration}",
                )

                findings = await self._run_targeted_verification(findings)
                conflicts = self._check_conflicts()

                # Record fix attempt for escalation context
                unfixed_after = findings.unfixed_critical_high()
                newly_fixed = [
                    f.description[:60] for f in unfixed_before
                    if f.fixed or f.accepted
                ]
                still_remaining = [f.description[:60] for f in unfixed_after]

                fix_history.append(FixAttemptRecord(
                    iteration=iteration,
                    plan_summary=plan[:200] if plan else "",
                    findings_before=findings_before_count,
                    findings_after=len(unfixed_after),
                    newly_fixed=newly_fixed,
                    still_remaining=still_remaining,
                ))

                # Save checkpoint after each completed iteration
                self._save_checkpoint("fixing", findings, conflicts, iterations_used, fix_history)

                if not findings.has_critical_issues() and not conflicts:
                    debug_success(
                        "review_merge",
                        f"All issues resolved after {iteration} iteration(s)",
                    )
                    break

                # Force resolve: accept remaining issues on final iteration
                if escalation_level == "force_resolve" and findings.has_critical_issues():
                    remaining = findings.unfixed_critical_high()
                    for f in remaining:
                        f.accepted = True
                        f.acceptance_reason = (
                            f"Accepted after {iteration} fix iterations — "
                            f"TODO(review-merge) comment added in code"
                        )
                    debug_warning(
                        "review_merge",
                        f"Force-accepted {len(remaining)} remaining issue(s) after {iteration} iterations",
                    )
                    emit_review_merge_progress(
                        "verifying",
                        f"Accepted {len(remaining)} remaining issue(s) as trade-offs",
                        iteration=iteration,
                        max_iterations=self.max_iterations,
                        percent=iter_percent + 12,
                        findings_summary=findings.summary(),
                    )
                    break
            else:
                # Max iterations reached without break — accept remaining
                remaining = findings.unfixed_critical_high()
                if remaining:
                    for f in remaining:
                        f.accepted = True
                        f.acceptance_reason = f"Max iterations ({self.max_iterations}) exhausted"
                    debug_warning(
                        "review_merge",
                        f"Max iterations ({self.max_iterations}) reached — force-accepted {len(remaining)} issue(s)",
                    )

                msg = f"Max iterations reached. Accepted remaining issues: {findings.summary()}"
                emit_review_merge_progress(
                    "max_iterations",
                    msg,
                    iteration=self.max_iterations,
                    max_iterations=self.max_iterations,
                    percent=70,
                    findings_summary=findings.summary(),
                )
                # Pipeline ALWAYS continues to PR + merge

        # ── PHASE 3.5: E2E SMOKE TESTING (web projects only) ──
        if self._should_run_e2e():
            emit_review_merge_progress("e2e_testing", "Starting E2E smoke test...", percent=55)
            emit_phase(ExecutionPhase.QA_REVIEW, "Running E2E smoke test")
            dev_server_process = None
            try:
                server_info = self._detect_dev_server_command()
                if server_info:
                    cmd, port = server_info
                    url, dev_server_process = self._start_dev_server(cmd, port)

                    for e2e_iter in range(1, self.max_iterations + 1):
                        percent = 55 + int((e2e_iter / self.max_iterations) * 20)
                        emit_review_merge_progress(
                            "e2e_testing",
                            f"E2E test iteration {e2e_iter}/{self.max_iterations}",
                            iteration=e2e_iter,
                            max_iterations=self.max_iterations,
                            percent=percent,
                        )

                        passed, error_summary = await self._run_e2e_smoke_test(url)
                        if passed:
                            emit_review_merge_log("success", content="E2E smoke test passed", stage="e2e_testing")
                            break

                        # Failed — fix and retry
                        emit_review_merge_log(
                            "error",
                            content=f"E2E issues found: {error_summary}",
                            stage="e2e_testing",
                        )

                        emit_review_merge_progress(
                            "planning",
                            f"Fixing E2E issues (iteration {e2e_iter})",
                            iteration=e2e_iter,
                            max_iterations=self.max_iterations,
                            percent=percent,
                        )

                        e2e_findings = ReviewFindings(
                            findings=[
                                ReviewFinding(
                                    file="",
                                    line=None,
                                    severity="high",
                                    description=f"E2E smoke test failure: {error_summary}",
                                )
                            ]
                        )
                        plan = await self._plan_fixes(e2e_findings, [])

                        emit_review_merge_progress(
                            "building",
                            f"Applying E2E fixes (iteration {e2e_iter})",
                            iteration=e2e_iter,
                            max_iterations=self.max_iterations,
                            percent=percent + 5,
                        )
                        await self._apply_fixes(plan)

                        # Restart dev server to pick up changes
                        self._stop_dev_server(dev_server_process)
                        url, dev_server_process = self._start_dev_server(cmd, port)
                    else:
                        emit_review_merge_log(
                            "error",
                            content="E2E issues remain after max iterations — continuing to PR",
                            stage="e2e_testing",
                        )
            except Exception as e:
                debug_error("review_merge", f"E2E testing failed: {e}")
                capture_exception(e)
                emit_review_merge_log(
                    "error",
                    content=f"E2E testing failed: {e} — continuing to PR",
                    stage="e2e_testing",
                )
                # Non-fatal — continue to PR creation
            finally:
                if dev_server_process:
                    self._stop_dev_server(dev_server_process)

        # Save checkpoint before PR creation (in case PR/merge fails, resume can skip fix loop)
        self._save_checkpoint("e2e_testing", findings, conflicts, iterations_used, fix_history)

        # ── PHASE 4: CREATE PR ──
        emit_review_merge_progress(
            "creating_pr", "Pushing branch and creating PR...", percent=78
        )
        emit_phase(ExecutionPhase.CODING, "Creating pull request")
        emit_review_merge_log("tool_start", tool_name="Bash", tool_input=f"git push + gh pr create --base {self.pr_target or self.base_branch}", stage="creating_pr")

        pr_url = None
        try:
            pr_result = self.worktree_mgr.push_and_create_pr(
                spec_name=self.spec_name,
                target_branch=self.pr_target,
                title=self.pr_title,
                draft=self.pr_draft,
            )
            if pr_result.get("success"):
                pr_url = pr_result.get("pr_url")
                emit_review_merge_log("tool_end", tool_name="Bash", detail=f"PR created: {pr_url}", stage="creating_pr")
                emit_review_merge_log("success", content=f"PR created: {pr_url}", stage="creating_pr")
                emit_review_merge_progress(
                    "creating_pr",
                    f"PR created: {pr_url}",
                    percent=85,
                )
            elif pr_result.get("already_exists"):
                pr_url = pr_result.get("pr_url")
                emit_review_merge_log("tool_end", tool_name="Bash", detail=f"PR already exists: {pr_url}", stage="creating_pr")
                emit_review_merge_log("info", content=f"PR already exists: {pr_url}", stage="creating_pr")
                emit_review_merge_progress(
                    "creating_pr",
                    f"PR already exists: {pr_url}",
                    percent=85,
                )
            else:
                error_msg = pr_result.get("error", "Unknown error creating PR")
                emit_review_merge_log("tool_end", tool_name="Bash", success=False, detail=error_msg, stage="creating_pr")
                emit_review_merge_log("error", content=f"PR creation failed: {error_msg}", stage="creating_pr")
                emit_review_merge_progress(
                    "error", f"PR creation failed: {error_msg}", percent=80
                )
                return ReviewMergeResult(
                    success=False,
                    message=f"PR creation failed: {error_msg}",
                    iterations_used=iterations_used,
                    findings_summary=findings.summary(),
                )
        except Exception as e:
            debug_error("review_merge", f"PR creation failed: {e}")
            capture_exception(e)
            emit_review_merge_log("tool_end", tool_name="Bash", success=False, detail=str(e), stage="creating_pr")
            emit_review_merge_log("error", content=f"PR creation failed: {e}", stage="creating_pr")
            emit_review_merge_progress(
                "error", f"PR creation failed: {e}", percent=80
            )
            return ReviewMergeResult(
                success=False,
                message=f"PR creation failed: {e}",
                iterations_used=iterations_used,
                findings_summary=findings.summary(),
            )

        # ── PHASE 5: MERGE ──
        if self.skip_merge:
            emit_review_merge_progress(
                "complete",
                f"PR created (merge skipped): {pr_url}",
                percent=100,
            )
            emit_phase(ExecutionPhase.COMPLETE, "Review & PR complete (merge skipped)")
            ReviewMergeCheckpoint.clear(self.spec_dir)
            return ReviewMergeResult(
                success=True,
                message="PR created successfully (merge skipped)",
                pr_url=pr_url,
                iterations_used=iterations_used,
                findings_summary=findings.summary(),
            )

        emit_review_merge_progress("merging", "Merging worktree...", percent=90)
        emit_phase(ExecutionPhase.CODING, "Merging worktree")

        # Pre-merge: commit any uncommitted changes in the worktree
        # (review fixes, E2E fixes, generated files like .auto-claude-status)
        try:
            status_result = subprocess.run(
                ["git", "status", "--porcelain"],
                cwd=str(self.worktree_path),
                capture_output=True,
                text=True,
                timeout=15,
            )
            if status_result.stdout.strip():
                emit_review_merge_log("info", content="Committing uncommitted worktree changes before merge...", stage="merging")
                subprocess.run(
                    ["git", "add", "-A"],
                    cwd=str(self.worktree_path),
                    capture_output=True,
                    text=True,
                )
                subprocess.run(
                    ["git", "commit", "-m", "chore: commit remaining changes before merge"],
                    cwd=str(self.worktree_path),
                    capture_output=True,
                    text=True,
                )
        except (subprocess.TimeoutExpired, subprocess.SubprocessError):
            pass  # Best-effort — merge may still work

        emit_review_merge_log("tool_start", tool_name="Bash", tool_input=f"git merge {self.spec_name} into {self.base_branch}", stage="merging")

        try:
            merge_success = self.worktree_mgr.merge_worktree(self.spec_name)
            if merge_success:
                emit_review_merge_log("tool_end", tool_name="Bash", detail="Merge successful", stage="merging")
                emit_review_merge_log("success", content=f"Merge successful! PR: {pr_url}", stage="merging")
                emit_review_merge_progress(
                    "complete",
                    f"Merge successful! PR: {pr_url}",
                    percent=100,
                )
                emit_phase(ExecutionPhase.COMPLETE, "Review & Merge complete")
                ReviewMergeCheckpoint.clear(self.spec_dir)
                return ReviewMergeResult(
                    success=True,
                    message="Review, PR, and merge completed successfully",
                    pr_url=pr_url,
                    iterations_used=iterations_used,
                    findings_summary=findings.summary(),
                )
            else:
                emit_review_merge_log("tool_end", tool_name="Bash", success=False, detail="Merge returned failure", stage="merging")
                emit_review_merge_log("error", content="Merge failed after PR creation", stage="merging")
                emit_review_merge_progress(
                    "error", "Merge failed", percent=95
                )
                return ReviewMergeResult(
                    success=False,
                    message="Merge failed after PR creation",
                    pr_url=pr_url,
                    iterations_used=iterations_used,
                    findings_summary=findings.summary(),
                )
        except Exception as e:
            debug_error("review_merge", f"Merge failed: {e}")
            capture_exception(e)
            emit_review_merge_log("tool_end", tool_name="Bash", success=False, detail=str(e), stage="merging")
            emit_review_merge_log("error", content=f"Merge failed: {e}", stage="merging")
            emit_review_merge_progress(
                "error", f"Merge failed: {e}", percent=95
            )
            return ReviewMergeResult(
                success=False,
                message=f"Merge failed: {e}",
                pr_url=pr_url,
                iterations_used=iterations_used,
                findings_summary=findings.summary(),
            )


def main():
    """CLI entry point."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Review & Merge pipeline: CodeRabbit review → AI fix loop → PR → merge",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--spec",
        type=str,
        required=True,
        help="Spec name/ID (e.g., 001-feature)",
    )
    parser.add_argument(
        "--project-dir",
        type=Path,
        default=Path.cwd(),
        help="Project directory (default: current directory)",
    )
    parser.add_argument(
        "--base-branch",
        type=str,
        default=None,
        help="Base branch to compare against (default: auto-detect)",
    )
    parser.add_argument(
        "--max-iterations",
        type=int,
        default=5,
        help="Maximum fix iterations (default: 5)",
    )
    parser.add_argument(
        "--model",
        type=str,
        default=None,
        help="Claude model to use (default: from phase config)",
    )
    parser.add_argument(
        "--thinking-level",
        type=str,
        default=None,
        help="Thinking level for AI agents (default: from phase config)",
    )
    parser.add_argument(
        "--pr-target",
        type=str,
        default=None,
        help="Target branch for PR (default: base branch)",
    )
    parser.add_argument(
        "--pr-title",
        type=str,
        default=None,
        help="Custom PR title (default: generated from spec name)",
    )
    parser.add_argument(
        "--pr-draft",
        action="store_true",
        help="Create PR as draft",
    )
    parser.add_argument(
        "--skip-merge",
        action="store_true",
        help="Skip the merge step (only review + PR)",
    )
    parser.add_argument(
        "--skip-e2e",
        action="store_true",
        help="Skip E2E smoke testing",
    )
    parser.add_argument(
        "--continue",
        dest="continue_run",
        action="store_true",
        help="Resume from last checkpoint instead of starting fresh",
    )

    args = parser.parse_args()

    if args.thinking_level:
        args.thinking_level = sanitize_thinking_level(args.thinking_level)

    try:
        runner = ReviewMergeRunner(
            project_dir=args.project_dir,
            spec_name=args.spec,
            base_branch=args.base_branch,
            max_iterations=args.max_iterations,
            model=args.model,
            thinking_level=args.thinking_level,
            pr_target=args.pr_target,
            pr_title=args.pr_title,
            pr_draft=args.pr_draft,
            skip_merge=args.skip_merge,
            skip_e2e=args.skip_e2e,
            continue_run=args.continue_run,
        )

        result = asyncio.run(runner.run())

        # Output final result as JSON for frontend parsing
        print(
            json.dumps(
                {
                    "success": result.success,
                    "message": result.message,
                    "pr_url": result.pr_url,
                    "iterations_used": result.iterations_used,
                    "findings_summary": result.findings_summary,
                },
                default=str,
            )
        )

        sys.exit(0 if result.success else 1)

    except FileNotFoundError as e:
        emit_review_merge_progress("error", str(e), percent=0)
        emit_phase(ExecutionPhase.FAILED, str(e))
        print(json.dumps({"success": False, "message": str(e)}))
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n\nOperation interrupted.")
        sys.exit(1)
    except Exception as e:
        capture_exception(e)
        emit_review_merge_progress("error", f"Unexpected error: {e}", percent=0)
        emit_phase(ExecutionPhase.FAILED, str(e))
        print(json.dumps({"success": False, "message": f"Unexpected error: {e}"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
