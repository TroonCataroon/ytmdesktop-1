import log from "electron-log";

/**
 * MemoryMonitor - Professional memory monitoring for development
 *
 * Tracks memory usage and detects potential memory leaks during development.
 * Only active in development mode to avoid performance overhead in production.
 */
export default class MemoryMonitor {
  private monitorInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private initialMemory: NodeJS.MemoryUsage | null = null;
  private memoryHistory: Array<{ timestamp: number; usage: NodeJS.MemoryUsage }> = [];
  private maxHistorySize = 100;

  /**
   * Start monitoring memory usage
   * @param intervalMs Monitoring interval in milliseconds (default: 30000 - 30 seconds)
   */
  start(intervalMs = 30000): void {
    if (this.isMonitoring) {
      log.warn("Memory monitor already running");
      return;
    }

    if (process.env.NODE_ENV !== "development") {
      log.info("Memory monitor disabled in production");
      return;
    }

    this.initialMemory = process.memoryUsage();
    this.isMonitoring = true;

    log.info("Starting memory monitor");
    this.logMemoryUsage("Initial");

    this.monitorInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, intervalMs);
  }

  /**
   * Stop monitoring memory usage
   */
  stop(): void {
    if (!this.isMonitoring) {
      return;
    }

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    this.isMonitoring = false;
    log.info("Stopped memory monitor");
    this.logMemoryUsage("Final");
    this.generateReport();
  }

  /**
   * Check current memory usage and detect issues
   */
  private checkMemoryUsage(): void {
    const current = process.memoryUsage();
    const timestamp = Date.now();

    // Store in history
    this.memoryHistory.push({ timestamp, usage: current });

    // Keep history size manageable
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory.shift();
    }

    // Log current usage
    this.logMemoryUsage("Current");

    // Detect potential memory leaks
    this.detectMemoryLeaks(current);
  }

  /**
   * Log memory usage in human-readable format
   */
  private logMemoryUsage(label: string): void {
    const usage = process.memoryUsage();
    log.debug(`[Memory Monitor] ${label} Memory Usage:`);
    log.debug(`  RSS: ${this.formatBytes(usage.rss)} (Resident Set Size)`);
    log.debug(`  Heap Total: ${this.formatBytes(usage.heapTotal)}`);
    log.debug(`  Heap Used: ${this.formatBytes(usage.heapUsed)}`);
    log.debug(`  External: ${this.formatBytes(usage.external)}`);
    log.debug(`  Array Buffers: ${this.formatBytes(usage.arrayBuffers)}`);

    if (this.initialMemory) {
      const rssGrowth = usage.rss - this.initialMemory.rss;
      const heapGrowth = usage.heapUsed - this.initialMemory.heapUsed;
      log.debug(`  RSS Growth: ${this.formatBytes(rssGrowth)}`);
      log.debug(`  Heap Growth: ${this.formatBytes(heapGrowth)}`);
    }
  }

  /**
   * Detect potential memory leaks based on growth patterns
   */
  private detectMemoryLeaks(current: NodeJS.MemoryUsage): void {
    if (!this.initialMemory || this.memoryHistory.length < 10) {
      return; // Need more history to detect patterns
    }

    // Check heap growth over initial
    const heapGrowthPercent = ((current.heapUsed - this.initialMemory.heapUsed) / this.initialMemory.heapUsed) * 100;

    // Check if memory is consistently growing
    const recentHistory = this.memoryHistory.slice(-10);
    const isGrowing = recentHistory.every((entry, idx) => {
      if (idx === 0) return true;
      return entry.usage.heapUsed >= recentHistory[idx - 1].usage.heapUsed;
    });

    // Warn if heap has grown significantly
    if (heapGrowthPercent > 50) {
      log.warn(`[Memory Monitor] ⚠️  Heap has grown by ${heapGrowthPercent.toFixed(1)}%`);
    }

    // Alert if memory is consistently growing (potential leak)
    if (isGrowing && heapGrowthPercent > 25) {
      log.warn(`[Memory Monitor] 🔴 Potential memory leak detected! Heap consistently growing.`);
      log.warn(`  Initial heap: ${this.formatBytes(this.initialMemory.heapUsed)}`);
      log.warn(`  Current heap: ${this.formatBytes(current.heapUsed)}`);
      log.warn(`  Growth: ${this.formatBytes(current.heapUsed - this.initialMemory.heapUsed)} (+${heapGrowthPercent.toFixed(1)}%)`);
    }

    // Alert if RSS exceeds 500MB
    if (current.rss > 500 * 1024 * 1024) {
      log.warn(`[Memory Monitor] ⚠️  High memory usage: RSS = ${this.formatBytes(current.rss)}`);
    }
  }

  /**
   * Generate a summary report of memory usage
   */
  private generateReport(): void {
    if (this.memoryHistory.length === 0) {
      return;
    }

    const latest = this.memoryHistory[this.memoryHistory.length - 1].usage;

    log.info("[Memory Monitor] === Session Summary ===");
    if (this.initialMemory) {
      log.info(`Initial Memory: ${this.formatBytes(this.initialMemory.heapUsed)}`);
      log.info(`Final Memory: ${this.formatBytes(latest.heapUsed)}`);
      log.info(`Total Growth: ${this.formatBytes(latest.heapUsed - this.initialMemory.heapUsed)}`);

      const growthPercent = ((latest.heapUsed - this.initialMemory.heapUsed) / this.initialMemory.heapUsed) * 100;
      log.info(`Growth Percent: ${growthPercent.toFixed(1)}%`);
    }

    log.info(`Total Samples: ${this.memoryHistory.length}`);
    log.info(`Peak RSS: ${this.formatBytes(Math.max(...this.memoryHistory.map(h => h.usage.rss)))}`);
    log.info(`Peak Heap: ${this.formatBytes(Math.max(...this.memoryHistory.map(h => h.usage.heapUsed)))}`);
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    const value = bytes / Math.pow(k, i);

    return `${value.toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Force garbage collection (if exposed) and log results
   * Requires Node to be started with --expose-gc flag
   */
  forceGC(): void {
    if (global.gc) {
      log.info("[Memory Monitor] Forcing garbage collection...");
      const before = process.memoryUsage();
      global.gc();
      const after = process.memoryUsage();

      const freed = before.heapUsed - after.heapUsed;
      log.info(`[Memory Monitor] GC freed: ${this.formatBytes(freed)}`);
    } else {
      log.warn("[Memory Monitor] GC not exposed. Start Node with --expose-gc to enable.");
    }
  }

  /**
   * Get current memory statistics
   */
  getStats(): {
    current: NodeJS.MemoryUsage;
    initial: NodeJS.MemoryUsage | null;
    growth: { rss: number; heapUsed: number; heapTotal: number } | null;
    isMonitoring: boolean;
    historySize: number;
  } {
    const current = process.memoryUsage();
    let growth = null;

    if (this.initialMemory) {
      growth = {
        rss: current.rss - this.initialMemory.rss,
        heapUsed: current.heapUsed - this.initialMemory.heapUsed,
        heapTotal: current.heapTotal - this.initialMemory.heapTotal
      };
    }

    return {
      current,
      initial: this.initialMemory,
      growth,
      isMonitoring: this.isMonitoring,
      historySize: this.memoryHistory.length
    };
  }
}

// Export singleton instance
export const memoryMonitor = new MemoryMonitor();
