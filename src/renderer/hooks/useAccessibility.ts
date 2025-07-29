/**
 * Accessibility improvements hook for JSON Schema Editor.
 *
 * This hook provides comprehensive accessibility enhancements including
 * focus management, ARIA attributes, keyboard navigation, and screen reader support.
 *
 * @module useAccessibility
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import logger from '../lib/renderer-logger';

/**
 * Focus trap options.
 */
interface FocusTrapOptions {
  /** Enable focus trapping */
  enabled?: boolean;
  /** Return focus to trigger element on disable */
  returnFocus?: boolean;
  /** Allow escape key to disable trap */
  allowEscape?: boolean;
}

/**
 * Accessibility options.
 */
interface AccessibilityOptions {
  /** Enable enhanced focus management */
  enableFocusManagement?: boolean;
  /** Enable screen reader announcements */
  enableScreenReaderSupport?: boolean;
  /** Enable high contrast mode detection */
  enableHighContrastSupport?: boolean;
  /** Enable reduced motion detection */
  enableReducedMotionSupport?: boolean;
  /** Enable keyboard navigation enhancements */
  enableKeyboardNavigation?: boolean;
  /** Enable focus indicators */
  enableFocusIndicators?: boolean;
}

/**
 * Accessibility state.
 */
interface AccessibilityState {
  /** Whether user prefers reduced motion */
  prefersReducedMotion: boolean;
  /** Whether user prefers high contrast */
  prefersHighContrast: boolean;
  /** Whether user is using keyboard navigation */
  isUsingKeyboard: boolean;
  /** Current focus trap state */
  focusTrap: {
    active: boolean;
    element: HTMLElement | null;
  };
}

/**
 * Accessibility result.
 */
interface AccessibilityResult extends AccessibilityState {
  /** Function to announce message to screen readers */
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  /** Function to create focus trap */
  createFocusTrap: (element: HTMLElement, options?: FocusTrapOptions) => () => void;
  /** Function to manage focus */
  manageFocus: (element: HTMLElement | null) => void;
  /** Function to add skip links */
  addSkipLink: (target: string, label: string) => void;
  /** Function to enhance element accessibility */
  enhanceElement: (element: HTMLElement, options: {
    role?: string;
    label?: string;
    description?: string;
    controls?: string;
    expanded?: boolean;
    selected?: boolean;
  }) => void;
  /** Function to create roving tabindex */
  createRovingTabindex: (container: HTMLElement, items: string) => () => void;
}

/**
 * Hook for accessibility functionality.
 *
 * Provides comprehensive accessibility enhancements for better
 * usability with assistive technologies.
 *
 * @param options - Accessibility configuration
 * @returns Accessibility utilities and state
 *
 * @example
 * ```tsx
 * const {
 *   announce,
 *   createFocusTrap,
 *   manageFocus,
 *   prefersReducedMotion,
 *   isUsingKeyboard
 * } = useAccessibility({
 *   enableScreenReaderSupport: true,
 *   enableFocusManagement: true,
 *   enableKeyboardNavigation: true
 * });
 * 
 * // Announce loading state
 * announce('Loading schemas, please wait');
 * 
 * // Create focus trap for modal
 * useEffect(() => {
 *   if (isModalOpen && modalRef.current) {
 *     return createFocusTrap(modalRef.current);
 *   }
 * }, [isModalOpen]);
 * ```
 */
