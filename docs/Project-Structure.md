# Project Structure

This document provides a comprehensive overview of the YouTube Music Desktop App codebase organization, explaining the purpose of each directory and file.

## Root Directory Structure

```
ytmdesktop/
├── .github/                    # GitHub workflows and templates
├── .husky/                     # Git hooks configuration
├── .vscode/                    # VS Code workspace settings
├── .yarn/                      # Yarn package manager files
├── docs/                       # Documentation (this directory)
├── scripts/                    # Build and utility scripts
├── src/                        # Main source code
├── viteconfig/                 # Vite build configuration
├── .editorconfig              # Editor configuration
├── .eslintrc.cjs              # ESLint configuration
├── .gitattributes             # Git attributes
├── .gitignore                 # Git ignore patterns
├── .prettierrc                # Prettier formatting rules
├── .yarnrc.yml               # Yarn configuration
├── forge.config.ts           # Electron Forge configuration
├── LICENSE                   # GPL-3.0 license
├── package.json              # Project dependencies and scripts
├── README.md                 # Project overview
├── tsconfig.json            # TypeScript configuration
├── vite.d.ts                # Vite type declarations
└── yarn.lock                # Yarn dependency lock file
```

## Source Code Organization (`src/`)

The main source code is organized into four primary directories:

```
src/
├── main/                      # Main Electron process
├── renderer/                  # Renderer process (UI)
├── shared/                    # Shared types and utilities
└── assets/                    # Static assets
```

## Main Process (`src/main/`)

The main process contains the backend Electron application logic.

```
src/main/
├── @types/                    # TypeScript type definitions
├── integrations/              # Third-party service integrations
│   ├── base-integration.ts   # Base class for all integrations
│   ├── integration.ts        # Integration interface
│   ├── companion-server/     # REST API server
│   ├── custom-css/          # Custom CSS injection
│   ├── discord-presence/    # Discord Rich Presence
│   ├── last-fm/             # Last.fm scrobbling
│   ├── notifications/       # Desktop notifications
│   └── volume-ratio/        # Volume control enhancement
├── memory-store/             # In-memory data storage
├── player-state-store/       # Music player state management
├── index.ts                  # Main entry point
└── tsconfig.json            # TypeScript config for main process
```

### Integration System

Each integration follows a consistent structure:

```
src/main/integrations/[integration-name]/
├── index.ts                  # Main integration class
├── types.ts                  # Integration-specific types
├── config.ts                 # Configuration schema
└── utils.ts                  # Utility functions
```

#### Key Integration Files

- **`companion-server/`**: REST API and WebSocket server for external control
- **`discord-presence/`**: Discord Rich Presence integration
- **`last-fm/`**: Last.fm scrobbling and authentication
- **`custom-css/`**: Custom CSS injection system
- **`notifications/`**: Native desktop notifications
- **`volume-ratio/`**: Enhanced volume control

### Core Systems

- **`player-state-store/`**: Central player state management
- **`memory-store/`**: Runtime memory storage for temporary data
- **`index.ts`**: Main application entry point, window management, and integration coordination

## Renderer Process (`src/renderer/`)

The renderer process contains the frontend Vue.js application.

```
src/renderer/
├── @types/                    # Renderer-specific types
├── components/                # Reusable Vue components
│   ├── KeybindInput.vue      # Keyboard shortcut input
│   ├── TitleBar.vue          # Window title bar
│   ├── YTMDSetting.vue       # Settings input component
│   └── YTMViewLoading.vue    # Loading screen
├── store-ipc/                # IPC bridge for store access
├── windows/                  # Window-specific components
│   ├── authorize-companion/  # Companion server authorization
│   ├── main/                 # Main application window
│   └── settings/             # Settings window
├── ytmview/                  # YouTube Music integration
│   ├── preload.ts           # YouTube Music page scripts
│   └── scripts/             # Injected JavaScript modules
└── tsconfig.json            # TypeScript config for renderer
```

### Component Architecture

#### Core Components

- **`TitleBar.vue`**: Unified title bar with window controls and navigation
- **`YTMDSetting.vue`**: Flexible settings component supporting multiple input types
- **`KeybindInput.vue`**: Specialized keyboard shortcut capture component
- **`YTMViewLoading.vue`**: Loading states for YouTube Music view

