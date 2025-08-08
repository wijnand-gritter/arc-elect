/**
 * Custom Sonner toast component with theme integration.
 *
 * This component provides a customized Sonner Toaster with theme
 * integration and consistent styling. It uses the application's
 * color palette and theme system for visual consistency.
 *
 * @module sonner
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import { Toaster as Sonner } from 'sonner';
import { useTheme } from '@/components/ThemeProvider';

/**
 * Props interface for the Toaster component.
 */
interface ToasterProps {
  /** Theme to use for the toaster */
  theme?: 'light' | 'dark' | 'system';
}

/**
 * Custom Toaster component with theme integration.
 *
 * This component wraps the Sonner Toaster with custom styling
 * and theme integration. It provides:
 * - Theme-aware styling
 * - Consistent color palette
 * - Glassmorphism effects
 * - Custom toast styling
 *
 * @param props - Component props
 * @param props.theme - Theme to use for the toaster
 * @returns JSX element representing the toaster
 *
 * @example
 * ```tsx
 * <Toaster theme="dark" />
 * ```
 */
function Toaster({ theme }: ToasterProps): React.JSX.Element {
  const { theme: appTheme } = useTheme();

  return (
    <Sonner
      theme={theme || appTheme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
    />
  );
}

export { Toaster };
