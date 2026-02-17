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
import shutil
import subprocess
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

from .models import ReviewFinding, ReviewFindings, ReviewMergeResult

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

            merge_output = (result.stdout + result.stderr)[:1000]
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

    async def _plan_fixes(
        self, findings: ReviewFindings, conflicts: list[str]
    ) -> str:
        """Use Claude agent with tool access to plan fixes."""
        # Build context for the planner
        issues_text = []
        for f in findings.findings:
            if f.severity in ("critical", "high") and not f.fixed:
                loc = f"{f.file}:{f.line}" if f.line else f.file
                issues_text.append(
                    f"- [{f.severity.upper()}] {loc}: {f.description}"
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

    async def _apply_fixes(self, plan: str) -> None:
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

    async def run(self) -> ReviewMergeResult:
        """Execute the complete review-merge pipeline."""
        debug_section("review_merge", "Starting Review & Merge Pipeline")
        debug(
            "review_merge",
            f"spec={self.spec_name}, worktree={self.worktree_path}, base={self.base_branch}",
        )

        emit_review_merge_log("info", content=f"Worktree: {self.worktree_path}", stage="reviewing")
        emit_review_merge_log("info", content=f"Base branch: {self.base_branch}", stage="reviewing")

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

        # ── PHASE 3: FIX LOOP ──
        iterations_used = 0
        recurring_tracker: dict[str, int] = {}  # description -> count

        if findings.has_critical_issues() or conflicts:
            for iteration in range(1, self.max_iterations + 1):
                iterations_used = iteration
                loop_base = 30
                loop_range = 40  # 30-70% range for fix loop
                iter_percent = loop_base + int(
                    (iteration / self.max_iterations) * loop_range
                )

                # Track recurring issues
                for f in findings.findings:
                    if f.severity in ("critical", "high") and not f.fixed:
                        key = f"{f.file}:{f.description[:50]}"
                        recurring_tracker[key] = recurring_tracker.get(key, 0) + 1
                        if recurring_tracker[key] >= 3:
                            debug_warning(
                                "review_merge",
                                f"Recurring issue detected (3+ times): {key}",
                            )
                            msg = f"Stopping: recurring issue not auto-resolvable — {f.description}"
                            emit_review_merge_progress(
                                "error",
                                msg,
                                iteration=iteration,
                                max_iterations=self.max_iterations,
                                percent=iter_percent,
                            )
                            return ReviewMergeResult(
                                success=False,
                                message=msg,
                                iterations_used=iteration,
                                findings_summary=findings.summary(),
                                remaining_issues=[
                                    f
                                    for f in findings.findings
                                    if not f.fixed
                                    and f.severity in ("critical", "high")
                                ],
                            )

                # PLAN
                emit_review_merge_progress(
                    "planning",
                    f"Planning fixes (iteration {iteration}/{self.max_iterations})",
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
                    plan = await self._plan_fixes(findings, conflicts)
                except Exception as e:
                    debug_error("review_merge", f"Planning failed: {e}")
                    capture_exception(e)
                    emit_review_merge_progress(
                        "error", f"Planning failed: {e}", percent=iter_percent
                    )
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
                    await self._apply_fixes(plan)
                except Exception as e:
                    debug_error("review_merge", f"Fix application failed: {e}")
                    capture_exception(e)
                    emit_review_merge_progress(
                        "error", f"Fix application failed: {e}", percent=iter_percent
                    )
                    continue

                # VERIFY
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

                findings = await self._run_code_review()
                conflicts = self._check_conflicts()

                if not findings.has_critical_issues() and not conflicts:
                    debug_success(
                        "review_merge",
                        f"All issues resolved after {iteration} iteration(s)",
                    )
                    break
            else:
                # Max iterations reached
                debug_warning(
                    "review_merge",
                    f"Max iterations ({self.max_iterations}) reached with remaining issues",
                )
                remaining = [
                    f
                    for f in findings.findings
                    if not f.fixed and f.severity in ("critical", "high")
                ]
                msg = f"Max iterations reached. Remaining issues: {findings.summary()}"
                emit_review_merge_progress(
                    "max_iterations",
                    msg,
                    iteration=self.max_iterations,
                    max_iterations=self.max_iterations,
                    percent=70,
                    findings_summary=findings.summary(),
                )
                # Continue to PR creation even with remaining issues
                # The user can decide to merge or not

        # ── PHASE 4: CREATE PR ──
        emit_review_merge_progress(
            "creating_pr", "Pushing branch and creating PR...", percent=75
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
            return ReviewMergeResult(
                success=True,
                message="PR created successfully (merge skipped)",
                pr_url=pr_url,
                iterations_used=iterations_used,
                findings_summary=findings.summary(),
            )

        emit_review_merge_progress("merging", "Merging worktree...", percent=90)
        emit_phase(ExecutionPhase.CODING, "Merging worktree")
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
