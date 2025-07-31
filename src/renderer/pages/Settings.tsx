/**
 * Settings page component with configuration options.
 *
 * This component provides a settings interface for the application,
 * including theme settings, data management, and configuration options.
 * It includes IPC communication for settings persistence.
 *
 * @module Settings
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ModeToggle } from '@/components/ModeToggle';
import { toast } from 'sonner';

/**
 * Settings page component for application configuration.
 *
 * This component renders the settings page with:
 * - Theme settings and mode toggle
 * - Data management options (clear, export, import)
 * - IPC communication for settings persistence
 * - Toast notifications for user feedback
 *
 * @returns JSX element representing the settings page
 *
 * @example
 * ```tsx
 * <Settings />
 * ```
 */
export function Settings(): React.JSX.Element {
  /**
   * Handles clearing all application settings and data.
   *
   * This function calls the main process to clear all stored settings
   * and shows a success or error notification to the user.
   */
  const handleClear = async (): Promise<void> => {
    try {
      await window.api.clearSettings();
      toast.success('Settings cleared successfully');
    } catch (_error) {
      toast.error('Failed to clear settings');
    }
  };

  /**
   * Handles exporting application settings to a JSON file.
   *
   * This function calls the main process to export all settings
   * and shows a success or error notification to the user.
   */
  const handleExport = async (): Promise<void> => {
    try {
      const result = await window.api.exportSettings();
      if (result.success) {
        toast.success('Settings exported successfully');
      } else {
        toast.error('Failed to export settings');
      }
    } catch (_error) {
      toast.error('Failed to export settings');
    }
  };

  /**
   * Handles importing application settings from a JSON file.
   *
   * This function creates a file input dialog, reads the selected file,
   * and calls the main process to import the settings. It shows
   * success or error notifications to the user.
   */
  const handleImport = async (): Promise<void> => {
    try {
      // Create a file input for import
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const text = await file.text();
          const result = await window.api.importSettings(text);
          if (result.success) {
            toast.success('Settings imported successfully');
          } else {
            toast.error('Failed to import settings');
          }
        }
      };
      input.click();
    } catch (_error) {
      toast.error('Failed to import settings');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Card className="glass-blue border-0 flex-1">
        <CardContent className="p-4">
          {/* Theme Settings Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Theme Settings</h3>
              <p className="text-sm text-muted-foreground">
                Customize the appearance of your application
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <label htmlFor="theme" className="text-sm font-medium text-foreground">
                Theme:
              </label>
              <div className="neumorphism rounded-lg p-2">
                <ModeToggle />
              </div>
            </div>
          </div>

          <Separator className="border-primary/20" />

          {/* Data Management Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                Data Management
              </h3>
              <p className="text-sm text-muted-foreground">
                Manage your application data and settings
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={handleClear}
                className="border-gradient hover-lift hover:gradient-accent transition-all duration-200"
              >
                Clear All Data
              </Button>
              <Button
                variant="outline"
                onClick={handleExport}
                className="border-gradient hover-lift hover:gradient-accent transition-all duration-200"
              >
                Export Settings
              </Button>
              <Button
                variant="outline"
                onClick={handleImport}
                className="border-gradient hover-lift hover:gradient-accent transition-all duration-200"
              >
                Import Settings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
