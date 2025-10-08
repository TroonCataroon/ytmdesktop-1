/**
 * Sentry configuration for YouTube Music Desktop App
 * This file contains configuration for Sentry error tracking
 */
export const SENTRY_CONFIG = {
  // Your Sentry DSN (Data Source Name)
  dsn: 'https://966ef4683bb2992779007f1d58efb39a@o4509782535503872.ingest.us.sentry.io/4510093679460352',
  
  // Environment (production, staging, development)
  environment: process.env.NODE_ENV || 'development',
  
  // Release version
  release: 'youtube-music-desktop-app@2.0.9',
  
  // Whether to enable tracing
  enableTracing: true,
  
  // The percentage of transactions to track (0.0 to 1.0)
  tracesSampleRate: 1.0,
  
  // Maximum breadcrumbs to record
  maxBreadcrumbs: 50,
  
  // Whether to enable auto-session tracking
  autoSessionTracking: true,
  
  // Whether to enable the integrated performance monitoring
  enablePerformanceMonitoring: true,
  
  // Whether to capture errors in development mode
  captureInDevelopment: false,
  
  // Paths to ignore when capturing errors
  ignoreErrors: [
    // Ignore Chrome/Electron third-party cookie errors
    /third-party cookie/i,
    /Autofill\.enable/i,
    /Autofill\.setAddresses/i
  ],
  
  // Tags to include with every event
  initialTags: {
    app: 'youtube-music-desktop-app',
    electronVersion: process.versions.electron || '',
    nodeVersion: process.versions.node || '',
    chromeVersion: process.versions.chrome || '',
    platform: process.platform || ''
  },
  
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
    // Whether to track update events in Sentry
    enabled: true,
    
    // Events to track
    trackEvents: {
      updateCheck: true,
      updateAvailable: true,
      updateDownloaded: true,
      updateInstalled: true,
      updateError: true
    }
  }
};
