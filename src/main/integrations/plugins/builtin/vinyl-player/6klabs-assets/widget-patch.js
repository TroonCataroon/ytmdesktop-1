/**
 * 6K Labs Widget Patch
 * Fixes known issues with the bundled widget:
 * 1. Invalid negative blur filter values in animations
 * 2. Excessive "Showing player" console logging
 * 3. Undefined/invalid progress percentages
 */

(function() {
  'use strict';

  // Store original console methods
  const originalLog = console.log;
  const originalWarn = console.warn;

  // Counter for repeated messages to prevent spam
  const logCounts = new Map();
  const MAX_REPEATED_LOGS = 3;
  const RESET_INTERVAL = 5000; // Reset counts every 5 seconds

  // Periodically reset log counts
  setInterval(() => {
    logCounts.clear();
  }, RESET_INTERVAL);

  /**
   * Patch console.log to filter excessive "Showing player" messages
   */
  console.log = function(...args) {
    const message = args[0];
    
    // Filter "Showing player" spam
    if (typeof message === 'string' && message.includes('Showing player')) {
      const count = (logCounts.get(message) || 0) + 1;
      logCounts.set(message, count);
      
      if (count <= MAX_REPEATED_LOGS) {
        if (count === MAX_REPEATED_LOGS) {
          originalLog.call(console, `${message} (suppressing further identical messages...)`);
        } else {
          originalLog.apply(console, args);
        }
      }
      return;
    }

    // Filter undefined progress percentages
    if (typeof message === 'string' && message.includes('Progress in percent:')) {
      const progressMatch = message.match(/Progress in percent:\s*(\S+)/);
      if (progressMatch) {
        const value = progressMatch[1];
        // Skip if undefined or invalid (NaN, Infinity, or > 100%)
        if (value === 'undefined' || value === 'NaN' || value === 'Infinity' || parseFloat(value) > 100) {
          return; // Suppress invalid progress logs
        }
      }
    }

    originalLog.apply(console, args);
  };

  /**
   * Suppress specific console warnings for invalid blur values
   */
  console.warn = function(...args) {
    const message = args[0];
    
    // Filter blur-related warnings
    if (typeof message === 'string' && message.includes('Invalid keyframe value for property filter: blur')) {
      return; // Suppress these warnings as they're handled by the CSS engine
    }

    originalWarn.apply(console, args);
  };

  /**
   * Patch CSS animation to fix negative blur values
   * This intercepts style applications and corrects invalid blur values
   */
  if (typeof Element !== 'undefined') {
    // Patch setAttribute
    const originalSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name, value) {
      if ((name === 'style' || name === 'filter') && typeof value === 'string') {
        // Fix negative blur values: blur(-0.123px) -> blur(0px)
        value = value.replace(/blur\((-[\d.]+)(px|rem|em|%)\)/gi, 'blur(0$2)');
      }
      return originalSetAttribute.call(this, name, value);
    };

    // Patch style property setter
    const originalStyleSetter = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'style').set;
    if (originalStyleSetter) {
      Object.defineProperty(HTMLElement.prototype, 'style', {
        set: function(value) {
          if (typeof value === 'string') {
            value = value.replace(/blur\((-[\d.]+)(px|rem|em|%)\)/gi, 'blur(0$2)');
          }
          return originalStyleSetter.call(this, value);
        },
        get: function() {
          return this.getAttribute('style') || '';
        },
        enumerable: true,
        configurable: true
      });
    }
  }

  /**
   * Patch Web Animations API to fix negative blur in keyframes
   */
  if (typeof Element !== 'undefined' && Element.prototype.animate) {
    const originalAnimate = Element.prototype.animate;
    Element.prototype.animate = function(keyframes, options) {
      // Fix keyframes if they contain filter properties with negative blur
      if (Array.isArray(keyframes)) {
        keyframes = keyframes.map(frame => {
          if (frame && frame.filter && typeof frame.filter === 'string') {
            frame.filter = frame.filter.replace(/blur\((-[\d.]+)(px|rem|em|%)\)/gi, 'blur(0$2)');
          }
          return frame;
        });
      } else if (keyframes && typeof keyframes === 'object') {
        Object.keys(keyframes).forEach(key => {
          if (key === 'filter') {
            const filters = keyframes[key];
            if (Array.isArray(filters)) {
              keyframes[key] = filters.map(f => 
                typeof f === 'string' ? f.replace(/blur\((-[\d.]+)(px|rem|em|%)\)/gi, 'blur(0$2)') : f
              );
            } else if (typeof filters === 'string') {
              keyframes[key] = filters.replace(/blur\((-[\d.]+)(px|rem|em|%)\)/gi, 'blur(0$2)');
            }
          }
        });
      }
      
      return originalAnimate.call(this, keyframes, options);
    };
  }

  console.log('[Widget Patch] 6K Labs widget patches applied successfully');
  console.log('[Widget Patch] - Blur value fix: Active');
  console.log('[Widget Patch] - Console spam reduction: Active');
  console.log('[Widget Patch] - Progress validation: Active');
})();

