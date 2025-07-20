/**
 * Project overview component for JSON Schema Editor.
 *
 * This component displays information about the currently loaded project.
 *
 * @module ProjectOverview
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, FileText, Calendar, Settings, Plus } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { CreateProjectModal } from './CreateProjectModal';

import type { Project } from '../../types/schema-editor';

/**
 * Project overview component props.
 */
interface ProjectOverviewProps {
    /** The project to display */
    project: Project;
}

/**
 * Project overview component.
 *
 * This component displays:
 * - Project metadata (name, path, creation date)
 * - Project status and statistics
 * - Quick actions (explore, build, settings)
 * - Recent projects list
 * - Create new project button
 *
 * @param props - Component props
 * @returns JSX element representing the project overview
 *
 * @example
 * ```tsx
 * <ProjectOverview project={currentProject} />
 * ```
 */
export function ProjectOverview({ project }: ProjectOverviewProps): React.JSX.Element {
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
                {/* Project Header */}
                <Card className="glass-blue border-0">
                    <CardHeader className="gradient-accent rounded-t-lg border-b border-primary/20">
                        <CardTitle className="text-foreground flex items-center gap-2">
                            <FolderOpen className="w-5 h-5" />
                            {project.name}
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                            {project.path}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Schemas:</span>
                                <Badge variant="secondary">{project.status.totalSchemas}</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Created:</span>
                                <span className="text-sm">{new Date(project.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Settings className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Pattern:</span>
                                <Badge variant="outline">{project.schemaPattern}</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>



                {/* Project Status */}
                <Card className="glass-blue border-0">
                    <CardHeader>
                        <CardTitle>Project Status</CardTitle>
                        <CardDescription>
                            Current status and validation information
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Total Schemas:</span>
                                    <Badge variant="secondary">{project.status.totalSchemas}</Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Valid Schemas:</span>
                                    <Badge variant="default">{project.status.validSchemas}</Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Invalid Schemas:</span>
                                    <Badge variant="destructive">{project.status.invalidSchemas}</Badge>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Last Scan:</span>
                                    <span className="text-sm">
                                        {project.status.lastScanTime
                                            ? new Date(project.status.lastScanTime).toLocaleString()
                                            : 'Never'
                                        }
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Auto Validate:</span>
                                    <Badge variant={project.settings.autoValidate ? "default" : "secondary"}>
                                        {project.settings.autoValidate ? "Enabled" : "Disabled"}
                                    </Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Watch Changes:</span>
                                    <Badge variant={project.settings.watchForChanges ? "default" : "secondary"}>
                                        {project.settings.watchForChanges ? "Enabled" : "Disabled"}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Projects */}
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
                            className="border-gradient hover-lift hover:gradient-accent transition-all duration-200 text-foreground"
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
                                <p className="text-xs">Create your first project to get started</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {recentProjects.slice(0, 5).map((recentProject) => (
                                    <div
                                        key={recentProject.id}
                                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${recentProject.id === project.id
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border/50 hover:bg-muted/50'
                                            }`}
                                        onClick={() => handleOpenProject(recentProject.path)}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-sm truncate">{recentProject.name}</h4>
                                            <p className="text-xs text-muted-foreground truncate">{recentProject.path}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Last opened: {new Date(recentProject.lastModified).toLocaleDateString()}
                                            </p>
                                        </div>
                                        {recentProject.id === project.id && (
                                            <Badge variant="default" className="shrink-0 ml-2">
                                                Current
                                            </Badge>
                                        )}
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
                onClose={handleCloseModal}
            />
        </>
    );
} 