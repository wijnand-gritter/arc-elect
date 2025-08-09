/**
 * Project overview component for JSON Schema Editor.
 *
 * This component displays information about the currently loaded project.
 * When no project is provided, it shows the setup view.
 *
 * @module ProjectOverview
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
} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { useAppStore } from '../../stores/useAppStore';
import { CreateProjectModal } from '../CreateProjectModal';
import { RamlImportModal } from '../RamlImportModal';
import { ConversionReportModal } from '../report/ConversionReportModal';
import { FolderOpen, Plus, XCircle, Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';

import type { Project, ProjectConfig } from '../../../types/schema-editor';
import type {
  ImportResult,
  RamlImportConfig,
} from '../../../types/raml-import';

/**
 * Project overview component props.
 */
interface ProjectOverviewProps {
  /** The project to display (optional - if not provided, shows setup view) */
  project?: Project | null;
}

/**
 * Project overview component.
 *
 * This component displays:
 * - Setup view when no project is loaded (welcome card, recent projects)
 * - Project overview when project is loaded (project header, status, recent projects)
 * - Shared functionality for creating and deleting projects
 *
 * @param props - Component props
 * @returns JSX element representing the project overview or setup view
 *
 * @example
 * ```tsx
 * <ProjectOverview /> // Shows setup view
 * <ProjectOverview project={currentProject} /> // Shows project overview
 * ```
 */
