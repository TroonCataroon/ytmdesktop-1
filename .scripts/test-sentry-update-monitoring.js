/**
 * Test script for Sentry update monitoring
 * This script simulates update events to verify that the Sentry update monitoring is working properly
 */
const { SENTRY_CONFIG } = require('../out/main/shared/sentry.config');
const { sentryUpdateMonitor } = require('../out/main/integrations/sentry/update-monitoring');

// Ensure that the update monitoring is enabled in the Sentry config
if (!SENTRY_CONFIG.updateMonitoring?.enabled) {
  console.error('Error: Sentry update monitoring is not enabled in sentry.config.ts');
  process.exit(1);
}

// Configuration for testing
const currentVersion = '2.0.9';
const newVersion = '2.0.10';

/**
 * Test suite for the Sentry update monitoring
 */
async function runTests() {
  console.log('Starting Sentry update monitoring tests...');

  try {
    // Test update check tracking
    console.log('Testing update check tracking...');
    sentryUpdateMonitor.trackUpdateCheck(true, currentVersion);
    
    // Test update available tracking
    console.log('Testing update available tracking...');
    sentryUpdateMonitor.trackUpdateAvailable(newVersion, currentVersion, false);
    
    // Test update downloaded tracking
    console.log('Testing update downloaded tracking...');
    sentryUpdateMonitor.trackUpdateDownloaded(newVersion, currentVersion, false);
    
    // Test update installed tracking
    console.log('Testing update installed tracking...');
    sentryUpdateMonitor.trackUpdateInstalled(newVersion, currentVersion);
    
    // Test update error tracking
    console.log('Testing update error tracking...');
    sentryUpdateMonitor.trackUpdateError(new Error('Test update error'), currentVersion, 'testing');
    
    console.log('All Sentry update monitoring tests completed!');
    console.log('Check your Sentry dashboard to verify that the events were received.');
  } catch (error) {
    console.error('Error during Sentry update monitoring tests:', error);
    process.exit(1);
  }

  // Allow time for events to be sent before exiting
  setTimeout(() => {
    console.log('Tests completed. Exiting...');
    process.exit(0);
  }, 5000);
}

// Run the tests
runTests();
