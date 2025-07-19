/**
 * Performance monitoring utility for the main process.
 *
 * This module provides performance tracking and monitoring capabilities
 * for the Electron application. It tracks key application events and
 * provides timing information for optimization.
 *
 * @module performance-monitor
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import logger from './main-logger';

/**
 * Interface defining a performance checkpoint.
 */
interface Checkpoint {
  /** Name of the checkpoint */
  name: string;
  /** Timestamp when the checkpoint was created */
  timestamp: number;
  /** Duration since the previous checkpoint */
  duration?: number;
}

/**
 * Performance monitor for tracking application events.
 *
 * This class provides methods for tracking performance checkpoints
 * and generating performance summaries. It helps identify bottlenecks
 * and optimize application startup and runtime performance.
 *
 * @example
 * ```ts
 * import { performanceMonitor } from './performance-monitor';
 *
 * performanceMonitor.checkpoint('app-start');
 * // ... some work ...
 * performanceMonitor.checkpoint('app-ready');
 * performanceMonitor.summary();
 * ```
 */
class PerformanceMonitor {
  /** Array of performance checkpoints */
  private checkpoints: Checkpoint[] = [];
  /** Start time of the monitoring session */
  private startTime: number = Date.now();

  /**
   * Creates a new performance checkpoint.
   *
   * This method records a checkpoint with the current timestamp
   * and calculates the duration since the previous checkpoint.
   *
   * @param name - Name of the checkpoint
   */
  checkpoint(name: string): void {
    const timestamp = Date.now();
    const checkpoint: Checkpoint = {
      name,
      timestamp,
    };

    // Calculate duration since last checkpoint
    if (this.checkpoints.length > 0) {
      const lastCheckpoint = this.checkpoints[this.checkpoints.length - 1];
      checkpoint.duration = timestamp - lastCheckpoint.timestamp;
    }

    this.checkpoints.push(checkpoint);
    logger.debug(`Performance checkpoint: ${name}`, { duration: checkpoint.duration });
  }

  /**
   * Generates and logs a performance summary.
   *
   * This method calculates and logs timing information for all
   * checkpoints, including total time and individual durations.
   */
  summary(): void {
    if (this.checkpoints.length === 0) {
      logger.info('No performance checkpoints recorded');
      return;
    }

    const totalTime = Date.now() - this.startTime;
    const summary = {
      totalTime: `${totalTime}ms`,
      checkpoints: this.checkpoints.map((cp) => ({
        name: cp.name,
        timestamp: cp.timestamp - this.startTime,
        duration: cp.duration ? `${cp.duration}ms` : 'N/A',
      })),
    };

    logger.info('Performance summary:', summary);
  }

  /**
   * Clears all performance checkpoints.
   *
   * This method resets the performance monitor, clearing all
   * recorded checkpoints and resetting the start time.
   */
  clear(): void {
    this.checkpoints = [];
    this.startTime = Date.now();
    logger.debug('Performance monitor cleared');
  }

  /**
   * Gets the current performance checkpoints.
   *
   * @returns Array of performance checkpoints
   */
  getCheckpoints(): Checkpoint[] {
    return [...this.checkpoints];
  }
}

/**
 * Singleton performance monitor instance.
 *
 * This instance is shared across the main process and provides
 * centralized performance tracking capabilities.
 */
export const performanceMonitor = new PerformanceMonitor();
