# Fork Sync Report

## Execution
- Timestamp (UTC): 2026-02-12T03:05:25Z
- Repository: /Users/guilhermevarela/Documents/Projetos/Auto-Claude
- Branch: develop
- Head before: 8e3024f3
- Head after: 54e43216
- Upstream base: upstream/main
- Upstream head synced: 5745cb14
- Previous synced upstream commit (from changelog): d639f6ef
- Merge status: merged-no-tree-change
- Working tree: dirty

## Current Situation
- Private commits vs upstream: 222
- Upstream commits detected: 1
- Upstream files changed: 1
- Conflicts auto-resolved with local priority: 0
- Protected path files reapplied from local HEAD: 0

## New From Upstream
- 5745cb14 docs: update README to v2.7.6-beta.1 [skip ci]
- Files touched by upstream commits (sample):
  - README.md

## Upstream Impact Analysis
- Documentation changed: review release notes and update internal runbooks if behavior changed.

## Expected Result
- Historico do upstream integrado via merge commit sem alterar arvore de arquivos local; customizacoes preservadas.

## App Test Validation
- Validation plan:
  - bun run test
  - bun run build
- Executed commands:
  - bun run test
- Test status: failed
- Test exit code: 1
- Failed command: bun run test
- Test log file: fork_sync_report.tests.log

### Test Log Tail
     ❯ src/renderer/stores/__tests__/terminal-font-settings-store.test.ts:299:32
        297| 
        298|       const state = useTerminalFontSettingsStore.getState();
        299|       expect(state.fontFamily).toEqual(['Ubuntu Mono', 'monospace']);
           |                                ^
        300|       expect(state.fontSize).toBe(13);
        301|       expect(state.cursorStyle).toBe('block');
    
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[8/9]⎯
    
     FAIL  src/renderer/lib/themes/__tests__/vscode-to-css-mapping.test.ts > vscode-to-css-mapping > composites hex colors with alpha channel against a base color
    AssertionError: expected '0 0% 15%' to be '0 0% 20%' // Object.is equality
    
    Expected: "0 0% 20%"
    Received: "0 0% 15%"
    
     ❯ src/renderer/lib/themes/__tests__/vscode-to-css-mapping.test.ts:18:53
         16|   it('composites hex colors with alpha channel against a base color', …
         17|     // White with ~7.5% alpha over dark base should remain a dark/mute…
         18|     expect(hexToHslTriplet('#E4E4E413', '#181818')).toBe('0 0% 20%');
           |                                                     ^
         19|   });
         20| 
    
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[9/9]⎯
    
    
     Test Files  2 failed | 114 passed (116)
          Tests  9 failed | 2860 passed | 6 skipped (2875)
       Start at  00:05:29
       Duration  31.57s (transform 10.84s, setup 1.46s, import 17.12s, tests 70.43s, environment 20.31s)
    
    npm error Lifecycle script `test` failed with error:
    npm error code 1
    npm error path /Users/guilhermevarela/Documents/Projetos/Auto-Claude/apps/frontend
    npm error workspace auto-claude-ui@2.7.6-beta.2
    npm error location /Users/guilhermevarela/Documents/Projetos/Auto-Claude/apps/frontend
    npm error command failed
    npm error command sh -c vitest run
    error: script "test" exited with code 1

## Origin Publish
- Origin remote: origin
- Push enabled: true
- Push status: skipped-tests-failed
- Push exit code: 0
- Sync before push: unknown
- Sync after push: unknown

