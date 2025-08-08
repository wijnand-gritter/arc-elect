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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ModeToggle } from '@/components/ModeToggle';
import { Button } from '@/components/ui/button';
import {
  Settings as SettingsIcon,
  Palette,
  Monitor,
  Keyboard,
  Type,
} from 'lucide-react';

/**
 * Settings page component.
 *
 * This component provides a comprehensive settings interface for the application,
 * including theme configuration, keyboard shortcuts, and other user preferences.
 *
 * @module Settings
 * @author Wijnand Gritter
 * @version 1.0.0
 */
export default function Settings() {
  const fonts = [
    {
      name: 'JetBrains Mono',
      family:
        '"JetBrains Mono", "Fira Code", "Consolas", "Courier New", monospace',
      description:
        'Modern programming font with ligatures and excellent readability',
      sample: 'const example = () => { return "Hello World"; }',
    },
    {
      name: 'Fira Code',
      family:
        '"Fira Code", "JetBrains Mono", "Consolas", "Courier New", monospace',
      description:
        'Free programming font with ligatures and good character distinction',
      sample: 'const example = () => { return "Hello World"; }',
    },
    {
      name: 'Source Code Pro',
      family:
        '"Source Code Pro", "JetBrains Mono", "Consolas", "Courier New", monospace',
      description:
        "Adobe's open-source monospace font with excellent legibility",
      sample: 'const example = () => { return "Hello World"; }',
    },
    {
      name: 'Roboto Mono',
      family:
        '"Roboto Mono", "JetBrains Mono", "Consolas", "Courier New", monospace',
      description: "Google's monospace font with clean, modern design",
      sample: 'const example = () => { return "Hello World"; }',
    },
    {
      name: 'IBM Plex Mono',
      family:
        '"IBM Plex Mono", "JetBrains Mono", "Consolas", "Courier New", monospace',
      description:
        "IBM's open-source monospace font with excellent readability",
      sample: 'const example = () => { return "Hello World"; }',
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Configure your application preferences and appearance.
          </p>
        </div>
        <ModeToggle />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Theme
            </CardTitle>
            <CardDescription>
              Customize the appearance of the application.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-sm text-muted-foreground">
                  Switch between light and dark themes.
                </p>
              </div>
              <ModeToggle />
            </div>
          </CardContent>
        </Card>

        {/* Display Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Display
            </CardTitle>
            <CardDescription>
              Configure display and interface settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Font Size</p>
                <p className="text-sm text-muted-foreground">
                  Adjust the size of text in the editor.
                </p>
              </div>
              <Badge variant="secondary">14px</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Line Height</p>
                <p className="text-sm text-muted-foreground">
                  Control the spacing between lines.
                </p>
              </div>
              <Badge variant="secondary">1.5</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Keyboard Shortcuts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </CardTitle>
            <CardDescription>
              View and customize keyboard shortcuts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Save File</span>
                <Badge variant="outline">Cmd + S</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Format Document</span>
                <Badge variant="outline">Shift + Alt + F</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Find</span>
                <Badge variant="outline">Cmd + F</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Navigate to Reference</span>
                <Badge variant="outline">Cmd + F12</Badge>
              </div>
            </div>
            <Button variant="outline" className="w-full">
              Customize Shortcuts
            </Button>
          </CardContent>
        </Card>

        {/* Editor Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Editor
            </CardTitle>
            <CardDescription>
              Configure editor behavior and features.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Word Wrap</span>
                <Badge variant="secondary">Enabled</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Minimap</span>
                <Badge variant="secondary">Enabled</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Line Numbers</span>
                <Badge variant="secondary">Enabled</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Bracket Pair Colorization</span>
                <Badge variant="secondary">Enabled</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Font Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Font Comparison
          </CardTitle>
          <CardDescription>
            Compare different programming fonts. All fonts shown are free and
            open-source.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {fonts.map((font, index) => (
              <div key={font.name} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{font.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {font.description}
                    </p>
                  </div>
                  <Badge variant="outline">Free & Open Source</Badge>
                </div>
                <div
                  className="p-4 bg-muted rounded-lg border"
                  style={{ fontFamily: font.family }}
                >
                  <div className="text-sm text-muted-foreground mb-2">
                    Sample Code:
                  </div>
                  <div className="text-sm leading-relaxed">{font.sample}</div>
                  <div className="text-sm text-muted-foreground mt-2">
                    <span className="font-mono">0123456789</span> •
                    <span className="font-mono">
                      ABCDEFGHIJKLMNOPQRSTUVWXYZ
                    </span>{' '}
                    •
                    <span className="font-mono">
                      abcdefghijklmnopqrstuvwxyz
                    </span>
                  </div>
                </div>
                {index < fonts.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
