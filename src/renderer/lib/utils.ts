/**
 * Utility functions for the renderer process.
 *
 * This module provides common utility functions used throughout
 * the application, including class name merging and other helpers.
 *
 * @module utils
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names with Tailwind CSS conflict resolution.
 *
 * This function combines multiple class name inputs and resolves
 * Tailwind CSS conflicts by keeping the last conflicting class.
 * It uses clsx for conditional classes and twMerge for conflict resolution.
 *
 * @param inputs - Class names to merge (strings, objects, arrays, etc.)
 * @returns Merged class name string
 *
 * @example
 * ```tsx
 * // Basic usage
 * cn('px-2 py-1', 'px-4') // Returns 'py-1 px-4'
 *
 * // Conditional classes
 * cn('base-class', isActive && 'active-class')
 *
 * // With objects
 * cn('base', { 'conditional': true, 'hidden': false })
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
