/**
 * Custom hook for detecting mobile devices.
 *
 * This hook provides mobile device detection functionality using
 * window matchMedia API. It detects mobile devices based on screen
 * width and provides responsive behavior for the application.
 *
 * @module use-mobile
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import { useState, useEffect } from 'react';

/**
 * Custom hook for detecting mobile devices.
 *
 * This hook monitors the screen width and determines if the current
 * device is mobile based on a breakpoint of 768px. It provides
 * real-time updates when the screen size changes.
 *
 * @returns Boolean indicating if the current device is mobile
 *
 * @example
 * ```tsx
 * const isMobile = useMobile();
 *
 * if (isMobile) {
 *   return <MobileLayout />;
 * } else {
 *   return <DesktopLayout />;
 * }
 * ```
 */
export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    /**
     * Checks if the current screen width indicates a mobile device.
     *
     * @returns Boolean indicating if the device is mobile
     */
    const checkMobile = (): boolean => {
      return window.innerWidth < 768;
    };

    // Set initial value
    setIsMobile(checkMobile());

    /**
     * Handles window resize events to update mobile detection.
     */
    const handleResize = (): void => {
      setIsMobile(checkMobile());
    };

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup event listener
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return isMobile;
}
