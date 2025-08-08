/**
 * ModeToggle component for theme switching.
 *
 * This component provides a toggle button for switching between
 * light, dark, and system themes. It integrates with the ThemeProvider
 * and provides visual feedback for the current theme state.
 *
 * @module ModeToggle
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from './ThemeProvider';

/**
 * ModeToggle component for theme switching.
 *
 * This component renders a dropdown menu with theme options:
 * - Light theme
 * - Dark theme
 * - System theme (follows OS preference)
 *
 * It provides visual icons and integrates with the ThemeProvider
 * for seamless theme management.
 *
 * @returns JSX element representing the theme toggle
 *
 * @example
 * ```tsx
 * <ModeToggle />
 * ```
 */
export function ModeToggle(): React.JSX.Element {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