#### Window Management

Each window type has its own directory under `windows/`:

```
src/renderer/windows/[window-name]/
├── index.html               # Window HTML template
├── main.ts                  # Window entry point
├── App.vue                  # Root Vue component
└── components/              # Window-specific components
```

#### YouTube Music Integration

The `ytmview/` directory contains the code that interacts with the YouTube Music web interface:

- **`preload.ts`**: Preload script that bridges YouTube Music and the application
- **`scripts/`**: Individual JavaScript modules injected into the YouTube Music page

### Scripts Directory (`src/renderer/ytmview/scripts/`)

```
scripts/
├── getplaylists.script.ts    # Extract playlist information
├── hookplayerapievents.script.ts # Hook into YouTube Music player events
├── playerbarcontrols.script.ts   # Add custom player controls
├── toggledislike.script.ts   # Toggle dislike functionality
└── togglelike.script.ts      # Toggle like functionality
```

## Shared Code (`src/shared/`)

Shared utilities and types used by both main and renderer processes.

```
src/shared/
├── integrations/             # Shared integration types
│   └── companion-server/    # Companion server shared types
├── store/                   # Configuration store schema
│   └── schema.ts           # Store type definitions
└── types.ts                # Global type definitions
```

### Store Schema

The store schema defines the structure of application settings:

```typescript
// Excerpt from src/shared/store/schema.ts
export type StoreSchema = {
  metadata: { version: 1 };
  general: { /* General settings */ };
  appearance: { /* UI preferences */ };
  playback: { /* Playback settings */ };
  integrations: { /* Integration configurations */ };
  shortcuts: { /* Keyboard shortcuts */ };
  state: { /* Application state */ };
  lastfm: { /* Last.fm settings */ };
  developer: { /* Development options */ };
};
```

## Assets (`src/assets/`)

Static resources used by the application.

```
src/assets/
├── app.css                  # Global application styles
├── fonts/                   # Custom fonts
└── icons/                   # Application icons
    ├── controls/           # Media control icons
    ├── ytmd.ico           # Main application icon
    ├── tray.ico           # System tray icon
    └── [platform-specific icons]
```

### Icon Organization

- **Application Icons**: Main app icons for different platforms
- **Tray Icons**: System tray icons with light/dark variants
- **Control Icons**: Media control button icons (play, pause, next, previous)

## Configuration Files

### Build Configuration

#### `forge.config.ts`
Electron Forge configuration for building and packaging:

```typescript
// Key configuration sections
const config: ForgeConfig = {
  packagerConfig: {
    executableName: "youtube-music-desktop-app",
    icon: "./src/assets/icons/ytmd",
    extraResource: [/* Icon files */],
    protocols: [/* URL scheme handlers */]
  },
  makers: [/* Platform-specific package builders */],
  plugins: [/* Vite, Fuses, etc. */]
};
```

#### `viteconfig/`
Vite configuration for each process:

```
viteconfig/
├── main.vite.config.ts      # Main process build config
├── preload.vite.config.ts   # Preload scripts build config
└── renderer.vite.config.ts  # Renderer process build config
```

### TypeScript Configuration

#### Root `tsconfig.json`
Base TypeScript configuration with shared settings.

#### Process-Specific Configs
Each process has its own TypeScript configuration:
- `src/main/tsconfig.json` - Main process specific settings
- `src/renderer/tsconfig.json` - Renderer process specific settings

### Code Quality

#### `.eslintrc.cjs`
ESLint configuration with rules for:
- TypeScript support
- Vue.js components
- Import order and organization
- Code quality standards

