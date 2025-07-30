/**
 * State synchronization service for JSON Schema Editor.
 *
 * This service provides real-time synchronization between different modules
 * and components, with optimistic updates and conflict resolution.
 *
 * @module StateSync
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../stores/useAppStore';

import logger from '../lib/renderer-logger';

/**
 * Synchronization event types.
 */
type SyncEventType =
  | 'schema-updated'
  | 'schema-created'
  | 'schema-deleted'
  | 'project-loaded'
  | 'project-saved'
  | 'validation-completed'
  | 'analytics-updated';

/**
 * Synchronization event data.
 */
interface SyncEvent {
  type: SyncEventType;
  timestamp: number;
  data: unknown;
  source: string;
  version: number;
}

/**
 * Conflict resolution strategy.
 */
type ConflictResolution = 'last-write-wins' | 'user-choice' | 'merge' | 'reject';

/**
 * Synchronization conflict.
 */
interface SyncConflict {
  id: string;
  type: SyncEventType;
  localVersion: number;
  remoteVersion: number;
  localData: unknown;
  remoteData: unknown;
  timestamp: number;
}

/**
 * State synchronization options.
 */
interface StateSyncOptions {
  /** Enable real-time synchronization */
  enableRealTimeSync?: boolean;
  /** Enable optimistic updates */
  enableOptimisticUpdates?: boolean;
  /** Conflict resolution strategy */
  conflictResolution?: ConflictResolution;
  /** Synchronization debounce delay in milliseconds */
  debounceDelay?: number;
  /** Maximum number of sync events to store in history */
  maxHistorySize?: number;
  /** Enable change tracking */
  enableChangeTracking?: boolean;
  /** Auto-resolve conflicts */
  autoResolveConflicts?: boolean;
}

/**
 * State synchronization result.
 */
interface StateSyncResult {
  /** Whether synchronization is active */
  isActive: boolean;
  /** Whether there are pending changes */
  hasPendingChanges: boolean;
  /** Number of unresolved conflicts */
  conflictCount: number;
  /** Current conflicts */
  conflicts: SyncConflict[];
  /** Synchronization history */
  history: SyncEvent[];
  /** Last synchronization timestamp */
  lastSync: Date | null;
  /** Function to emit sync event */
  emitEvent: (type: SyncEventType, data: any, source?: string) => void;
  /** Function to resolve conflict */
  resolveConflict: (conflictId: string, resolution: 'local' | 'remote' | 'merge') => void;
  /** Function to force synchronization */
  forceSync: () => Promise<void>;
  /** Function to enable/disable sync */
  toggleSync: (enabled: boolean) => void;
  /** Function to clear sync history */
  clearHistory: () => void;
  /** Current synchronization status */
  syncStatus: 'idle' | 'syncing' | 'error' | 'conflict';
}

/**
 * Hook for state synchronization functionality.
 *
 * Provides real-time synchronization between modules with conflict resolution,
 * optimistic updates, and change tracking.
 *
 * @param options - Synchronization configuration
 * @returns State synchronization utilities and state
 *
 * @example
 * ```tsx
 * const {
 *   emitEvent,
 *   conflicts,
 *   resolveConflict,
 *   hasPendingChanges,
 *   forceSync
 * } = useStateSync({
 *   enableRealTimeSync: true,
 *   enableOptimisticUpdates: true,
 *   conflictResolution: 'user-choice'
 * });
 *
 * // Emit schema update event
 * emitEvent('schema-updated', updatedSchema, 'editor');
 * ```
 */
