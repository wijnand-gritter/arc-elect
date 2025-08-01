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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/ModeToggle';
import { MonaspaceDemo } from '@/components/ui/monaspace-demo';
import { toast } from 'sonner';
import { Palette, Database, Download, Upload, Trash2, Type } from 'lucide-react';

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
    <div className="h-full flex flex-col space-y-4">
      {/* Theme Settings Card */}
      <Card className="glass-blue border-0 flex-1">
        <CardHeader className="gradient-accent rounded-t-lg border-b border-primary/20 py-4">
          <CardTitle className="text-foreground flex items-center gap-2 text-lg">
            <Palette className="w-4 h-4" />
            Theme Settings
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm">
            Customize the appearance of your application
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Choose your preferred theme to customize the application's appearance. The theme
              setting will be saved and applied automatically.
            </p>
            <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <div>
                  <h4 className="font-medium text-sm">Application Theme</h4>
                  <p className="text-xs text-muted-foreground">
                    Switch between light, dark, or system theme
                  </p>
                </div>
              </div>
              <div className="neumorphism rounded-lg p-2">
                <ModeToggle />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Font Settings Card */}
      <Card className="glass-blue border-0">
        <CardHeader className="gradient-accent rounded-t-lg border-b border-primary/20 py-4">
          <CardTitle className="text-foreground flex items-center gap-2 text-lg">
            <Type className="w-4 h-4" />
            Font Settings
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm">
            Customize the monospace font used in code editors
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              The application uses Monaspace fonts for code display. These fonts are designed
              specifically for developers with features like ligatures and texture healing.
            </p>
            <MonaspaceDemo />
          </div>
        </CardContent>
      </Card>

      {/* Data Management Card */}
      <Card className="glass-blue border-0">
        <CardHeader className="gradient-accent rounded-t-lg border-b border-primary/20 py-4">
          <CardTitle className="text-foreground flex items-center gap-2 text-lg">
            <Database className="w-4 h-4" />
            Data Management
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm">
            Manage your application data and settings
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Export your settings for backup, import settings from another installation, or clear
              all data to start fresh.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                variant="outline"
                onClick={handleExport}
                className="border-gradient hover-lift hover:gradient-accent transition-all duration-200 h-auto p-4 flex flex-col items-center gap-2"
              >
                <Download className="w-5 h-5" />
                <div className="text-center">
                  <div className="font-medium text-sm">Export Settings</div>
                  <div className="text-xs text-muted-foreground">Backup your configuration</div>
                </div>
              </Button>
              <Button
                variant="outline"
                onClick={handleImport}
                className="border-gradient hover-lift hover:gradient-accent transition-all duration-200 h-auto p-4 flex flex-col items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                <div className="text-center">
                  <div className="font-medium text-sm">Import Settings</div>
                  <div className="text-xs text-muted-foreground">Restore from backup</div>
                </div>
              </Button>
              <Button
                variant="outline"
                onClick={handleClear}
                className="border-gradient hover-lift hover:gradient-accent transition-all duration-200 h-auto p-4 flex flex-col items-center gap-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-5 h-5" />
                <div className="text-center">
                  <div className="font-medium text-sm">Clear All Data</div>
                  <div className="text-xs text-muted-foreground">Start fresh</div>
                </div>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
