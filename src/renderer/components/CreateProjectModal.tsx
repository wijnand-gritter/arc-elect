/**
 * Create project modal component for JSON Schema Editor.
 *
 * This component provides a modal interface for creating new projects
 * with folder selection and project configuration using shadcn/ui Dialog.
 *
 * @module CreateProjectModal
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import logger from '../lib/renderer-logger';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { FolderOpen, Loader2, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { safeHandler } from '@/lib/error-handling';
import type { ProjectConfig } from '../../types/schema-editor';

/**
 * Create project modal props.
 */
interface CreateProjectModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Function to call when modal should close */
  onClose: () => void;
}

/**
 * Create project modal component.
 *
 * This component provides:
 * - Project name input
 * - Folder selection via electron dialog
 * - Project configuration options
 * - Create project functionality
 * - Loading states and error handling
 * - Uses shadcn/ui Dialog for accessibility and consistency
 *
 * @param props - Component props
 * @returns JSX element representing the create project modal
 *
 * @example
 * ```tsx
 * <CreateProjectModal isOpen={true} onClose={() => {}} />
 * ```
 */
export function CreateProjectModal({
  isOpen,
  onClose,
}: CreateProjectModalProps): React.JSX.Element {
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');
  const [isSelecting, setIsSelecting] = useState<boolean>(false);

  const createProject = useAppStore((state) => state.createProject);
  const isLoadingProject = useAppStore((state) => state.isLoadingProject);
  const recentProjects = useAppStore((state) => state.recentProjects);

  /**
   * Handles folder selection via electron dialog.
   */
  const handleSelectFolder = safeHandler(async () => {
    setIsSelecting(true);

    try {
      const result = await window.api.showFolderDialog({
        title: 'Select Project Folder',
        ...(selectedPath && { defaultPath: selectedPath }),
      });

      if (result.success && result.path) {
        setSelectedPath(result.path);

        // Auto-generate project name from folder name if not set
        if (!projectName) {
          const folderName = result.path.split(/[/\\]/).pop() || 'New Project';
          setProjectName(folderName);
        }
      }
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to select folder', { error: errorObj.message, stack: errorObj.stack });
    } finally {
      setIsSelecting(false);
    }
  });

  /**
   * Handles project creation.
   */
  const handleCreateProject = safeHandler(async () => {
    if (!selectedPath || !projectName.trim()) {
      return;
    }

    // Check for path validation errors
    if (pathValidation && !pathValidation.isValid) {
      return;
    }

    const config: ProjectConfig = {
      name: projectName.trim(),
      path: selectedPath,
      schemaPattern: '*.json',
      settings: {
        autoValidate: true,
        watchForChanges: true,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedExtensions: ['.json'],
      },
    };

    await createProject(config);
    handleClose();
  });

  /**
   * Handles closing the modal and resetting form.
   */
  const handleClose = () => {
    setSelectedPath('');
    setProjectName('');
    onClose();
  };

  /**
   * Validates if the selected path already exists in recent projects.
   */
  const pathValidation = useMemo(() => {
    if (!selectedPath) return null;

    const existingProject = recentProjects.find((project) => project.path === selectedPath);
    if (existingProject) {
      return {
        isValid: false,
        message: `A project with this path already exists: "${existingProject.name}"`,
      };
    }

    return { isValid: true };
  }, [selectedPath, recentProjects]);

  const canCreateProject =
    selectedPath && projectName.trim() && !isLoadingProject && pathValidation?.isValid !== false;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Select a folder to create a new project. The application will scan this folder and its
            subdirectories for JSON files and load them as schemas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Project Name Input */}
          <div className="space-y-2">
            <Label htmlFor="modal-project-name">Project Name</Label>
            <Input
              id="modal-project-name"
              placeholder="Enter project name"
              value={projectName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProjectName(e.target.value)}
              disabled={isLoadingProject}
            />
          </div>

          {/* Folder Selection */}
          <div className="space-y-2">
            <Label htmlFor="modal-project-path">Project Folder</Label>
            <div className="flex gap-2">
              <Input
                id="modal-project-path"
                placeholder="Select a folder containing JSON schemas"
                value={selectedPath}
                readOnly
                disabled={isLoadingProject}
              />
              <Button
                variant="outline"
                onClick={handleSelectFolder}
                disabled={isSelecting || isLoadingProject}
                className="shrink-0"
              >
                {isSelecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FolderOpen className="h-4 w-4" />
                )}
                Browse
              </Button>
            </div>
          </div>

          {/* Path Validation Alert */}
          {pathValidation && !pathValidation.isValid && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{pathValidation.message}</AlertDescription>
            </Alert>
          )}

          {/* Help Text */}
          {selectedPath && pathValidation?.isValid !== false && (
            <p className="text-xs text-muted-foreground">
              The application will scan this folder and its subdirectories for JSON files and load
              them as schemas.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoadingProject}>
            Cancel
          </Button>
          <Button onClick={handleCreateProject} disabled={!canCreateProject}>
            {isLoadingProject ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Project'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
