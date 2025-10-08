# Sentry Integration for YouTube Music Desktop App

This document provides an overview of the Sentry integration in the YouTube Music Desktop App, with a focus on update monitoring and session replay.

## Overview

The YouTube Music Desktop App uses Sentry for error tracking, performance monitoring, event logging, and session replay. The integration is designed to help identify and fix issues quickly, and to provide insights into how the app is performing and how users interact with it.

## Features

- **Error Tracking**: Automatically captures and reports errors, exceptions, and crashes.
- **Performance Monitoring**: Tracks app performance and identifies bottlenecks.
- **Update Monitoring**: Tracks update events and errors to ensure smooth updates.
- **User Context**: Captures user context to help reproduce and fix issues.
- **Breadcrumbs**: Records actions leading up to errors to aid debugging.
- **Session Replay**: Records and replays user sessions to help understand and diagnose issues.

## Update Monitoring

The app includes specialized Sentry tracking for auto-update events:

### Update Events Tracked

- **Update Check**: When the app checks for updates.
- **Update Available**: When an update is found and downloading begins.
- **Update Progress**: Progress of update downloads (at 25%, 50%, 75%, and 100%).
- **Update Downloaded**: When an update has been downloaded and is ready to install.
- **Update Installing**: When an update is being installed.
- **Update Errors**: Any errors that occur during the update process.

### Implementation

The update monitoring is implemented in the following files:

- `src/shared/sentry.config.ts`: Configuration for Sentry, including update monitoring settings.
- `src/main/integrations/sentry/index.ts`: Main Sentry integration for the app.
- `src/main/integrations/sentry/update-monitoring.ts`: Specialized class for update monitoring.
- `src/main/index.ts`: Integration of update monitoring with the auto-update system.

## Session Replay

Session Replay is a Sentry feature that records and replays user sessions, allowing developers to see exactly what a user experienced when an error occurred. This provides valuable context for debugging and improving the user experience.

### How It Works

1. **Recording**: The Sentry SDK records user interactions, DOM changes, network requests, and console logs during a session.
2. **Sampling**: Only a percentage of sessions are recorded to minimize performance impact and respect user privacy.
3. **Error Detection**: When an error occurs, the session recording leading up to the error is automatically sent to Sentry.
4. **Replay**: Developers can watch the replay in Sentry to understand what happened before, during, and after the error.

### Privacy Considerations

Session Replay is designed with privacy in mind:

- Sensitive data like passwords and credit card numbers are automatically masked.
- Only a small percentage of sessions are recorded (10% by default).
- For sessions with errors, a higher sampling rate is used (100% by default).

### Implementation

The Session Replay feature is implemented in the following files:

- `src/shared/sentry.config.ts`: Configuration for Session Replay.
- `src/renderer/integrations/sentry/index.ts`: Renderer-side Sentry integration with Session Replay.
- `src/renderer/windows/main/renderer.ts`: Integration in the main window.
- `src/renderer/windows/settings/renderer.ts`: Integration in the settings window.
- `src/renderer/windows/authorize-companion/renderer.ts`: Integration in the authorization window.

## Configuration

The Sentry integration can be configured in `src/shared/sentry.config.ts`:

```typescript
export const SENTRY_CONFIG = {
  // General Sentry configuration
  dsn: 'your-sentry-dsn',
  environment: process.env.NODE_ENV || 'development',
  release: 'youtube-music-desktop-app@x.y.z',
  
  // Session Replay configuration
  sessionReplay: {
    // Whether to enable session replay
    enabled: true,
    
    // Sample rate for sessions (percentage of sessions to record)
    sessionSampleRate: 0.1,
    
    // Sample rate for sessions with errors (should be higher than regular sessions)
    errorSampleRate: 1.0
  },
  
  // Update monitoring configuration
  updateMonitoring: {
    enabled: true,
    trackEvents: {
      updateCheck: true,
      updateAvailable: true,
      updateDownloaded: true,
      updateInstalled: true,
      updateError: true
    }
  }
};
```

## Usage

### Tracking Update Events

The `SentryUpdateMonitoring` class provides methods for tracking update events:

```typescript
// Initialize update monitoring
sentryUpdateMonitoring.initialize();

// Track update check
sentryUpdateMonitoring.trackUpdateCheck(isStartupCheck);

// Track update available
sentryUpdateMonitoring.trackUpdateAvailable(newVersion, isStartupCheck);

// Track update progress
sentryUpdateMonitoring.trackUpdateProgress(percent, newVersion);

// Track update downloaded
sentryUpdateMonitoring.trackUpdateDownloaded(newVersion, autoInstall);

// Track update installing
sentryUpdateMonitoring.trackUpdateInstalling(newVersion, manualInstall);

// Track update error
sentryUpdateMonitoring.trackUpdateError(error, context);
```

### Capturing Custom Events

You can also capture custom events using the Sentry API directly:

```typescript
import * as Sentry from '@sentry/electron/main';

// Capture a message
Sentry.captureMessage('Something happened', 'info');

// Capture an exception
try {
  // Something that might fail
} catch (error) {
  Sentry.captureException(error);
}

// Add a breadcrumb
Sentry.addBreadcrumb({
  category: 'ui',
  message: 'User clicked a button',
  level: 'info'
});
```

### Using Session Replay

Session Replay is automatically initialized in the renderer process. However, you can customize the behavior using the Sentry API:

```typescript
import * as Sentry from '@sentry/electron/renderer';

// Mark important UI events
Sentry.addBreadcrumb({
  category: 'ui.click',
  message: 'User clicked on play button',
  level: 'info'
});

// Add custom context to the replay
Sentry.setContext("player", {
  currentTrack: "Sample Song",
  artist: "Sample Artist",
  duration: "3:45"
});

// Block specific elements from being captured in the replay
// This example prevents a password input from being captured
document.getElementById('password').setAttribute('data-replay-obscured', 'true');
```

#### Viewing Replays in Sentry

To view session replays in Sentry:

1. Navigate to your Sentry project
2. Go to the "Replays" tab
3. Filter by various criteria like error status, browser, or time
4. Click on a replay to view it

Replays can also be accessed directly from error reports, where they provide context about what happened before and during the error.

## Testing

To test the Sentry integration for update events, you can use the provided test script:

```bash
yarn test-sentry
```

This script simulates update events and sends them to Sentry, allowing you to verify that the integration is working correctly.

## Troubleshooting

If you encounter issues with the Sentry integration:

1. **Check Configuration**: Ensure that the Sentry DSN and other configuration options are correct.
2. **Check Network**: Ensure that the app can connect to the Sentry servers.
3. **Check Logs**: Look for Sentry-related errors in the app logs.
4. **Run Test Script**: Use the test script to verify that the integration is working correctly.

## Best Practices

1. **Respect User Privacy**: Only collect information that is necessary for debugging and improving the app.
2. **Handle Sensitive Data**: Use Sentry's data scrubbing features to remove sensitive information.
3. **Monitor Performance**: Keep an eye on the performance impact of Sentry, especially in production.
4. **Review Events**: Regularly review Sentry events to identify and fix issues.
5. **Update DSN**: If you fork this project, make sure to update the Sentry DSN to your own.
