# AGENTS.md

## Cursor Cloud specific instructions

### Project overview
YouTube Music Desktop App — an Electron 38 + Vue 3 desktop wrapper for YouTube Music with integrations (companion server, Discord, Last.fm, plugins, etc.). See `README.md` for full developer setup instructions.

### Key commands
| Task | Command |
|------|---------|
| Install deps | `corepack enable && yarn install` |
| Lint | `yarn lint` |
| Tests | `yarn test` |
| Dev start | `yarn start` (electron-forge start) |
| Package | `yarn make` |

### Running the app in Cloud Agent VMs
- `yarn start` (electron-forge with `interactive: true`) does **not** work reliably in headless/Docker Cloud Agent environments — the Electron child process exits immediately.
- **Workaround**: launch via the forge API with `interactive: false`:
  ```js
  node -e "
  const { api } = require('@electron-forge/core');
  api.start({ dir: '/workspace', interactive: false }).catch(console.error);
  setInterval(() => {}, 60000);
  "
  ```
  This starts the Vite dev server, builds main/preloads, and launches Electron correctly.
- The app requires a display server (`DISPLAY=:1` is available in the VM).
- D-Bus errors (`Failed to connect to the bus`) and GPU initialization warnings are harmless in this environment.

### Known pre-existing issues
- `src/main/integrations/plugins/builtin/vinyl-player/index.ts` has syntax errors (duplicate `.catch()` and unclosed `if` block) that prevent the main process from building. These must be fixed for the app to start.
- `yarn lint` reports 2 parse errors from the same vinyl-player file — these are pre-existing, not environment issues.

### Architecture notes
- No database or Docker required — all state is file-based (`conf` library).
- In development, `userData` is isolated to a `(development)` directory.
- Companion server runs on port 9863 (Fastify + Socket.IO).
- Vite dev server for renderer on port 5173.
- Detailed architecture skills are available under `.cursor/skills/ytmd-*`.
