/**
 * Project setup component for JSON Schema Editor.
 *
 * This component provides the interface for opening recent projects
 * and creating new projects via modal.
 *
 * @module ProjectSetup
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderOpen, Plus } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { CreateProjectModal } from './CreateProjectModal';

/**
 * Project setup component for project initialization.
 *
 * This component provides:
 * - Recent projects list
 * - Create new project button (opens modal)
 * - Welcome message
 *
 * @returns JSX element representing the project setup interface
 *
 * @example
 * ```tsx
 * <ProjectSetup />
 * ```
 */
export function ProjectSetup(): React.JSX.Element {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const recentProjects = useAppStore((state) => state.recentProjects);
  const loadProject = useAppStore((state) => state.loadProject);

  /**
   * Handles opening a recent project.
   */
  const handleOpenProject = (projectPath: string) => {
    loadProject(projectPath);
  };

  /**
   * Handles opening the create project modal.
   */
  const handleCreateProject = () => {
    setIsCreateModalOpen(true);
  };

  /**
   * Handles closing the create project modal.
   */
  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
  };

  return (
    <>
      <div className="px-4 lg:px-6 space-y-6">
        {/* Welcome Card */}
        <Card className="glass-blue border-0">
          <CardHeader className="gradient-accent rounded-t-lg border-b border-primary/20">
            <CardTitle className="text-foreground flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse-blue"></div>
              JSON Schema Editor
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Create a new project or open an existing one to start working with JSON schemas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Welcome to the JSON Schema Editor. Create a new project by selecting a folder
                containing JSON schema files, or open one of your recent projects to continue
                working.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Projects Card */}
        <Card className="glass-blue border-0">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>
                Quickly open recently used projects or create a new one
              </CardDescription>
            </div>
            <Button
              onClick={handleCreateProject}
              className="border-gradient hover-lift hover:gradient-accent transition-all duration-200 text-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </CardHeader>
          <CardContent>
            {recentProjects.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FolderOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No projects yet</h3>
                <p className="text-sm mb-4">
                  Create your first project to start working with JSON schemas
                </p>
                <Button
                  onClick={handleCreateProject}
                  className="border-gradient hover-lift hover:gradient-accent transition-all duration-200 text-foreground"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Project
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleOpenProject(project.path)}
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{project.name}</h4>
                      <p className="text-xs text-muted-foreground truncate">{project.path}</p>
                      <p className="text-xs text-muted-foreground">
                        Last opened: {new Date(project.lastModified).toLocaleDateString()}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="shrink-0 ml-2">
                      <FolderOpen className="h-4 w-4 mr-1" />
                      Open
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal isOpen={isCreateModalOpen} onClose={handleCloseModal} />
    </>
  );
}
