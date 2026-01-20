# Codebase Concerns

**Analysis Date:** 2026-01-20

## Tech Debt

**Missing Type Hints - `apps/backend/core/workspace.py` (2096 lines)**
- Issue: Multiple functions missing return type annotations
- Files: `apps/backend/core/workspace.py` (lines 51-69, 148, 345, 388, 745, 1079, 1717, 1753, 1814, 1920, 2042)
- Why: Helper functions defined dynamically within exception handlers
- Impact: Reduces IDE support, increases runtime errors, makes refactoring risky
- Fix approach: Add explicit type hints for all public functions, extract helpers from exception blocks

**Platform-Specific Code Scattered**
- Issue: Direct `process.platform` checks instead of using platform abstraction
- Files:
  - `apps/frontend/src/main/claude-cli-utils.ts:15` - `process.platform === 'win32'`
  - `apps/frontend/src/main/cli-tool-manager.ts:958-959, 1097-1098` - Hardcoded Windows paths
  - `apps/frontend/src/main/config-paths.ts:79` - Platform checks with env vars
  - `apps/frontend/src/main/index.ts:124, 127, 248, 254, 266, 277, 461` - Multiple `process.platform === 'darwin'` checks
  - `apps/frontend/src/main/python-detector.ts:20, 55` - Platform detection without abstraction
- Why: Incrementally added features without refactoring to platform module
- Impact: Risk of platform-specific bugs on Windows/macOS/Linux; violates CLAUDE.md guidance
- Fix approach: Migrate all platform checks to `apps/frontend/src/main/platform/` module; use `isWindows()`, `isMacOS()`, `findExecutable()` utilities

**Large Files Needing Refactoring**
- Issue: 8 files exceed 1000 lines, indicating too many responsibilities
- Files:
  - `apps/backend/core/workspace.py` (2096 lines) - Merge logic, AI resolution, branching
  - `apps/backend/runners/github/orchestrator.py` (1607 lines) - PR review orchestration
  - `apps/backend/core/worktree.py` (1404 lines) - Worktree management
  - `apps/backend/runners/github/context_gatherer.py` (1292 lines) - PR context gathering
  - `apps/backend/runners/github/services/parallel_followup_reviewer.py` (1285 lines) - Parallel review
  - `apps/backend/cli/workspace_commands.py` (1220 lines) - CLI workspace commands
  - `apps/backend/runners/github/gh_client.py` (1216 lines) - GitHub API wrapper
  - `apps/backend/runners/github/batch_issues.py` (1159 lines) - Batch issue handling
- Why: Incremental feature additions without refactoring
- Impact: Difficult to maintain, test, and understand; high risk of bugs
- Fix approach: Split by domain - e.g., `workspace.py` → `workspace/merge.py`, `workspace/conflict_resolution.py`, `workspace/ai_merge.py`

## Known Bugs

**Race Condition in Merge Completion Tracking**
- Symptoms: Context tracking incomplete after merge operations
- Trigger: Merging completed builds
- Files: `apps/backend/core/workspace.py:1578`
- Root cause: `_record_merge_completion` function not yet implemented (TODO comment)
- Impact: Loss of evolution tracking context across merge operations
- Fix: Implement `_record_merge_completion` to track merge completion in Evolution Tracker

**Brittle Error Detection - i18n Breaking Change**
- Symptoms: UI shows incorrect status (error vs. skipped) when error messages are translated
- Trigger: String-based error detection using lowercase message parsing
- Files: `apps/frontend/src/renderer/components/BulkPRDialog.tsx:32` (`isWorktreeRelatedError()` function, lines 35-40)
- Root cause: `lowerMsg.includes('worktree')` will break with i18n translations
- Impact: Incorrect UI state, user confusion
- Fix: Use error codes/types instead of string matching; or maintain English-only error detection with i18n-safe fallback

**Missing i18n Translation Keys**
- Symptoms: Hardcoded English messages in settings connection logic
- Files: `apps/frontend/src/renderer/stores/settings-store.ts:214`
- Root cause: TODO comment - "Use i18n translation keys (settings:connection.successTitle, settings:connection.successDescription)"
- Impact: English-only UI for critical settings feedback; violates i18n requirements
- Fix: Replace hardcoded strings with `t('settings:connection.successTitle')` and `t('settings:connection.successDescription')`

