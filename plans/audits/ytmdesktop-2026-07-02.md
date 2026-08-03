AUDIT ytmdesktop @ 73e7bda7f530ca6ffbcf68902fc3d2cf6f24e1a1

## Impact map

**Branch:** `wip/remake-record-player` → PR #2 to `development` (`TroonCataroon/ytmdesktop-1`)

**Diff stat:** 110 files changed, 19,457 insertions(+), 3,075 deletions(-)

**Recent commits (15):**
1. `73e7bda` fix(ci): resolve vitest config ESM loading with Vite 8
2. `ef878e4` ci: bump Node to 20.18 for Vite 8 / Rolldown compatibility
3. `c232635` fix: validate builder server URL override
4. `f56f41d` perf(plugins): remove debug ingest and tighten vinyl lifecycle
5. `9016ace` fix(plugins): harden custom themes and auto-updater startup
6. `693d895` chore(deps): upgrade vite to 8 and plugin-vue to 6
7. `482c75a` refactor(vinyl-player): enhance settings update and logging
8. `ffe30c7` refactor(vinyl-player): streamline update settings logic
9. `05d4fc3` refactor(vinyl-player): simplify cover image handling and update UI structure
10. `951de2b` feat: add GitHub best practices expert agent
11. `93eeb3f` feat(vinyl-player): enhance vinyl player UI and functionality
12. `cffd4c5` chore: polish workflows, tooling, and integrations
13. `604c38d` chore(cursor): split architecture skill into focused skills
14. `a9a8e77` chore(cursor): add project subagents
15. `70db318` chore(cursor): add ytmdesktop-architecture project skill

**Files in scope (110):**

| Area | Files |
|------|-------|
| Cursor agents/skills | 24 (`.cursor/agents/*`, `.cursor/skills/ytmd-*`) |
| CI / tooling | `.github/workflows/{build,publish,quality}.yml`, `.scripts/resolve-builder-config.mjs`, `vitest.config.mts`, `forge.config.ts`, `viteconfig/renderer.ts`, `package.json`, `yarn.lock`, `.yarnrc.yml`, Yarn 4.10.3 binary |
| Builder config | `builder.config.json`, `builder.config.{local,staging,production}.json` |
| Main process | `src/main/index.ts` (+~1,294 lines), integrations (companion-server, crash-reporter, sentry, figma, notion, last-fm, discord, notifications), plugin system + 6 builtins |
| Vinyl player | `vinyl-player/index.ts` (~1,502 lines), 3 HTML shells, preload, 7 PNG assets, 6klabs bundled assets |
| Renderer | main/settings windows, `PluginSettings.vue`, `CrashReports.vue`, `UpdateSettings.vue`, `UpdateNotification.vue`, ytmview preload + scripts |
| Shared | `store/schema.ts`, `figma.config.ts`, `notion.config.ts`, `sentry.config.ts` |
| Tests | `src/main/utils/weak-cache.test.ts` |
| Docs | `README.md`, `.gitignore` |

**Thematic scope:** Vite 8 + Yarn 4.10 upgrade, vinyl-player remake/workshop modes, plugin manager + settings UI, crash reporting, Sentry/update monitoring, companion-server touch-ups, CI quality workflow.

---

## Pattern violations: 9 (top 3)

1. **`src/main/index.ts` is ~2,559 lines** — monolithic main entry owns window lifecycle, YTM view, CSP overrides, plugin IPC, safeStorage, updates, crash-report IPC, and integration wiring. Violates thin-routes / module-boundary convention; should split IPC registration and window orchestration into dedicated modules.
2. **Plugin IPC registered in main without sender guards** — `plugins:getList`, `plugins:toggle`, `plugins:updateSetting`, `vinyl-player:show/hide`, `6klabs-widget:getUrl` accept calls from any `webContents`. Other handlers (e.g. `settings:set`, `safeStorage:*`) correctly check `event.sender`.
3. **Workshop widget mode incomplete** — settings expose `widgetMode: "workshop"` and sizing logic exists, but `createVinylWindow()` loads only `vinyl-remake.html` or `vinyl-player.html`; `vinyl-workshop.html` is never referenced. UI advertises a mode that cannot work.

Other violations: vinyl-player plugin (~1,502 lines) mixes window mgmt, IPC, CSP, drag physics, and player-state sync; crash-report IPC handlers live at bottom of `main/index.ts` outside the structured IPC block; `docs/Workflows.md` referenced by skills but missing from repo.

---

## Safety findings: 8 (severity breakdown)

| Severity | Count | Examples |
|----------|-------|----------|
| Critical | 0 | — |
| High | 2 | Crash-report read/delete accepts arbitrary `filename` with no basename/`..` guard → path traversal under `userData/crash-reports`. Plugin/vinyl IPC callable without sender validation → playback/settings control from unintended renderers. |
| Medium | 4 | `vinyl-player:seek` / `set-volume` pass unvalidated `time`/`volume` to YTM remote control. Workshop mode loads wrong HTML (functional bug). `crashReports:*` IPC handlers have no `event.sender` check (settings-only surface expected). Global vinyl-player IPC uses `removeAllListeners` (safe while singleton, fragile if refactored). |
| Low | 2 | Debug-ingest re-enable hook remains in `vinyl-player.html` via `localStorage.setItem('ytmd_ingest','1')` (comment-only remnant). CrashReporter heartbeat `setInterval` relies on explicit `dispose()` — verify called on app quit. |

