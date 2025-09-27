# YouTube Music Desktop App Integrations

This document provides an overview of the integrations available in the YouTube Music Desktop App.

## Table of Contents

1. [Sentry Integration](#sentry-integration)
2. [Notion Integration](#notion-integration)
3. [Figma Integration](#figma-integration)
4. [Setting Up Integrations](#setting-up-integrations)

## Sentry Integration

The Sentry integration provides error tracking and performance monitoring capabilities for the YouTube Music Desktop App. It captures errors and exceptions in both the main and renderer processes, and sends them to Sentry for analysis and debugging.

### Features

- Error tracking in main and renderer processes
- Exception capturing with stack traces
- Performance monitoring with transactions and spans
- User and context information
- Breadcrumb tracking for debugging

### Configuration

The Sentry integration is configured in `src/shared/sentry.config.ts`. Key configuration options include:

- `dsn`: The Sentry Data Source Name (DSN)
- `environment`: The environment (production, staging, development)
- `release`: The release version
- `tracesSampleRate`: The percentage of transactions to trace
- `ignoreErrors`: Patterns of errors to ignore

## Notion Integration

The Notion integration allows the YouTube Music Desktop App to interact with Notion workspaces for bug tracking, feature requests, and documentation.

### Features

- Bug report submission to Notion databases
- Feature request tracking
- Documentation management
- Sync between app and Notion workspace

### Configuration

The Notion integration is configured in `src/shared/notion.config.ts`. Key configuration options include:

- `apiKey`: The Notion API key
- `databases`: Configuration for Notion databases (features, bugs, feedback, documentation)
- `pages`: Configuration for important Notion pages
- `sync`: Configuration for syncing data between the app and Notion

### Notion Plugin

The Notion integration includes a plugin that provides user-facing features for interacting with Notion:

- Bug reporting from within the app
- Feature requests from within the app
- Documentation viewing and creation

## Figma Integration

The Figma integration provides access to design assets and design tokens from Figma files, allowing the app to stay in sync with the latest designs.

### Features

- Access to Figma design files
- Export of design assets (icons, images)
- Design token extraction (colors, typography, spacing)
- Automatic sync of design changes

### Configuration

The Figma integration is configured in `src/shared/figma.config.ts`. Key configuration options include:

- `personalAccessToken`: The Figma Personal Access Token
- `teamId`: The Figma team ID
- `files`: Configuration for important Figma files
- `assetGeneration`: Configuration for generating assets from Figma
- `designTokens`: Configuration for design token extraction
- `sync`: Configuration for syncing design changes

## Setting Up Integrations

### Sentry Setup

1. Create a Sentry account at [sentry.io](https://sentry.io)
2. Create a new project for "Electron"
3. Get the DSN (Data Source Name)
4. Update the `dsn` value in `src/shared/sentry.config.ts`
5. Set the `SENTRY_DSN` environment variable (optional)

### Notion Setup

1. Create a Notion account
2. Create an integration at [notion.so/my-integrations](https://notion.so/my-integrations)
3. Get the API key
4. Share the required databases and pages with the integration
5. Update the `apiKey` value in `src/shared/notion.config.ts`
6. Set the `NOTION_API_KEY` environment variable (optional)

### Figma Setup

1. Create a Figma account
2. Generate a personal access token in your Figma account settings
3. Get the team ID and file keys for your Figma files
4. Update the configuration in `src/shared/figma.config.ts`
5. Set the `FIGMA_PERSONAL_ACCESS_TOKEN` environment variable (optional)

## Integration Security

All integrations use environment variables or secure storage for API keys and tokens. The keys are never hard-coded or committed to the repository.

## Adding New Integrations

To add a new integration:

1. Create a new directory in `src/main/integrations/`
2. Implement the `BaseIntegration` interface
3. Create a configuration file in `src/shared/`
4. Register the integration in `src/main/index.ts`
