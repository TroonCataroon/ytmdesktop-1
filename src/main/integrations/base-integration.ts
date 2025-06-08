import IIntegration from "./integration";
import { EventEmitter } from "events";
import { PlayerState } from "../player-state-store";
import playerStateStore from "../player-state-store";
import log from "electron-log";

/**
 * Base class for integrations that provides common functionality
 * like event listener management and safer state handling
 */
export default abstract class BaseIntegration implements IIntegration {
  protected eventListeners: Map<string, Set<(...args: any[]) => void>> = new Map();
  protected isEnabled: boolean = false;

  /**
   * Register an event listener with automatic cleanup
   * @param emitter The EventEmitter to listen to
   * @param event The event name
   * @param listener The event listener
   */
  protected registerEventListener<T extends EventEmitter>(
    emitter: T,
    event: string,
    listener: (...args: any[]) => void
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    
    // Wrap the listener to catch errors
    const safeListener = (...args: any[]) => {
      try {
        listener(...args);
      } catch (error) {
        log.error(`Error in ${this.constructor.name} event listener for ${event}:`, error);
      }
    };
    
    this.eventListeners.get(event).add(safeListener);
    emitter.on(event, safeListener);
  }

  /**
   * Register a player state listener with automatic cleanup
   * @param listener The player state listener
   */
  protected registerPlayerStateListener(listener: (state: PlayerState) => void): void {
    const safeListener = (state: PlayerState) => {
      try {
        listener(state);
      } catch (error) {
        log.error(`Error in ${this.constructor.name} player state listener:`, error);
      }
    };
    
    playerStateStore.addEventListener(safeListener);
    
    // Store for cleanup
    if (!this.eventListeners.has('playerState')) {
      this.eventListeners.set('playerState', new Set());
    }
    this.eventListeners.get('playerState').add(safeListener);
  }

  /**
   * Cleanup all registered event listeners
   */
  protected cleanupEventListeners(): void {
    for (const [event, listeners] of this.eventListeners.entries()) {
      if (event === 'playerState') {
        for (const listener of listeners) {
          playerStateStore.removeEventListener(listener);
        }
      }
      // Other event listeners would be cleaned up here
    }
    
    this.eventListeners.clear();
  }

  // IIntegration implementation - these should be overridden by child classes
  abstract provide(...args: unknown[]): void;

  abstract enable(): void;

  disable(): void {
    this.isEnabled = false;
    this.cleanupEventListeners();
  }

  getYTMScripts(): { name: string; script: string }[] {
    return [];
  }
} 
