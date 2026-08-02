---
name: ytmd-forge-vite-build
description: Explains ytmdesktop’s Forge+Vite multi-target build (main/preloads/renderer), dev vs packaged path differences, sourcemaps/debugging, and release pipeline commands/artifacts. Use when changing build config, preload entries, packaging, or CI workflows.
---

# ytmdesktop Forge + Vite build and packaging

## Key anchors

- **Forge config**: `forge.config.mts`
- **Vite configs**: `viteconfig/**`
- **CI workflows**: `.github/workflows/*`
- **Builder config resolution**: `.scripts/resolve-builder-config.mjs`
- **Release asset contract**: `release-artifacts.contract.json` (site wizard + CI must agree)

## Multi-target build mental model

This repo builds multiple targets via the Forge Vite plugin:

- **Main**: `src/main/index.ts` (target: `main`)
- **Preloads**: multiple entrypoints (target: `preload`)
- **Renderer**: one bundle with multiple HTML entrypoints (window pages) for chunk sharing

`forge.config.mts` is the authoritative mapping from entry → vite config → target.

## Dev vs packaged runtime differences

- **Dev** (`yarn start`): renderer served from Vite dev server; preloads and main are built then Electron launches.
- **Packaged**: renderer and preloads are loaded from packaged output; assets may be read from `process.resourcesPath`.

When changing asset loading or preload paths, verify both environments.

## Packaging strategy (locked)

**Windows = MakerSquirrel only** (no NSIS). Wizard UX is Squirrel’s Setup.exe splash (`ytmd_installer.gif`) + setup icon; install is per-user under `%LocalAppData%`. Auto-update uses `Update.exe` + `RELEASES` + `.nupkg` already wired in `src/main/index.ts`.

| Platform | Maker | End-user asset |
| --- | --- | --- |
| Windows | Squirrel | `YouTube.Music.Desktop.App-{version}.Setup.exe` |
| macOS | ZIP | `YouTube.Music.Desktop.App-darwin-{arch}-{version}.zip` |
| Linux | Deb + Rpm | `youtube-music-desktop-app_{version}_{amd64\|arm64}.deb`, `youtube-music-desktop-app-{version}-1.{x86_64\|arm64}.rpm` |

Site / Release URL pattern:

`https://github.com/TroonCataroon/ytmdesktop-1/releases/download/{tag}/{asset}`

Example: `.../download/v2.2.0/YouTube.Music.Desktop.App-2.2.0.Setup.exe`

## Source maps + debugging

- Keep stack traces usable in both main and renderer (especially for Sentry/crash reporting).
- If you change Vite/Forge output settings, verify sourcemaps still map to TS sources.

## Release pipeline mental model

Commands:

- `yarn start` → `electron-forge start` (dev)
- `yarn package` → `electron-forge package` (packaged app dir)
- `yarn verify:package` → vinyl extraResource checks (Windows package dir)
- `yarn make` → `electron-forge make` (installers/artifacts)
- `yarn verify:make` → asserts artifact names vs `release-artifacts.contract.json`
- Tag publish (CI): `publish:dry` then `publish:fromdry`

### Publish a downloadable workshop build (after merge)

1. Bump `package.json` `version` **above** the latest GitHub release (currently `v2.1.0`; branch may still say `2.0.10` — bump first, e.g. `2.2.0`).
2. Merge packaging + workshop changes to the branch you release from.
3. Create and push an annotated tag:
   ```bash
   git tag -a v2.2.0 -m "v2.2.0"
   git push origin v2.2.0
   ```
4. `.github/workflows/publish.yml` builds the matrix and uploads assets to `TroonCataroon/ytmdesktop-1`.
5. Site wizard (`site/wizard.js`) resolves `latest` Release and matches `*.Setup.exe` / darwin zip / deb|rpm.

Optional repo vars: `YTMD_UPDATE_FEED_OWNER`, `YTMD_UPDATE_FEED_REPOSITORY`, `YTMD_RELEASE_PRERELEASE=true`.

Do **not** invent a second Windows installer format; keep Squirrel Setup.exe as the only Windows CTA.

CI:

- `.github/workflows/quality.yml`: lint/test/format checks
- `.github/workflows/build.yml`: `yarn make` + `verify:package` / `verify:make`, upload artifacts (Windows arm64 excluded)
- `.github/workflows/publish.yml`: tag `v*` → dry-run publish → publish from dry-run
