import * as Sentry from '@sentry/electron/renderer';
import { SENTRY_CONFIG } from '../../../shared/sentry.config';

/**
 * Initialize Sentry for the renderer process
 * @param processName Name of the renderer process (e.g., 'main-window', 'settings-window')
 */
export function initializeSentry(processName: string): void {
  // Don't initialize Sentry in development unless configured to do so
  if (process.env.NODE_ENV === 'development' && !SENTRY_CONFIG.captureInDevelopment) {
    return;
  }
  
  try {
    Sentry.init({
      dsn: SENTRY_CONFIG.dsn,
      environment: SENTRY_CONFIG.environment,
      release: SENTRY_CONFIG.release,
      
      // Performance monitoring
      enableTracing: SENTRY_CONFIG.enableTracing,
      tracesSampleRate: SENTRY_CONFIG.tracesSampleRate,
      
      // Session Replay integration
      integrations: [
        Sentry.replayIntegration(),
      ],
      
      // Session Replay configuration
      replaysSessionSampleRate: SENTRY_CONFIG.sessionReplay?.sessionSampleRate ?? 0.1,
      replaysOnErrorSampleRate: SENTRY_CONFIG.sessionReplay?.errorSampleRate ?? 1.0,
      
      // Set maximum breadcrumbs
      maxBreadcrumbs: SENTRY_CONFIG.maxBreadcrumbs,
      
      // Include app info
      initialScope: {
        tags: {
          ...SENTRY_CONFIG.initialTags,
          process: 'renderer',
          renderer_process: processName
        },
      },
      
      // Specify which errors to ignore
      ignoreErrors: SENTRY_CONFIG.ignoreErrors,
      
      // Before sending an event to Sentry
      beforeSend(event) {
        // Don't send events in development unless configured to do so
        if (process.env.NODE_ENV === 'development' && !SENTRY_CONFIG.captureInDevelopment) {
          return null;
        }
        return event;
      },
    });
    
    // Set up global error handling
    window.addEventListener('error', (event) => {
      Sentry.captureException(event.error);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      Sentry.captureException(event.reason);
    });
    
    console.info(`Sentry initialized for renderer process: ${processName}`);
  } catch (error) {
    console.error('Failed to initialize Sentry in renderer process:', error);
  }
}

/**
 * Manually capture an exception
 * @param error The error to capture
 * @param context Additional context information
 */
export function captureException(error: Error, context?: Record<string, unknown>): string | undefined {
  try {
    return Sentry.captureException(error, { 
      contexts: { additional: context || {} } 
    });
  } catch (captureError) {
    console.error('Failed to capture exception with Sentry:', captureError);
    return undefined;
  }
}

/**
 * Manually capture a message
 * @param message The message to capture
 * @param level The severity level
 * @param context Additional context information
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, unknown>): string | undefined {
  try {
    return Sentry.captureMessage(message, { 
      level,
      contexts: { additional: context || {} } 
    });
  } catch (captureError) {
    console.error('Failed to capture message with Sentry:', captureError);
    return undefined;
  }
}

/**
 * Add breadcrumb to the current scope
 * @param breadcrumb The breadcrumb to add
 */
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
  try {
    Sentry.addBreadcrumb(breadcrumb);
  } catch (error) {
    console.error('Failed to add breadcrumb to Sentry:', error);
  }
}

/**
 * Set tag for the current scope
 * @param key Tag key
 * @param value Tag value
 */
export function setTag(key: string, value: string): void {
  try {
    Sentry.setTag(key, value);
  } catch (error) {
    console.error('Failed to set Sentry tag:', error);
  }
}

/**
 * Set user information
 * @param user User information object
 */
export function setUser(user: Sentry.User | null): void {
  try {
    Sentry.setUser(user);
  } catch (error) {
    console.error('Failed to set Sentry user:', error);
  }
}

/**
 * Start a new transaction for performance monitoring
 * @param name Transaction name
 * @param operation Operation type
 */
export function startTransaction(name: string, operation: string): unknown {
  if (!SENTRY_CONFIG.enablePerformanceMonitoring) {
    return undefined;
  }
  
  try {
    // Handle startTransaction not being in the Sentry namespace
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const startTransactionFn = (Sentry as any).startTransaction;
    if (typeof startTransactionFn === 'function') {
      return startTransactionFn({
        name,
        op: operation
      });
    }
    return undefined;
  } catch (error) {
    console.error('Failed to start Sentry transaction:', error);
    return undefined;
  }
}
