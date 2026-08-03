# YTMD install surface (`site/`)

Static landing + install wizard deployed on **Vercel**. It does **not** run the Electron app.

## What it does

1. Detects OS / architecture in the browser
2. Loads the latest GitHub Release for `TroonCataroon/ytmdesktop-1` (fallback: `v2.1.0`)
3. Offers the matching Electron Forge artifact:
   - **Windows**: `*.Setup.exe` (Squirrel wizard from `@electron-forge/maker-squirrel`)
   - **macOS**: `*-darwin-arm64|x64-*.zip`
   - **Linux**: `.deb` / `.rpm`
4. Shows short run-installer steps
5. Optional **PWA** (“YTMD Install Guide”): installable shortcut for this companion wizard only — desktop binaries still come from GitHub Releases

## PWA notes

- Manifest: `manifest.webmanifest` (standalone display, companion naming)
- Service worker: `sw.js` (caches the guide shell; does not proxy Electron)
- Install UX: `pwa.js` + `beforeinstallprompt` banner labeled “Add install guide”

## Deploy

From repo root (uses root `vercel.json` → `outputDirectory: site`):

```bash
vercel deploy -y
```

Or deploy the folder directly:

```bash
vercel deploy ./site -y
```

## Composable mount

See `feature.manifest.json` and `register.js` for host integration via `registerFeature(manifest, ctx)`.
