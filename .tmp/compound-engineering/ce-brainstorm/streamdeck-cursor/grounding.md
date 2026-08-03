# Grounding: Stream Deck plugin for Cursor IDE

Scout scope: `ytmdesktop` workspace + related `.cursor` skills/plans. Extraction only. ~20 reads.

## 1. Stream Deck prior art (workspace = empty; skills/plans elsewhere)

**ytmdesktop repo:** zero Stream Deck / `sdPlugin` / `streamdeck` matches in source or plans.

**Skill (thin — no profiles/folders/dynamic-actions section):**

```1:34:C:\Users\Bryce\.cursor\skills\streamdeck-plugin-expert\SKILL.md
name: streamdeck-plugin-expert
description: "Stream Deck plugin specialist: action lifecycle, property inspector, WebSocket messaging, manifest, and debugging. Use when editing Stream Deck `.sdPlugin` projects, `pi.js` or `plugin.js`, ..."
# ...
Build and debug Elgato Stream Deck plugins, focusing on reliable WebSocket messaging, state persistence, and a clean Property Inspector UX.
## Workflow
1. Identify the action(s) and where state is stored (settings vs global).
2. Confirm message shapes for `sendToPlugin`, `sendToPropertyInspector`, and settings updates.
...
## Message Discipline
- Treat messages as versioned contracts; tolerate missing fields with defaults.
- Prefer a single helper for sending messages and include guardrails for socket state.
- Avoid assuming PI and plugin load order; handle late connects.
## Debug Checklist
- Confirm the correct `context` is used per action instance.
- Verify `setSettings` vs `setGlobalSettings` usage matches intended scope.
- Ensure UI updates in PI are driven by settings you persist, not transient state.
```

Duplicate at `C:\Users\Bryce\.codex\skills\public\streamdeck-plugin-expert\SKILL.md` (same content). Indexed in `C:\Users\Bryce\.cursor\SKILL_INDEX.md:474-475`.

**Gap:** skill does **not** document profiles, folders, dynamic actions, or WebSocket protocol details beyond PI/plugin messaging discipline.

**Cross-process prior art (not Cursor):**

| Pattern | Where | Quote |
|---|---|---|
| Full `.sdPlugin` TS plugin | PNW Claim Selector | `Templates/StreamDeck/PNWClaimSelector.sdPlugin/src/actions/pdf-to-esx.ts`; PI toggle for engine (`pnw_backlog_implementation_4e9a4192.plan.md:138-150`) |
| Trigger-file / `.bat` keys | WhackAMole plans | `streamdeck-whackamole-demo.bat` / `bonk` token (`whackamole_finish_plan_41ca1fb6.plan.md:244`, `whackamole_pr_finish_0e342886.plan.md:130`) |
| Stream Deck → Python spawn | `windows-filesystem-handler` | spawn Python with `windowsHide`, atomic status files SD reads (`SKILL.md:285-340`) |
| Route specialist | `task-orchestrator` | "Stream Deck + AHK workflow → `streamdeck-xactimate-automation`" (`SKILL.md:97`) |
| Archived profile plan | plans INDEX | `update_streamdeck_profile_layout_0cb318d6.plan.md` (read denied) |

## 2. Cursor control / MCP / AskQuestion patterns

**No public Cursor REST API docs in this workspace.** Control surfaces found:

**cursor-app-control MCP** (session tools): `move_agent_to_root`, `move_agent_to_cloned_root`, `create_project`, `open_resource`, `open_automation`, `cursor_dialog`, `rename_chat`.

```1:12:C:\Users\Bryce\.cursor\projects\d-Documents-Ai-cursor-AI-ytmdesktop\mcps\cursor-app-control\tools\open_resource.json
"description": "Open a resource by URI: files in the Glass editor panel ... terminals, output channels, or http(s) URLs ... Command and product-protocol URI schemes are not supported."
```

**AskQuestion** (agent UI, not an HTTP API) — skills-cursor:

```31:45:C:\Users\Bryce\.cursor\skills-cursor\onboard\SKILL.md
- `AskQuestion`: use for fixed-choice questions.
...
When a question has fixed options, use `AskQuestion`. Do not write numbered option lists in normal text for fixed-choice moments.
...
Use at most one `AskQuestion` per assistant message.
```

```32:38:C:\Users\Bryce\.cursor\skills-cursor\create-skill\SKILL.md
If you need clarification, use the AskQuestion tool when available:
Example AskQuestion usage:
- "Where should this skill be stored?" with options like ["Personal (~/.cursor/skills/)", "Project (.cursor/skills/)"]
```

Automate skill: escalate to AskQuestion only for tools multi-select / 3+ discovery candidates; `cursor-app-control` is **not** dashboard-eligible for Automations MCP actions (`automate/SKILL.md:77`).

**Companion pattern (ytmdesktop — transferable auth/realtime, not Cursor):**

```21:33:d:\Documents\Ai\cursor_AI\ytmdesktop\.cursor\skills\ytmd-companion-server\SKILL.md
## Auth flow (request-code → user approval → token)
1. Client requests a short-lived code.
...
## Socket.IO realtime
- Namespace: `/api/v1/realtime`
- Authenticate on connect (handshake token).
- Broadcast stable events (e.g. `state-update`)
- Consider backpressure/fanout when adding high-frequency events.
```

ytmdesktop **plugin system** (in-app plugins, not Stream Deck): register → settings → enable; stable contracts via events/IPC (`ytmd-plugin-system/SKILL.md:16-26`).

## 3. Brainstorms / compound-engineering config

| Artifact | Status |
|---|---|
| `docs/brainstorms/` | **Absent** in ytmdesktop and under `d:\Documents\Ai\cursor_AI` |
| `.compound-engineering/config.local.yaml` | **Absent** (no `brainstorm_output` setting) |
| `CONCEPTS.md` / `STRATEGY.md` | **Absent** |
| Prior Stream Deck/Cursor brainstorms in-repo | **None** |

## 4. Plugin frequency / usage tracking

**None found** for Stream Deck action usage, frequency ranking, or “most used” keys. Only unrelated “high-frequency events” throttling (YTM progress / companion fanout).

## Implications for NEW product

1. Greenfield: no Cursor↔Stream Deck code in this workspace; product should live **outside** ytmdesktop.
2. Reuse skill discipline (PI/plugin message contracts, settings scope, late-connect) + prior patterns (HTTP action plugin like PNW, or trigger-file like WhackAMole).
3. Cursor-side control today is **MCP/agent tools** (`cursor-app-control`, AskQuestion), not a documented external plugin API — integration path is an open design question.
4. No frequency/usage telemetry concepts to extend; invent if needed.
)