export function ProjectOverview({
  project,
}: ProjectOverviewProps): React.JSX.Element {
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isRamlImportOpen, setIsRamlImportOpen] = React.useState(false);
  const [isReportOpen, setIsReportOpen] = React.useState(false);
  const [reportSummaryState, setReportSummaryState] = React.useState<
    import('../../../types/raml-import').ConversionSummary | undefined
  >(undefined);
  const [reportItemsState, setReportItemsState] = React.useState<
    import('../../../types/raml-import').ConversionReport[] | undefined
  >(undefined);
  const [projectToDelete, setProjectToDelete] = React.useState<{
    id: string;
    name: string;
  } | null>(null);

  const recentProjects = useAppStore((state) => state.recentProjects);
  const loadProject = useAppStore((state) => state.loadProject);
  const deleteProject = useAppStore((state) => state.deleteProject);
  const forceClearProject = useAppStore((state) => state.forceClearProject);
  const createProject = useAppStore((state) => state.createProject);

  /**
   * Handles opening a recent project.
   */
  const handleOpenProject = (projectPath: string) => {
    loadProject(projectPath);
  };

  const handleViewReport = async (projectPath: string) => {
    try {
      const exists = await window.api.reportExists(projectPath);
      if (!exists.success || !exists.exists) {
        toast.info('No conversion report available for this project');
        return;
      }
      const rep = await window.api.getReport(projectPath);
      if (!rep.success || !rep.data) {
        toast.error('Failed to load conversion report');
        return;
      }
      setReportSummaryState(rep.data.summary);
      setReportItemsState(rep.data.reports);
      setIsReportOpen(true);
    } catch (error) {
      toast.error('Failed to load conversion report', {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  /**
   * Handles opening the create project modal.
   */
  const handleCreateProject = () => {
    setIsCreateModalOpen(true);
  };

  /**
   * Handles opening the delete confirmation dialog.
   */
  const handleDeleteClick = (
    projectId: string,
    projectName: string,
    event: React.MouseEvent,
  ) => {
    event.stopPropagation(); // Prevent opening the project when clicking delete
    setProjectToDelete({ id: projectId, name: projectName });
  };

  /**
   * Handles confirming project deletion.
   */
  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;

    try {
      await deleteProject(projectToDelete.id);
      toast.success('Project deleted', {
        description: `${projectToDelete.name} has been removed from recent projects`,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      toast.error('Failed to delete project', { description: errorMessage });
    } finally {
      setProjectToDelete(null);
    }
  };

  /**
   * Handles canceling project deletion.
   */
  const handleCancelDelete = () => {
    setProjectToDelete(null);
  };

  const handleRamlImport = () => {
    setIsRamlImportOpen(true);
  };

  const handleRamlImportConfig = async (
    config: RamlImportConfig,
    projectName?: string,
  ): Promise<ImportResult> => {
    try {
      // Use the RAML batch conversion API
      const result = await window.api.convertRamlBatch({
        sourceDirectory: config.sourcePath,
        destinationDirectory: config.destinationPath,
        options: config.transformationOptions,
      });

      if (result.success) {
        // If a project name is provided, create a new project from the destination directory
        if (projectName && projectName.trim()) {
          try {
            const projectConfig: ProjectConfig = {
              name: projectName.trim(),
              path: config.destinationPath,
              schemaPattern: '*.json',
              settings: {
                autoValidate: true,
                watchForChanges: true,
                maxFileSize: 10 * 1024 * 1024, // 10MB
                allowedExtensions: ['.json'],
              },
            };

            await createProject(projectConfig);
            toast.success(`Project "${projectName}" created successfully!`);
          } catch (projectError) {
            console.error(
              'Failed to create project after RAML import:',
              projectError,
            );
            // Don't fail the import if project creation fails
          }
        }

        // Fallback-synthesize a ConversionSummary when detailed summary is missing
        const fallbackSummary = result.summaryDetailed
          ? result.summaryDetailed
          : {
              filesProcessed: result.summary.total,
              enumsCreated: 0,
              businessObjectsCreated: result.summary.successful,
              unionsCount: 0,
              inlineEnumsExtracted: 0,
              dedupedEnums: 0,
              warningsCount: result.summary.warnings,
              errorsCount: result.summary.failed,
              durationMs: 0,
              outputDirectory: config.destinationPath,
            };

        return {
          success: true,
          processedFiles: result.summary.total,
          convertedFiles: result.summary.successful,
          failedFiles: result.summary.failed,
          errors: result.results
            .filter((r: any) => !r.success)
            .map((r: any) => ({
              filePath: r.inputFile || 'unknown',
              message: r.error || 'Conversion failed',
              type: 'conversion' as const,
            })),
          warnings: [],
          duration: 0,
          timestamp: new Date(),
          // Thread through summary/reports for modal display
          summary: fallbackSummary,
          reports: result.reports || [],
        };
      } else {
        return {
          success: false,
          processedFiles: 0,
          convertedFiles: 0,
          failedFiles: 0,
          errors: [
            {
              filePath: 'unknown',
              message: result.error || 'Unknown error',
              type: 'filesystem' as const,
            },
          ],
          warnings: [],
          duration: 0,
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        success: false,
        processedFiles: 0,
        convertedFiles: 0,
        failedFiles: 0,
        errors: [
          {
            filePath: 'unknown',
            message: error instanceof Error ? error.message : 'Unknown error',
            type: 'filesystem' as const,
          },
        ],
        warnings: [],
        duration: 0,
        timestamp: new Date(),
      };
    }
  };

  // If no project is provided, show setup view
  if (!project) {
    return (
      <>
        <div className="h-full flex flex-col space-y-4">
          {/* Welcome Card */}
          <Card className="glass-blue border-0 flex-1">
            <CardHeader className="gradient-accent rounded-t-lg border-b border-primary/20 py-4">
              <CardTitle className="text-foreground flex items-center gap-2 text-lg">
                <FolderOpen className="w-4 h-4" />
                Welcome to Arc Elect
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm">
                Create your first project to get started with JSON schema
                management
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Welcome to the JSON Schema Editor. Create a new project by
                  selecting a folder containing JSON schema files, or open one
                  of your recent projects to continue working.
                </p>
                <div className="flex justify-center gap-3">
                  <Button
                    onClick={handleCreateProject}
                    className="border-gradient hover-lift hover:gradient-accent transition-all duration-200 text-foreground"
                    size="lg"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Project
                  </Button>
                  <Button
                    onClick={handleRamlImport}
                    variant="outline"
                    size="lg"
                    className="border-gradient hover-lift transition-all duration-200"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import RAML
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Projects Card */}
          <Card className="glass-blue border-0">
            <CardHeader>
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>
                Quickly open recently used projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentProjects.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No projects yet</h3>
                  <p className="text-sm">
                    Create your first project to start working with JSON schemas
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentProjects.map((recentProject) => (
                    <div
                      key={recentProject.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-all duration-200 cursor-pointer hover-lift"
                      onClick={() => handleOpenProject(recentProject.path)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FolderOpen className="w-4 h-4 text-primary" />
                          <h4 className="font-medium text-sm truncate">
                            {recentProject.name}
                          </h4>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {recentProject.path}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        <div className="text-right text-xs text-muted-foreground">
                          <p>
                            Last opened:{' '}
                            {new Date(
                              recentProject.lastModified,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="hover-lift"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenProject(recentProject.path);
                          }}
                        >
                          <FolderOpen className="h-4 w-4 mr-1" />
                          Open
                        </Button>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover-lift"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewReport(recentProject.path);
                                }}
                                disabled={false}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View conversion report</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover-lift"
                              onClick={(e) =>
                                handleDeleteClick(
                                  recentProject.id,
                                  recentProject.name,
                                  e,
                                )
                              }
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete project from recent list</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Create Project Modal */}
        <CreateProjectModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />

        <RamlImportModal
          isOpen={isRamlImportOpen}
          onClose={() => setIsRamlImportOpen(false)}
          onImport={handleRamlImportConfig}
        />

        {/* Delete Confirmation Dialog */}
        {projectToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background border border-border rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-2">Delete Project</h3>
              <p className="text-muted-foreground mb-4">
                Are you sure you want to remove "{projectToDelete.name}" from
                your recent projects? This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleCancelDelete}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleConfirmDelete}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Show project overview when project is provided
  return (
    <>
      <div className="h-full flex flex-col space-y-4">
        {/* Project Status Card */}
        <Card className="glass-blue border-0">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                {project.name}
              </CardTitle>
              <CardDescription>
                Last updated:{' '}
                {project.status.lastScanTime
                  ? new Date(project.status.lastScanTime).toLocaleString()
                  : 'Never'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleRamlImport}
                variant="outline"
                size="sm"
                className="border-gradient hover-lift"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import RAML
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="text-2xl font-bold text-primary">
                  {project.status.totalSchemas}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Schemas
                </div>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                <div className="text-2xl font-bold text-green-600">
                  {project.status.validSchemas}
                </div>
                <div className="text-sm text-muted-foreground">Valid</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                <div className="text-2xl font-bold text-red-600">
                  {project.status.invalidSchemas}
                </div>
                <div className="text-sm text-muted-foreground">Invalid</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Projects Card */}
        <Card className="glass-blue border-0">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>
                Quickly switch between recently opened projects
              </CardDescription>
            </div>
            <Button
              onClick={handleCreateProject}
              variant="outline"
              size="sm"
              className="border-gradient hover-lift"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </CardHeader>
          <CardContent>
            {recentProjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent projects</p>
                <p className="text-xs">
                  Create your first project to get started
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentProjects.slice(0, 5).map((recentProject) => (
                  <div
                    key={recentProject.id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-200 cursor-pointer hover-lift ${
                      recentProject.id === project.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border/50 hover:bg-muted/50'
                    }`}
                    onClick={() => handleOpenProject(recentProject.path)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FolderOpen className="w-4 h-4 text-primary" />
                        <h4 className="font-medium text-sm truncate">
                          {recentProject.name}
                        </h4>
                        {recentProject.id === project.id && (
                          <Badge variant="default" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {recentProject.path}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last opened:{' '}
                        {new Date(
                          recentProject.lastModified,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover-lift"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewReport(recentProject.path);
                              }}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View conversion report</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover-lift"
                            onClick={(e) =>
                              handleDeleteClick(
                                recentProject.id,
                                recentProject.name,
                                e,
                              )
                            }
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete project from recent list</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <RamlImportModal
        isOpen={isRamlImportOpen}
        onClose={() => setIsRamlImportOpen(false)}
        onImport={handleRamlImportConfig}
      />

      <ConversionReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        summary={reportSummaryState}
        reports={reportItemsState}
      />

      {/* Delete Confirmation Dialog */}
      {projectToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Project</h3>
            <p className="text-muted-foreground mb-4">
              Are you sure you want to remove "{projectToDelete.name}" from your
              recent projects? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleCancelDelete}>
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  forceClearProject(projectToDelete.id);
                  toast.success('Project cleared', {
                    description: `${projectToDelete.name} has been force cleared from recent projects`,
                  });
                  setProjectToDelete(null);
                }}
              >
                Force Clear
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