Positive notes: vinyl-player `onDisable()` cleans timeouts, player-state listener, shortcuts, window, and most IPC; `custom-themes` guards `canInject()` before CSS ops; companion auth middleware unchanged and still token-hash based.

---

## Security findings: 7 (severity breakdown)

| Severity | Count | Examples |
|----------|-------|----------|
| Critical | 0 | — |
| High | 3 | **Path traversal:** `crashReporter.getCrashReport/deleteCrashReport` join user-supplied `filename` without sanitization; IPC exposes to renderer. **Unguarded IPC:** `plugins:toggle`, `plugins:updateSetting`, all `vinyl-player:*` channels lack sender whitelist. **6K Labs CSP:** `default-src *; script-src * 'unsafe-inline' 'unsafe-eval'` on external widget session — broad attack surface if widget URL compromised. |
| Medium | 3 | `crashReports:generateTest` callable without sender guard. Permissive YTM CSP nonce injection in main (necessary for hooks, but increases XSS blast radius if YTM compromised). Custom-themes `insertCSS` accepts arbitrary user CSS (expected feature, but no length cap). |
| Low | 1 | Debug ingest localStorage toggle in vinyl HTML (disabled by default). |

Positive notes: `safeStorage:encrypt/decrypt` restricted to settings window; companion `isAuthValidMiddleware` intact; builder URL override validation added (`c232635`); debug HTTP ingest removed from TS (`f56f41d`).

---

## Doc drift

- **`docs/Workflows.md` missing** — referenced by `ytmd-plugin-system`, `ytmd-forge-vite-build`, and `ytmd-testing-ci` skills; file not in repo.
- **`provideYtmView` undocumented** — `PluginManager.provideYtmView()` exists and is called from `main/index.ts`, but `ytmd-plugin-system/SKILL.md` only mentions generic lifecycle/IPC, not YTM view injection contract.
- **Vitest config filename mismatch** — skill says `vitest.config.ts`; actual file is `vitest.config.mts` (fixed for Vite 8 ESM in `73e7bda`).
- **Vite 8 not reflected in forge skill** — `ytmd-forge-vite-build/SKILL.md` doesn't note Vite 8 / `@vitejs/plugin-vue` 6 / Rolldown implications.
- **README** — correctly updated for Node 20, Corepack, Yarn 4.10.3, builder config env vars, dev userData split. Good.

---

## Dead code

- **`vinyl-workshop.html`** (~873 lines) — present in diff, never loaded; workshop mode uses `vinyl-player.html` instead.
- **Large PNG assets** in `vinyl-player/assets/` (~40 MB total) — may be intentional for workshop UI that isn't wired up.
- **Empty `else` branch** in `vinyl-player-preload.js` (invalid channel send silently no-ops).
- **6klabs bundled assets** (`6klabs-assets/index-*.js/css`) — vendored third-party bundle; verify license/update path.
- **Removed:** `yarn-4.5.1.cjs` (replaced by 4.10.3). Debug ingest fetch calls removed from TS (HTML comment remains).

---

## Verification gates

### `corepack yarn lint`
```
(exit code 0, no output)
```
**Lint: pass**

### `corepack yarn prettier`
```
Checking formatting...
All matched files use Prettier code style!
```
**Prettier: pass**

### `corepack yarn test`
```
 RUN  v4.1.8 D:/Documents/Ai/cursor_AI/ytmdesktop

 Test Files  1 passed (1)
      Tests  2 passed (2)
   Start at  17:16:18
   Duration  507ms (transform 60ms, setup 0ms, import 90ms, tests 9ms, environment 0ms)
```
**Tests: pass** (only `weak-cache.test.ts`; no coverage for plugins, IPC, vinyl-player, companion-server)

### `gh pr checks 2 --repo TroonCataroon/ytmdesktop-1`
```
quality                          pass  (39s / 43s)
Cursor Bugbot                    pass
CodeRabbit                       pass (review skipped)
dependabot auto-merge            skipping
build (linux/macos/windows × x64/arm64)  fail (all 12 matrix jobs)
```
**CI: quality green; all build matrix jobs red**

Build failure root cause (macOS x64 job `80016090564`):
```
Failed to load: .../forge.config.ts
✖ Loading configuration [FAILED: Cannot use 'import.meta' outside a module]
SyntaxError: Cannot use 'import.meta' outside a module
```
Likely ESM/CJS mismatch when Electron Forge loads config after Vite 8 / dependency tree changes. Quality workflow does not run `yarn make`, so this slipped past lint/test gates.

---

## TOP RISKS

1. **Release blocker — all platform build jobs fail** — `yarn make` crashes loading `forge.config.ts` (`import.meta` outside module). PR cannot produce installers until Forge/Vite 8 config loading is fixed and verified on CI matrix.
2. **Crash-report IPC path traversal + missing sender guards** — Any renderer that reaches `crashReports:get/delete` with `../../sensitive-file` could read/delete outside `crash-reports/`. Handlers also lack settings-window sender checks.
3. **Unguarded plugin & vinyl-player IPC** — Missing `event.sender` validation on plugin toggle/settings and vinyl transport controls allows cross-renderer privilege abuse if any webContents is compromised (including vinyl player's own window calling main-wide plugin APIs).

---

## ASK

Fix all top risks now, fix selectively, or capture to plan?
