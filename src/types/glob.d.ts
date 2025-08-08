/**
 * Type declarations for the glob module.
 *
 * This file provides TypeScript type definitions for the glob module
 * to resolve import errors.
 *
 * @module glob
 */

declare module 'glob' {
  export interface GlobOptions {
    cwd?: string;
    absolute?: boolean;
    nodir?: boolean;
    ignore?: string | string[];
    [key: string]: unknown;
  }

  export function glob(
    pattern: string,
    options?: GlobOptions,
  ): Promise<string[]>;
  export function globSync(pattern: string, options?: GlobOptions): string[];
}