export function useStateSync(options: StateSyncOptions = {}): StateSyncResult {
  const {
    enableRealTimeSync = true,
    // enableOptimisticUpdates = true,
    conflictResolution = 'last-write-wins',
    debounceDelay = 500,
    maxHistorySize = 100,
    enableChangeTracking = true,
    autoResolveConflicts = true,
  } = options;

  const [isActive, setIsActive] = useState(enableRealTimeSync);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [history, setHistory] = useState<SyncEvent[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'conflict'>('idle');
  const [pendingChanges, setPendingChanges] = useState<Set<string>>(new Set());

  const eventQueue = useRef<SyncEvent[]>([]);
  const debounceTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const versionCounters = useRef<Map<string, number>>(new Map());
  const eventListeners = useRef<Map<string, Set<(event: SyncEvent) => void>>>(new Map());

  // App store access
  const currentProject = useAppStore((state) => state.currentProject);
  const setCurrentProject = useAppStore((state) => state.setCurrentProject);
  // const updateSchema = useAppStore((state) => state.updateSchema);

  /**
   * Get next version number for an entity.
   */
  const getNextVersion = useCallback((entityId: string): number => {
    const current = versionCounters.current.get(entityId) || 0;
    const next = current + 1;
    versionCounters.current.set(entityId, next);
    return next;
  }, []);

  /**
   * Add event to history.
   */
  const addToHistory = useCallback(
    (event: SyncEvent) => {
      setHistory((prev) => {
        const newHistory = [...prev, event];
        return newHistory.slice(-maxHistorySize);
      });
    },
    [maxHistorySize],
  );

  /**
   * Emit synchronization event.
   */
  const emitEvent = useCallback(
    (type: SyncEventType, data: any, source: string = 'unknown'): void => {
      if (!isActive) return;

      const event: SyncEvent = {
        type,
        timestamp: Date.now(),
        data: JSON.parse(JSON.stringify(data)), // Deep clone
        source,
        version: getNextVersion(`${type}-${data.id || 'global'}`),
      };

      // Add to queue for processing
      eventQueue.current.push(event);
      addToHistory(event);

      // Process queue with debouncing
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }

      debounceTimeout.current = setTimeout(() => {
        processEventQueue();
      }, debounceDelay);

      logger.debug('Sync event emitted', { type, source, version: event.version });
    },
    [isActive, getNextVersion, addToHistory, debounceDelay],
  );

  /**
   * Process queued synchronization events.
   */
  const processEventQueue = useCallback(async (): Promise<void> => {
    if (eventQueue.current.length === 0) return;

    setSyncStatus('syncing');
    const events = [...eventQueue.current];
    eventQueue.current = [];

    try {
      for (const event of events) {
        await processEvent(event);
      }

      setLastSync(new Date());
      setSyncStatus(conflicts.length > 0 ? 'conflict' : 'idle');
    } catch (error) {
      logger.error('Failed to process sync events', error);
      setSyncStatus('error');
    }
  }, [conflicts.length]);

  /**
   * Process individual synchronization event.
   */
  const processEvent = useCallback(
    async (event: SyncEvent): Promise<void> => {
      const { type, data, source, version } = event;

      try {
        // Check for conflicts
        const existingVersion = versionCounters.current.get(`${type}-${data.id || 'global'}`) || 0;

        if (version < existingVersion && source !== 'local') {
          // Potential conflict detected
          const conflict: SyncConflict = {
            id: `${type}-${data.id}-${Date.now()}`,
            type,
            localVersion: existingVersion,
            remoteVersion: version,
            localData: getCurrentData(type, data.id),
            remoteData: data,
            timestamp: Date.now(),
          };

          if (autoResolveConflicts) {
            resolveConflictAutomatically(conflict);
          } else {
            setConflicts((prev) => [...prev, conflict]);
            setSyncStatus('conflict');
            return;
          }
        }

        // Apply the event
        await applyEvent(event);

        // Update version counter
        versionCounters.current.set(`${type}-${data.id || 'global'}`, version);

        // Track pending changes
        if (enableChangeTracking && source === 'local') {
          setPendingChanges((prev) => new Set(prev).add(`${type}-${data.id}`));
        }

        // Notify listeners
        const listeners = eventListeners.current.get(type);
        if (listeners) {
          listeners.forEach((listener) => listener(event));
        }
      } catch (error) {
        logger.error('Failed to process sync event', { type, error });
        throw error;
      }
    },
    [autoResolveConflicts, enableChangeTracking],
  );

  /**
   * Get current data for conflict resolution.
   */
  const getCurrentData = useCallback(
    (type: SyncEventType, entityId: string): any => {
      switch (type) {
        case 'schema-updated':
        case 'schema-created':
          return currentProject?.schemas.find((s) => s.id === entityId);
        case 'project-loaded':
        case 'project-saved':
          return currentProject;
        default:
          return null;
      }
    },
    [currentProject],
  );

  /**
   * Apply synchronization event to store.
   */
  const applyEvent = useCallback(
    async (event: SyncEvent): Promise<void> => {
      const { type, data } = event;

      switch (type) {
        case 'schema-updated':
          if (currentProject) {
            const updatedSchemas = currentProject.schemas.map((schema) =>
              schema.id === data.id ? { ...schema, ...data } : schema,
            );
            setCurrentProject({
              ...currentProject,
              schemas: updatedSchemas,
            });
          }
          break;

        case 'schema-created':
          if (currentProject) {
            const newSchemas = [...currentProject.schemas, data];
            setCurrentProject({
              ...currentProject,
              schemas: newSchemas,
            });
          }
          break;

        case 'schema-deleted':
          if (currentProject) {
            const filteredSchemas = currentProject.schemas.filter(
              (schema) => schema.id !== data.id,
            );
            setCurrentProject({
              ...currentProject,
              schemas: filteredSchemas,
            });
          }
          break;

        case 'project-loaded':
        case 'project-saved':
          setCurrentProject(data);
          break;

        case 'validation-completed':
          // Update validation status for affected schemas
          if (currentProject && data.results) {
            const updatedSchemas = currentProject.schemas.map((schema) => {
              const result = data.results.find((r: any) => r.schemaId === schema.id);
              return result ? { ...schema, validationStatus: result.status } : schema;
            });
            setCurrentProject({
              ...currentProject,
              schemas: updatedSchemas,
            });
          }
          break;

        case 'analytics-updated':
          // Analytics updates are handled by the analytics store
          break;

        default:
          logger.warn('Unknown sync event type', { type });
      }
    },
    [currentProject, setCurrentProject],
  );

  /**
   * Automatically resolve conflicts based on strategy.
   */
  const resolveConflictAutomatically = useCallback(
    (conflict: SyncConflict): void => {
      switch (conflictResolution) {
        case 'last-write-wins':
          // Use the more recent version
          if (conflict.remoteVersion > conflict.localVersion) {
            applyEvent({
              type: conflict.type,
              timestamp: Date.now(),
              data: conflict.remoteData,
              source: 'conflict-resolution',
              version: conflict.remoteVersion,
            });
          }
          break;

        case 'merge':
          {
            // Attempt to merge the data
            const merged = mergeData(conflict.localData, conflict.remoteData);
            applyEvent({
              type: conflict.type,
              timestamp: Date.now(),
              data: merged,
              source: 'conflict-resolution',
              version: Math.max(conflict.localVersion, conflict.remoteVersion) + 1,
            });
          }
          break;

        case 'reject':
          // Keep local version, ignore remote
          logger.info('Conflict rejected, keeping local version', { conflict });
          break;

        default:
          // Add to conflicts for user resolution
          setConflicts((prev) => [...prev, conflict]);
      }
    },
    [conflictResolution],
  );

  /**
   * Merge conflicting data objects.
   */
  const mergeData = useCallback((local: any, remote: any): any => {
    if (!local || !remote) return remote || local;

    try {
      // Simple merge strategy - prefer remote for primitive values
      // and merge objects recursively
      const merged = { ...local };

      for (const [key, value] of Object.entries(remote)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          merged[key] = mergeData(merged[key], value);
        } else if (value !== undefined) {
          merged[key] = value;
        }
      }

      return merged;
    } catch (error) {
      logger.error('Failed to merge conflict data', error);
      return remote; // Fallback to remote data
    }
  }, []);

  /**
   * Manually resolve conflict.
   */
  const resolveConflict = useCallback(
    (conflictId: string, resolution: 'local' | 'remote' | 'merge'): void => {
      setConflicts((prev) => {
        const conflict = prev.find((c) => c.id === conflictId);
        if (!conflict) return prev;

        let dataToApply: any;
        let version: number;

        switch (resolution) {
          case 'local':
            dataToApply = conflict.localData;
            version = conflict.localVersion;
            break;
          case 'remote':
            dataToApply = conflict.remoteData;
            version = conflict.remoteVersion;
            break;
          case 'merge':
            dataToApply = mergeData(conflict.localData, conflict.remoteData);
            version = Math.max(conflict.localVersion, conflict.remoteVersion) + 1;
            break;
        }

        // Apply the resolution
        applyEvent({
          type: conflict.type,
          timestamp: Date.now(),
          data: dataToApply,
          source: 'manual-resolution',
          version,
        });

        // Remove resolved conflict
        return prev.filter((c) => c.id !== conflictId);
      });
    },
    [mergeData],
  );

  /**
   * Force synchronization.
   */
  const forceSync = useCallback(async (): Promise<void> => {
    if (!isActive) return;

    setSyncStatus('syncing');

    try {
      // Process any pending events
      await processEventQueue();

      // Clear pending changes
      setPendingChanges(new Set());

      setLastSync(new Date());
      setSyncStatus(conflicts.length > 0 ? 'conflict' : 'idle');

      logger.info('Force sync completed');
    } catch (error) {
      logger.error('Force sync failed', error);
      setSyncStatus('error');
    }
  }, [isActive, processEventQueue, conflicts.length]);

  /**
   * Toggle synchronization.
   */
  const toggleSync = useCallback((enabled: boolean): void => {
    setIsActive(enabled);
    if (!enabled) {
      setSyncStatus('idle');
      eventQueue.current = [];
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    }
    logger.info(`Synchronization ${enabled ? 'enabled' : 'disabled'}`);
  }, []);

  /**
   * Clear synchronization history.
   */
  const clearHistory = useCallback((): void => {
    setHistory([]);
    setConflicts([]);
    setPendingChanges(new Set());
    versionCounters.current.clear();
    logger.info('Sync history cleared');
  }, []);

  /**
   * Cleanup on unmount.
   */
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  return {
    isActive,
    hasPendingChanges: pendingChanges.size > 0,
    conflictCount: conflicts.length,
    conflicts,
    history,
    lastSync,
    emitEvent,
    resolveConflict,
    forceSync,
    toggleSync,
    clearHistory,
    syncStatus,
  };
}