export function useAccessibility(
  options: AccessibilityOptions = {},
): AccessibilityResult {
  const {
    enableFocusManagement = true,
    enableScreenReaderSupport = true,
    enableHighContrastSupport = true,
    enableReducedMotionSupport = true,
    enableKeyboardNavigation = true,
    enableFocusIndicators = true,
  } = options;

  const [state, setState] = useState<AccessibilityState>({
    prefersReducedMotion: false,
    prefersHighContrast: false,
    isUsingKeyboard: false,
    focusTrap: {
      active: false,
      element: null,
    },
  });

  const lastFocusRef = useRef<HTMLElement | null>(null);
  const keyboardTimeoutRef = useRef<NodeJS.Timeout>();

  /**
   * Create or get announcement element for screen readers.
   */
  const getAnnounceElement = useCallback((priority: 'polite' | 'assertive' = 'polite'): HTMLElement => {
    const id = `sr-announce-${priority}`;
    let element = document.getElementById(id);
    
    if (!element) {
      element = document.createElement('div');
      element.id = id;
      element.setAttribute('aria-live', priority);
      element.setAttribute('aria-atomic', 'true');
      element.className = 'sr-only';
      element.style.cssText = `
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      `;
      document.body.appendChild(element);
    }
    
    return element;
  }, []);

  /**
   * Announce message to screen readers.
   */
  const announce = useCallback((
    message: string,
    priority: 'polite' | 'assertive' = 'polite'
  ): void => {
    if (!enableScreenReaderSupport) return;

    const element = getAnnounceElement(priority);
    
    // Clear existing content
    element.textContent = '';
    
    // Set new message after a brief delay to ensure screen readers notice the change
    setTimeout(() => {
      element.textContent = message;
      logger.debug('Screen reader announcement', { message, priority });
    }, 100);
  }, [enableScreenReaderSupport, getAnnounceElement]);

  /**
   * Create focus trap within an element.
   */
  const createFocusTrap = useCallback((
    element: HTMLElement,
    options: FocusTrapOptions = {}
  ): (() => void) => {
    if (!enableFocusManagement) return () => {};

    const {
      enabled = true,
      returnFocus = true,
      allowEscape = true,
    } = options;

    if (!enabled) return () => {};

    // Store the element that was focused before trapping
    const previousFocus = document.activeElement as HTMLElement;
    
    // Get all focusable elements within the trap
    const getFocusableElements = (): HTMLElement[] => {
      const selectors = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]',
      ].join(', ');
      
      return Array.from(element.querySelectorAll(selectors)) as HTMLElement[];
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!allowEscape && event.key === 'Escape') {
        event.preventDefault();
        return;
      }

      if (event.key === 'Tab') {
        const focusableElements = getFocusableElements();
        
        if (focusableElements.length === 0) {
          event.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          // Shift + Tab (backward)
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab (forward)
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    // Add event listener
    element.addEventListener('keydown', handleKeyDown);

    // Focus first focusable element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Update state
    setState(prev => ({
      ...prev,
      focusTrap: {
        active: true,
        element,
      },
    }));

    logger.debug('Focus trap created', { element: element.tagName });

    // Return cleanup function
    return () => {
      element.removeEventListener('keydown', handleKeyDown);
      
      // Return focus to previous element
      if (returnFocus && previousFocus) {
        previousFocus.focus();
      }

      // Update state
      setState(prev => ({
        ...prev,
        focusTrap: {
          active: false,
          element: null,
        },
      }));

      logger.debug('Focus trap destroyed');
    };
  }, [enableFocusManagement]);

  /**
   * Manage focus programmatically.
   */
  const manageFocus = useCallback((element: HTMLElement | null): void => {
    if (!enableFocusManagement || !element) return;

    // Store last focused element
    lastFocusRef.current = element;

    // Focus the element
    element.focus();

    // Scroll into view if needed
    element.scrollIntoView({
      behavior: state.prefersReducedMotion ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });

    logger.debug('Focus managed', { element: element.tagName });
  }, [enableFocusManagement, state.prefersReducedMotion]);

  /**
   * Add skip link to page.
   */
  const addSkipLink = useCallback((target: string, label: string): void => {
    const existingLink = document.getElementById(`skip-${target}`);
    if (existingLink) return;

    const skipLink = document.createElement('a');
    skipLink.id = `skip-${target}`;
    skipLink.href = `#${target}`;
    skipLink.className = 'skip-link';
    skipLink.textContent = label;
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: var(--background);
      color: var(--foreground);
      padding: 8px;
      text-decoration: none;
      border-radius: 4px;
      border: 2px solid var(--border);
      z-index: 1000;
      transition: top 0.3s;
    `;

    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '6px';
    });

    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px';
    });

    document.body.insertBefore(skipLink, document.body.firstChild);
    logger.debug('Skip link added', { target, label });
  }, []);

  /**
   * Enhance element with accessibility attributes.
   */
  const enhanceElement = useCallback((
    element: HTMLElement,
    options: {
      role?: string;
      label?: string;
      description?: string;
      controls?: string;
      expanded?: boolean;
      selected?: boolean;
    }
  ): void => {
    const { role, label, description, controls, expanded, selected } = options;

    if (role) {
      element.setAttribute('role', role);
    }

    if (label) {
      element.setAttribute('aria-label', label);
    }

    if (description) {
      const descId = `desc-${Math.random().toString(36).substr(2, 9)}`;
      element.setAttribute('aria-describedby', descId);
      
      let descElement = document.getElementById(descId);
      if (!descElement) {
        descElement = document.createElement('div');
        descElement.id = descId;
        descElement.className = 'sr-only';
        descElement.textContent = description;
        element.appendChild(descElement);
      }
    }

    if (controls) {
      element.setAttribute('aria-controls', controls);
    }

    if (expanded !== undefined) {
      element.setAttribute('aria-expanded', String(expanded));
    }

    if (selected !== undefined) {
      element.setAttribute('aria-selected', String(selected));
    }

    logger.debug('Element accessibility enhanced', { element: element.tagName, options });
  }, []);

  /**
   * Create roving tabindex for widget navigation.
   */
  const createRovingTabindex = useCallback((
    container: HTMLElement,
    itemSelector: string
  ): (() => void) => {
    if (!enableKeyboardNavigation) return () => {};

    let currentIndex = 0;

    const updateTabindexes = () => {
      const items = container.querySelectorAll(itemSelector) as NodeListOf<HTMLElement>;
      items.forEach((item, index) => {
        item.tabIndex = index === currentIndex ? 0 : -1;
      });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const items = container.querySelectorAll(itemSelector) as NodeListOf<HTMLElement>;
      
      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          event.preventDefault();
          currentIndex = (currentIndex + 1) % items.length;
          updateTabindexes();
          items[currentIndex].focus();
          break;

        case 'ArrowUp':
        case 'ArrowLeft':
          event.preventDefault();
          currentIndex = (currentIndex - 1 + items.length) % items.length;
          updateTabindexes();
          items[currentIndex].focus();
          break;

        case 'Home':
          event.preventDefault();
          currentIndex = 0;
          updateTabindexes();
          items[currentIndex].focus();
          break;

        case 'End':
          event.preventDefault();
          currentIndex = items.length - 1;
          updateTabindexes();
          items[currentIndex].focus();
          break;
      }
    };

    // Initial setup
    updateTabindexes();
    container.addEventListener('keydown', handleKeyDown);

    logger.debug('Roving tabindex created', { container: container.tagName, itemSelector });

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [enableKeyboardNavigation]);

  /**
   * Detect user preferences and input methods.
   */
  useEffect(() => {
    // Detect reduced motion preference
    if (enableReducedMotionSupport) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setState(prev => ({ ...prev, prefersReducedMotion: mediaQuery.matches }));
      
      const handleChange = (e: MediaQueryListEvent) => {
        setState(prev => ({ ...prev, prefersReducedMotion: e.matches }));
      };
      
      mediaQuery.addEventListener('change', handleChange);
      
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [enableReducedMotionSupport]);

  /**
   * Detect high contrast preference.
   */
  useEffect(() => {
    if (enableHighContrastSupport) {
      const mediaQuery = window.matchMedia('(prefers-contrast: high)');
      setState(prev => ({ ...prev, prefersHighContrast: mediaQuery.matches }));
      
      const handleChange = (e: MediaQueryListEvent) => {
        setState(prev => ({ ...prev, prefersHighContrast: e.matches }));
      };
      
      mediaQuery.addEventListener('change', handleChange);
      
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [enableHighContrastSupport]);

  /**
   * Detect keyboard usage.
   */
  useEffect(() => {
    if (enableKeyboardNavigation) {
      const handleKeyDown = () => {
        setState(prev => ({ ...prev, isUsingKeyboard: true }));
        
        // Clear timeout if it exists
        if (keyboardTimeoutRef.current) {
          clearTimeout(keyboardTimeoutRef.current);
        }
        
        // Set timeout to detect when user stops using keyboard
        keyboardTimeoutRef.current = setTimeout(() => {
          setState(prev => ({ ...prev, isUsingKeyboard: false }));
        }, 3000);
      };

      const handleMouseDown = () => {
        setState(prev => ({ ...prev, isUsingKeyboard: false }));
      };

      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleMouseDown);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('mousedown', handleMouseDown);
        if (keyboardTimeoutRef.current) {
          clearTimeout(keyboardTimeoutRef.current);
        }
      };
    }
  }, [enableKeyboardNavigation]);

  /**
   * Add focus indicators styling.
   */
  useEffect(() => {
    if (enableFocusIndicators) {
      const style = document.createElement('style');
      style.textContent = `
        .focus-visible:focus,
        [data-focus-visible]:focus {
          outline: 2px solid hsl(var(--primary));
          outline-offset: 2px;
        }
        
        .skip-link:focus {
          outline: 2px solid hsl(var(--primary));
          outline-offset: 2px;
        }
      `;
      document.head.appendChild(style);

      return () => {
        document.head.removeChild(style);
      };
    }
  }, [enableFocusIndicators]);

  return {
    ...state,
    announce,
    createFocusTrap,
    manageFocus,
    addSkipLink,
    enhanceElement,
    createRovingTabindex,
  };
}
