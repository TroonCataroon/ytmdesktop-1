# Auto-Update System

This document provides an overview of the auto-update system in the YouTube Music Desktop App.

## Overview

The YouTube Music Desktop App includes a robust auto-update system that allows users to receive updates automatically. The system is built on Electron's autoUpdater module and Squirrel.Windows for Windows platforms.

## Features

- **Automatic Update Checking**: The app checks for updates on startup and periodically while running.
- **Update Notifications**: Users are notified when updates are available and when they're ready to install.
- **Update Progress**: Users can see the download progress of updates.
- **Manual Update Checking**: Users can manually check for updates from the settings.
- **Update Settings**: Users can configure update behavior through the settings.
- **Error Handling**: The system handles and reports update errors gracefully.

## Architecture

The auto-update system consists of several components:

1. **Update Configuration**: Configured in `forge.config.ts` for Electron Forge.
2. **Update Logic**: Implemented in `src/main/index.ts` using Electron's autoUpdater.
3. **Update UI**: Includes a dedicated updates page in settings and notification components.
4. **Update Storage**: Stores update status and settings in the app's configuration.
5. **Error Tracking**: Integrates with Sentry for monitoring update errors and patterns.

## Update Process

1. **Check for Updates**: The app checks for updates on startup and periodically.
2. **Download Updates**: When an update is available, it's downloaded automatically.
3. **Notify User**: The user is notified when the update is ready to install.
4. **Install Update**: The update is installed when the user approves or automatically on next startup.

## User Interface

### Settings Window

The app includes a dedicated Updates tab in the settings window with the following features:

- **Update Status**: Shows the current status of updates (checking, downloading, ready, error).
- **Update Progress**: Shows the download progress when an update is downloading.
- **Check for Updates**: Allows users to manually check for updates.
- **Install Update**: Allows users to install a downloaded update.
- **Update Settings**: Allows users to configure update behavior.

### Update Notifications

The app shows notifications for update events:

- **Update Available**: Shown when an update is available and downloading.
- **Update Ready**: Shown when an update is downloaded and ready to install.
- **Update Error**: Shown when an error occurs during the update process.

## Configuration Options

Users can configure the following update settings:

- **Check on Startup**: Whether to check for updates when the app starts.
- **Auto-Install**: Whether to install updates automatically on restart.
- **Check Frequency**: How often to check for updates.
- **Beta Channel**: Whether to receive beta updates.

## Monitoring and Analytics

The app uses Sentry to monitor update events and errors:

- **Update Checks**: Tracks when update checks occur.
- **Update Availability**: Tracks when updates are available.
- **Update Downloads**: Tracks when updates are downloaded.
- **Update Installations**: Tracks when updates are installed.
- **Update Errors**: Tracks errors that occur during the update process.

## Troubleshooting

If users encounter issues with updates, they can:

1. **Check Update Status**: View the current status in the Updates tab.
2. **Manual Update**: Try manually checking for updates.
3. **Restart App**: Restart the app to clear any temporary issues.
4. **Download Latest Version**: Download the latest version manually from the website.

## Development

When developing features related to the auto-update system:

1. **Testing**: Test the update process thoroughly on all supported platforms.
2. **Error Handling**: Ensure all error cases are handled gracefully.
3. **User Experience**: Consider the user experience during the update process.
4. **Monitoring**: Use Sentry to monitor update events and errors.

## Release Process

The release process for updates includes:

1. **Version Bump**: Update the version in `package.json`.
2. **Tag Release**: Create a Git tag for the release.
3. **Build**: Build the app for all platforms.
4. **Publish**: Publish the update to the update server.
5. **Monitor**: Monitor Sentry for update errors and issues.