**Missing Props Interface**
- Files: `apps/frontend/src/renderer/components/ideation/EnvConfigModal.tsx:1`
- Root cause: TODO for defining proper props interface
- Impact: Type safety issues; component contract unclear
- Fix: Define `EnvConfigModalProps` interface with required/optional properties

## Security Considerations

**Unsafe String Operations Without Null Checks**
- Risk: Functions call `.split()`, `.replace()`, `.strip()`, `.lower()` on potentially null/undefined values
- Files:
  - `apps/backend/security/scan_secrets.py` - Secret pattern matching without length validation
  - `apps/backend/runners/github/gh_client.py` - Parsing git output with string operations
- Current mitigation: None - relies on callers providing valid input
- Recommendations: Add null/undefined checks before string operations; validate input at function boundaries

**Missing Environment Variable Validation**
- Risk: 130+ uses of `os.environ.get()` and `os.getenv()` without validation of critical variables
- Files:
  - `apps/backend/core/client.py` - LINEAR_API_KEY obtained but not validated
  - `apps/backend/integrations/graphiti/config.py` - Multiple API keys/endpoints read without sanity checks
- Current mitigation: None - assumes env vars are correctly set
- Recommendations: Create environment variable validator; fail fast on startup if critical vars missing or invalid

**Subprocess Security**
- Risk: subprocess.run() calls without consistent input validation
- Files:
  - `apps/backend/services/orchestrator.py:305-415` - Multiple subprocess calls
  - `apps/backend/analysis/security_scanner.py` - Mixed safety levels
- Current mitigation: Security validation layer exists but not consistently applied
- Recommendations: Enforce validation through security hooks for all subprocess calls; sanitize inputs

## Performance Bottlenecks

**Project Index Cache - Potential Staleness**
- Problem: 5-minute TTL cache may become stale during long-running operations
- Files: `apps/backend/core/client.py:42-44`
- Measurement: Not measured (potential issue)
- Cause: No cache invalidation mechanism; threading lock adds overhead
- Improvement path: Implement cache invalidation on file system changes; use async locks

**String-Based Lookups in Loops**
- Problem: Regex patterns recompiled in loops
- Files:
  - `apps/backend/runners/github/sanitize.py` - Multiple regex pattern compilations
  - `apps/backend/security/scan_secrets.py` - Secret patterns recompiled for every file
- Measurement: Not measured (potential issue)
- Cause: Pattern compilation inside loop instead of module-level
- Improvement path: Compile patterns at module level; use pre-compiled regex patterns

## Fragile Areas

**Merge Orchestration - High Complexity**
- Files: `apps/backend/core/workspace.py` (2096 lines)
- Why fragile: Complex merge strategies, AI conflict resolution, multi-step branching logic
- Common failures: Merge conflicts not handled gracefully, partial merges leave inconsistent state
- Safe modification: Add comprehensive tests before changes; extract components to separate modules
- Test coverage: Limited tests for 2096-line orchestration file

**AI Merge Resolution - Undocumented Algorithms**
- Files: `apps/backend/merge/ai_resolver/resolver.py` (417 lines)
- Why fragile: AI-driven merge with minimal documentation of decision logic
- Common failures: Incorrect merge decisions hard to debug without understanding AI prompt context
- Safe modification: Document AI prompt construction; add test cases for common conflict scenarios
- Test coverage: No direct tests for AI merge resolution

**Deprecated Code Still Callable**
- Files:
  - `apps/backend/runners/github/confidence.py` - Entire module marked DEPRECATED
  - `apps/backend/runners/github/models.py:837` - Field marked deprecated
  - `apps/backend/runners/github/batch_issues.py:698` - Function `_analyze_issues_with_agents` marked DEPRECATED
- Why fragile: Old code paths still accessible; removal breaks unknown dependencies
- Safe modification: Create deprecation timeline; add runtime warnings; remove in major version
- Test coverage: Deprecated code may have tests that mask removal

## Scaling Limits

**Python 3.12+ Requirement**
- Current capacity: Only supports Python 3.12+
- Limit: Users with Python 3.10/3.11 cannot run Auto Claude
- Symptoms at limit: Startup failure with version check error
- Scaling path: Backport to Python 3.10 if needed; or clearly document requirement

