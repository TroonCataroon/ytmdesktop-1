import * as Sentry from '@sentry/electron/main';
import { app } from 'electron';
import { BaseIntegration } from '../../integrations/base-integration';
import { SENTRY_CONFIG } from '../../../shared/sentry.config';
import log from 'electron-log';

/**
 * Sentry Integration for the main process
 * Tracks errors and exceptions in the main Electron process
 */
export default class SentryIntegration extends BaseIntegration {
  private enabled = false;

  constructor() {
    super();
    this.initialize();
  }

  private initialize(): void {
    // Don't initialize Sentry in development unless configured to do so
    if (process.env.NODE_ENV === 'development' && !SENTRY_CONFIG.captureInDevelopment) {
      return;
    }

    try {
      Sentry.init({
        dsn: SENTRY_CONFIG.dsn,
        environment: SENTRY_CONFIG.environment,
        release: SENTRY_CONFIG.release,
        
        // Electron specific options
        enableNative: true,
        
        // Performance monitoring
        enableTracing: SENTRY_CONFIG.enableTracing,
        tracesSampleRate: SENTRY_CONFIG.tracesSampleRate,
        
        // Session tracking
        autoSessionTracking: SENTRY_CONFIG.autoSessionTracking,
        
        // Set maximum breadcrumbs
        maxBreadcrumbs: SENTRY_CONFIG.maxBreadcrumbs,
        
        // Include app info
        initialScope: {
          tags: {
            ...SENTRY_CONFIG.initialTags,
            process: 'main'
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

      // Set user information once available
      app.on('ready', () => {
        Sentry.setTag('app_version', app.getVersion());
        Sentry.setTag('executable_path', app.getPath('exe'));
        Sentry.setTag('user_data_path', app.getPath('userData'));
      });

      log.info('Sentry integration initialized in main process');
    } catch (error) {
      log.error('Failed to initialize Sentry in main process:', error);
    }
  }

  enable(): void {
    if (this.enabled) {
      return;
    }
    
    if (process.env.NODE_ENV === 'development' && !SENTRY_CONFIG.captureInDevelopment) {
      log.info('Sentry integration not enabled in development mode');
      return;
    }

    try {
      // Use direct option setting instead of through hub
      const client = Sentry.getClient();
      if (client) {
        client.getOptions().enabled = true;
      }
      this.enabled = true;
      log.info('Sentry integration enabled in main process');
    } catch (error) {
      log.error('Failed to enable Sentry in main process:', error);
    }
  }

  disable(): void {
    if (!this.enabled) {
      return;
    }

    try {
      // Use direct option setting instead of through hub
      const client = Sentry.getClient();
      if (client) {
        client.getOptions().enabled = false;
      }
      this.enabled = false;
      log.info('Sentry integration disabled in main process');
    } catch (error) {
      log.error('Failed to disable Sentry in main process:', error);
    }
  }

  /**
   * Manually capture an exception
   * @param error The error to capture
   * @param context Additional context information
   */
  captureException(error: Error, context?: Record<string, unknown>): string | null {
    if (!this.enabled) {
      return null;
    }

    try {
      return Sentry.captureException(error, { 
        contexts: { additional: context || {} } 
      });
    } catch (captureError) {
      log.error('Failed to capture exception with Sentry:', captureError);
      return null;
    }
  }

  /**
   * Manually capture a message
   * @param message The message to capture
   * @param level The severity level
   * @param context Additional context information
   */
  captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, unknown>): string | null {
    if (!this.enabled) {
      return null;
    }

    try {
      return Sentry.captureMessage(message, { 
        level,
        contexts: { additional: context || {} } 
      });
    } catch (captureError) {
      log.error('Failed to capture message with Sentry:', captureError);
      return null;
    }
  }

  /**
   * Add breadcrumb to the current scope
   * @param breadcrumb The breadcrumb to add
   */
  addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
    if (!this.enabled) {
      return;
    }

    try {
      Sentry.addBreadcrumb(breadcrumb);
    } catch (error) {
      log.error('Failed to add breadcrumb to Sentry:', error);
    }
  }

  /**
   * Set tag for the current scope
   * @param key Tag key
   * @param value Tag value
   */
  setTag(key: string, value: string): void {
    if (!this.enabled) {
      return;
    }

    try {
      Sentry.setTag(key, value);
    } catch (error) {
      log.error('Failed to set Sentry tag:', error);
    }
  }

  /**
   * Set user information
   * @param user User information object
   */
  setUser(user: Sentry.User | null): void {
    if (!this.enabled) {
      return;
    }

    try {
      Sentry.setUser(user);
    } catch (error) {
      log.error('Failed to set Sentry user:', error);
    }
  }
}
