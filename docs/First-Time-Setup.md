# First-Time Setup

This guide will walk you through setting up your development environment for the YouTube Music Desktop App.

## Prerequisites

### Required Software

1. **Node.js v20+**: Download from [nodejs.org](https://nodejs.org/)
2. **Git**: Download from [git-scm.com](https://git-scm.com/)
3. **Code Editor**: VS Code recommended with TypeScript support

### Platform-Specific Requirements

#### Windows
For building native packages, install:
```bash
npm install -g @electron/build-tools
```
This includes Visual Studio Build Tools, Python, and other required tools.

#### macOS
- Xcode Command Line Tools: `xcode-select --install`
- Homebrew (recommended): `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`

#### Linux
**Debian/Ubuntu:**
```bash
sudo apt-get install fakeroot dpkg
```

**RHEL/Fedora:**
```bash
sudo dnf install rpm-build
# or
sudo yum install rpm-build
```

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/ytmdesktop/ytmdesktop.git
cd ytmdesktop
```

### 2. Enable Yarn (if not already installed)

```bash
corepack enable
```

### 3. Install Dependencies

```bash
yarn install
```

This will:
- Install all Node.js dependencies
- Set up Git hooks with Husky
- Configure the development environment

### 4. Configure Development Environment

#### VS Code Setup (Recommended)
Install the following extensions:
- TypeScript and JavaScript Language Features
- Vue Language Features (Vetur or Volar)
- ESLint
- Prettier
- Git Graph

The repository includes VS Code settings in `.vscode/` that will be automatically applied.

#### Environment Variables
Create a `.env` file in the root directory for any local configuration:
```env
# Optional: Enable development-specific features
NODE_ENV=development

# Optional: Custom update server for testing
YTMD_UPDATE_FEED_OWNER=your-github-username
YTMD_UPDATE_FEED_REPOSITORY=your-repo-name
```

## Running the Application

### Development Mode

```bash
yarn start
```

This will:
- Start the Electron application in development mode
- Enable hot reloading for the renderer process
- Open the developer tools automatically
- Watch for file changes

### Available Scripts

```bash
# Development
yarn start                    # Start in development mode
yarn lint                     # Run ESLint
yarn lint:fix                 # Run ESLint with auto-fix
yarn prettier                 # Check code formatting
yarn prettier:fix             # Auto-format code

# Building
yarn package                  # Package for current platform
yarn make                     # Create distributable packages
yarn publish:dry              # Test publish process
yarn publish                  # Publish release
```

## Project Structure Overview

```
ytmdesktop/
├── src/
│   ├── main/                 # Main Electron process
│   │   ├── index.ts         # Entry point
│   │   ├── integrations/    # Third-party integrations
│   │   ├── memory-store/    # In-memory data storage
│   │   └── player-state-store/ # Music player state
│   ├── renderer/            # Renderer process (frontend)
│   │   ├── components/      # Vue components
│   │   ├── windows/         # Window-specific code
│   │   └── ytmview/         # YouTube Music integration
│   ├── shared/              # Shared types and utilities
│   └── assets/              # Static assets
├── docs/                    # Documentation (this directory)
├── scripts/                 # Build and utility scripts
├── forge.config.ts          # Electron Forge configuration
├── package.json             # Dependencies and scripts
└── tsconfig.json           # TypeScript configuration
```

## Configuration Files

### TypeScript Configuration
- `tsconfig.json` - Main TypeScript configuration
- `src/*/tsconfig.json` - Process-specific configurations

### Build Configuration
- `forge.config.ts` - Electron Forge configuration for building and packaging
- `viteconfig/` - Vite configuration for the build process

### Code Quality
- `.eslintrc.cjs` - ESLint configuration
- `.prettierrc` - Prettier formatting rules
- `.editorconfig` - Editor configuration

## Development Workflow

### 1. Making Changes
1. Create a new branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Test locally: `yarn start`
4. Run linting: `yarn lint:fix`
5. Format code: `yarn prettier:fix`

### 2. Pre-commit Hooks
The repository uses Husky to run pre-commit hooks that will:
- Run ESLint on staged files
- Run Prettier on staged files
- Ensure code quality before commits

### 3. Testing Your Changes
```bash
# Test the application
yarn start

# Test packaging
yarn package

# Test the packaged application
# Navigate to out/ directory and run the generated executable
```

## Common Issues and Solutions

### Node.js Version Issues
If you encounter Node.js version conflicts:
```bash
# Check your Node version
node --version

# Use nvm to switch versions (if installed)
nvm use 20
```

### Yarn/npm Issues
If dependencies fail to install:
```bash
# Clear yarn cache
yarn cache clean

# Remove node_modules and reinstall
rm -rf node_modules yarn.lock
yarn install
```

### Build Issues on Windows
If native modules fail to build:
```bash
# Install windows-build-tools
npm install -g windows-build-tools

# Or install the full Visual Studio suite
npm install -g @electron/build-tools
```

### Permission Issues on macOS/Linux
If you encounter permission errors:
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

## Next Steps

After completing the setup:

1. **Explore the codebase**: Start with [Project Structure](Project-Structure.md)
2. **Understand the architecture**: Read [Main Process APIs](Main-Process-APIs.md) and [Renderer Process](Renderer-Process.md)
3. **Try making changes**: Follow the [Contributing Guidelines](Contributing-Guidelines.md)

## Getting Help

- **Documentation**: Check other pages in this wiki
- **Issues**: Search existing issues on [GitHub](https://github.com/ytmdesktop/ytmdesktop/issues)
- **Discord**: Join the community [Discord server](https://discord.gg/88P2n2a)
- **Stack Overflow**: Tag questions with `youtube-music-desktop-app`

## Troubleshooting

### Application Won't Start
1. Check Node.js version: `node --version` (should be 20+)
2. Reinstall dependencies: `rm -rf node_modules && yarn install`
3. Check for port conflicts (if using companion server)
4. Review console output for specific error messages

### Build Failures
1. Ensure all platform-specific dependencies are installed
2. Check available disk space (builds can be large)
3. Verify Git configuration is correct
4. Check for any missing certificates or signing tools (for distribution builds)

### Performance Issues
1. Close other Electron apps to free up resources
2. Disable hardware acceleration if experiencing graphics issues
3. Check system resource usage (RAM, CPU)
4. Clear application data if experiencing persistent issues