**Embedded LadybugDB Memory Usage**
- Current capacity: In-process graph database scales with available RAM
- Limit: Large projects (>10k nodes) may cause memory pressure
- Symptoms at limit: Slow Graphiti queries, memory warnings
- Scaling path: Optimize graph queries; implement pagination; consider external database option

## Dependencies at Risk

**real_ladybug (>=0.13.0) - Early Version**
- Risk: Early version dependency; requires Python 3.12+
- Impact: Potential compatibility issues; breaking changes likely
- Migration plan: Monitor releases; pin version constraints; test upgrades

**react-hot-toast (Frontend)**
- Risk: Unmaintained (last update 18 months ago); React 19 compatibility unknown
- Impact: Toast notifications may break with React updates
- Migration plan: Switch to `sonner` (actively maintained, similar API)

## Missing Critical Features

**Payment Failure Handling**
- Problem: No robust error handling for failed payments in spec execution
- Current workaround: Manual retry by users
- Blocks: Cannot gracefully handle interrupted agent sessions due to API limits
- Implementation complexity: Medium (add retry logic, payment check hooks)

**Comprehensive Merge Testing**
- Problem: No end-to-end tests for merge workflows
- Files affected: `apps/backend/core/workspace.py` (2096 lines untested)
- Current workaround: Manual testing only
- Blocks: High risk of regressions in merge logic
- Implementation complexity: High (need test fixtures, mock git operations, AI responses)

## Test Coverage Gaps

**Core Workspace Merge Logic - No Unit Tests**
- What's not tested: 2096-line merge orchestration in `apps/backend/core/workspace.py`
- Risk: Merge logic could break silently; high regression risk
- Priority: High
- Difficulty to test: High (complex git operations, AI calls, multi-step flows)

**AI Merge Resolution - Not Directly Tested**
- What's not tested: AI-driven conflict resolution in `apps/backend/merge/ai_resolver/resolver.py`
- Files: `apps/backend/merge/ai_resolver/resolver.py` (417 lines)
- Risk: Incorrect merge decisions not caught until production use
- Priority: High
- Difficulty to test: High (need to mock Claude SDK responses, create realistic conflict scenarios)

**Frontend State Stores - Largely Untested**
- What's not tested: `roadmap-store.ts`, `ideation-store.ts`, many Zustand stores
- Risk: State management bugs could cause UI inconsistencies
- Priority: Medium
- Difficulty to test: Medium (need to mock IPC, Zustand testing patterns)

## Documentation Gaps

**Complex Code Lacking Comments**
- Files:
  - `apps/backend/merge/ai_resolver/resolver.py` (417 lines) - AI merge resolution minimal documentation
  - `apps/backend/merge/conflict_analysis.py:272` - TODO: "These advanced checks are currently TODO"
  - `apps/backend/analysis/insight_extractor.py` (643 lines) - Pattern extraction undocumented
  - `apps/backend/integrations/graphiti/queries_pkg/graphiti.py` (420 lines) - Graph operations minimally documented
- Impact: Difficult to understand complex algorithms; onboarding new developers harder
- Fix: Add docstrings for public functions; document complex algorithms with examples

**Missing CONTRIBUTING.md Guidelines**
- Problem: No centralized contributor guidelines beyond CLAUDE.md
- Impact: Contributors may not follow project conventions
- Fix: Create CONTRIBUTING.md with setup instructions, code style, PR process

## Configuration Issues

**Environment Variable Schema Validation Missing**
- Problem: No schema validation for required environment variables
- Files: `.env.example` exists but no runtime validation
- Impact: Silent failures when env vars incorrectly set
- Fix: Create startup validator; check critical env vars on app launch

**Graphiti LLM Provider Selection Undocumented**
- Problem: 5+ LLM/embedding providers but no documentation of priority/fallback
- Files: `apps/backend/integrations/graphiti/providers_pkg/`
- Impact: Users may not know which provider is used or how to configure
- Fix: Document provider selection logic; add examples to .env.example

---

*Concerns audit: 2026-01-20*
*Update as issues are fixed or new ones discovered*