#### `.prettierrc`
Prettier configuration for consistent code formatting:

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "none",
  "printWidth": 120
}
```

## Development Tools

### Git Hooks (`.husky/`)

Pre-commit hooks ensure code quality:

```
.husky/
└── pre-commit                # Runs linting and formatting
```

### VS Code Configuration (`.vscode/`)

Workspace settings for optimal development experience:

```
.vscode/
├── settings.json            # Workspace settings
├── extensions.json          # Recommended extensions
└── launch.json             # Debug configurations
```

### GitHub Workflows (`.github/`)

Continuous integration and deployment:

```
.github/
├── workflows/              # GitHub Actions workflows
│   ├── build.yml          # Build and test
│   ├── release.yml        # Release automation
│   └── pr.yml             # Pull request validation
├── ISSUE_TEMPLATE/         # Issue templates
└── PULL_REQUEST_TEMPLATE.md # PR template
```

## Scripts (`scripts/`)

Utility scripts for development and maintenance:

```
scripts/
└── generateContributors.mjs # Generate contributor list
```

## File Naming Conventions

### TypeScript Files
- **PascalCase**: Class files and components (`TitleBar.vue`, `BaseIntegration.ts`)
- **camelCase**: Utility functions and modules (`playerStateStore.ts`)
- **kebab-case**: Vue component files when using multi-word names

### Directories
- **kebab-case**: Multi-word directory names (`player-state-store/`)
- **camelCase**: Single word or common abbreviations (`src/`, `ytmview/`)

### Constants and Enums
- **SCREAMING_SNAKE_CASE**: Constants and enum values
- **PascalCase**: Enum type names

## Import Organization

### Import Order
1. Node.js built-in modules
2. External dependencies
3. Electron modules
4. Internal modules (relative imports)
5. Type-only imports

### Path Aliases
Common path aliases used throughout the project:

```typescript
// Configured in tsconfig.json
"@/*": ["src/renderer/*"]
"~shared/*": ["src/shared/*"]
"~main/*": ["src/main/*"]
```

## Build Output

### Development
- Vite dev server for renderer processes
- Direct TypeScript execution for main process
- Hot module replacement for fast development

### Production
Build artifacts are generated in:

```
out/
├── [platform-specific packages]
└── make/                   # Distributable packages
```

## Platform-Specific Considerations

### Windows
- `.exe` installer via Squirrel
- Windows-specific icons and assets
- Registry entries for auto-start

### macOS
- `.dmg` disk image
- Code signing and notarization
- macOS-specific menu bar integration

### Linux
- `.deb` and `.rpm` packages
- Desktop entry files
- System tray integration

## Testing Structure

While not currently comprehensive, the testing structure follows:

```
tests/                      # Test files (when added)
├── unit/                  # Unit tests
├── integration/           # Integration tests
└── e2e/                   # End-to-end tests
```

## Documentation Structure

This documentation is organized in the `docs/` directory:

```
docs/
├── Home.md                 # Main documentation index
├── First-Time-Setup.md     # Getting started guide
├── Project-Structure.md    # This document
├── Integration-Framework.md # Integration system
├── Vue-Components.md       # Frontend components
├── Player-State-API.md     # Player state management
├── Companion-Server-API.md # REST API documentation
└── [additional docs]       # Other documentation pages
```

## Best Practices

### Code Organization
1. **Separation of Concerns**: Clear separation between main and renderer processes
2. **Modular Design**: Integrations are self-contained modules
3. **Type Safety**: Comprehensive TypeScript usage throughout
4. **Consistent Structure**: Similar patterns across all modules

### File Organization
1. **Logical Grouping**: Related files are kept together
2. **Clear Naming**: Descriptive file and directory names
3. **Consistent Hierarchy**: Similar structures across different areas
4. **Minimal Nesting**: Avoid overly deep directory structures

### Dependencies
1. **Clear Separation**: Development vs. production dependencies
2. **Version Pinning**: Exact versions for stability
3. **Minimal Footprint**: Only necessary dependencies
4. **Security Auditing**: Regular dependency security checks

## Getting Started

For new developers, the recommended exploration order is:

1. **Start with**: `package.json` and `README.md`
2. **Understand the build**: `forge.config.ts` and `viteconfig/`
3. **Explore main process**: `src/main/index.ts`
4. **Examine integrations**: `src/main/integrations/`
5. **Review frontend**: `src/renderer/components/`
6. **Study shared code**: `src/shared/store/schema.ts`

This structure ensures maintainability, scalability, and ease of development while providing clear separation of concerns and consistent patterns throughout the codebase.