/**
 * Type declarations for the chokidar module.
 *
 * This file provides TypeScript type definitions for the chokidar module
 * to resolve import errors.
 *
 * @module chokidar
 */

declare module 'chokidar' {
  import { EventEmitter } from 'events';

  export interface WatchOptions {
    ignored?: string | RegExp | Array<string | RegExp>;
    persistent?: boolean;
    [key: string]: unknown;
  }

  export class FSWatcher extends EventEmitter {
    constructor(options?: WatchOptions);
    add(paths: string | string[]): FSWatcher;
    unwatch(paths: string | string[]): FSWatcher;
    close(): Promise<void>;
  }

  export function watch(
    paths: string | string[],
    options?: WatchOptions,
  ): FSWatcher;
}
