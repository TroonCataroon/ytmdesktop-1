# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

YouTube Music Desktop App (YTMD) — an Electron app wrapping YouTube Music with desktop-native features. Tech stack: Electron 36, Vue 3, TypeScript, Vite, Fastify (companion server). No database; uses `conf` (JSON file store). No test suite exists.

### Node.js and package manager

- Requires **Node.js v20** (CI uses v20.9.0). Installed via `nvm install 20 && nvm alias default 20`.
- Uses **Yarn 4.5.1** (Berry) bundled at `.yarn/releases/yarn-4.5.1.cjs` with `nodeLinker: node-modules`. Enable via `corepack enable`.
- Install dependencies: `yarn install`

### Key commands

| Task | Command |
|---|---|
| Install deps | `yarn install` |
| Dev mode | `NODE_ENV=development yarn start` |
| Lint | `yarn lint` |
| Format check | `yarn prettier` |
| Package | `yarn package` |
| Build installer | `yarn make` |

### Running in headless / Cloud Agent environments

- The Electron app requires a display. Use `xvfb-run` or start Xvfb manually (`Xvfb :99 -screen 0 1920x1080x24 &` then `export DISPLAY=:99`).
- Set `NODE_ENV=development` when running `yarn start` so asset paths resolve to `src/assets/` instead of `process.resourcesPath`.
- D-Bus errors (e.g. `Failed to connect to the bus`) are expected and non-fatal in headless environments.
- The tray icon may fail to load in dev mode with an error about missing image from `process.resourcesPath`; clicking "Continue" in the error dialog (if it appears) lets the app proceed.
- YouTube Music content will fail to load without network access to `music.youtube.com` and a Google account — this is expected in sandboxed environments.

### Lint and pre-commit

- Pre-commit hook (Husky): runs `yarn lint-staged` which applies Prettier + ESLint on staged `.ts/.tsx/.vue` files.
- `yarn lint` runs ESLint across the project. 0 errors expected (2 non-blocking warnings about `import/no-named-as-default`).

### Architecture notes

- No automated test suite. Verify changes via lint, build, and manual testing.
- Multi-window Electron app: main, settings, authorize-companion renderer windows + YouTube Music BrowserView.
- Companion server (Fastify + Socket.IO) runs inside the Electron main process on port 9863 when enabled.
- Vite config at build time runs `git rev-parse` — the workspace must be a git repo.
