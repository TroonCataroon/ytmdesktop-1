# YouTube Music Desktop App - Developer Documentation

Welcome to the comprehensive developer documentation for the YouTube Music Desktop App. This documentation covers all public APIs, components, integrations, and development guidelines.

## 📋 Table of Contents

### Getting Started
- [First-Time Setup](First-Time-Setup.md) - Complete setup guide for new developers
- [Project Structure](Project-Structure.md) - Overview of the codebase organization
- [Build and Deployment](Build-and-Deployment.md) - Building and packaging the application

### Core Architecture  
- [Main Process APIs](Main-Process-APIs.md) - Backend Electron APIs and services
- [Renderer Process](Renderer-Process.md) - Frontend Vue.js components and UI
- [IPC Communication](IPC-Communication.md) - Inter-process communication between main and renderer
- [Configuration System](Configuration-System.md) - Settings, preferences, and data stores

### Integration System
- [Integration Framework](Integration-Framework.md) - Base integration classes and patterns
- [Available Integrations](Available-Integrations.md) - Discord, Last.fm, Companion Server, etc.
- [Creating Custom Integrations](Creating-Custom-Integrations.md) - Guide for adding new integrations

### Component Library
- [Vue Components](Vue-Components.md) - Reusable UI components
- [Window Management](Window-Management.md) - Multi-window architecture
- [Styling and Theming](Styling-and-Theming.md) - CSS customization and themes

### API Reference
- [Player State API](Player-State-API.md) - Music player state management
- [Settings API](Settings-API.md) - Configuration and preferences
- [Companion Server API](Companion-Server-API.md) - REST API for external integrations
- [YouTube Music Injection API](YouTube-Music-Injection-API.md) - Scripts injected into YouTube Music

### Development
- [Contributing Guidelines](Contributing-Guidelines.md) - How to contribute to the project
- [Testing](Testing.md) - Running tests and quality assurance
- [Debugging](Debugging.md) - Troubleshooting and development tools
- [Release Process](Release-Process.md) - How releases are created and distributed

## 🚀 Quick Start

For new developers, start with the [First-Time Setup](First-Time-Setup.md) guide to get your development environment configured.

## 📦 Project Overview

YouTube Music Desktop App is an Electron-based application that provides a native desktop experience for YouTube Music with additional features like:

- **Rich Integrations**: Discord Rich Presence, Last.fm scrobbling, custom CSS support
- **Media Controls**: Global shortcuts, media key support, taskbar progress
- **Companion API**: REST API for external integrations and remote control
- **Cross-Platform**: Windows, macOS, and Linux support

## 🏗️ Technology Stack

- **Framework**: Electron 36+ with TypeScript
- **Frontend**: Vue 3 with Composition API
- **Backend**: Fastify for API server
- **Build Tool**: Vite + Electron Forge
- **Package Manager**: Yarn (v4.9.2)

## 📖 Documentation Conventions

- **Public APIs** are documented with full parameter and return type information
- **Examples** are provided for all major functions and components
- **TypeScript interfaces** are documented with property descriptions
- **Integration patterns** include both basic and advanced usage examples

## 🤝 Contributing

This documentation is maintained alongside the codebase. When adding new features or modifying existing APIs, please update the relevant documentation pages.

For questions or suggestions about this documentation, please open an issue on the [main repository](https://github.com/ytmdesktop/ytmdesktop).