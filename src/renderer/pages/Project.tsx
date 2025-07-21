/**
 * Project page component for JSON Schema Editor.
 *
 * This component handles project management including project setup,
 * project overview, loading states, and error handling.
 *
 * @module Project
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React from 'react';
import { useAppStore } from '../stores/useAppStore';
import { ProjectSetup } from '../components/ProjectSetup';
import { ProjectOverview } from '../components/ProjectOverview';
import { ProjectLoading } from '../components/ProjectLoading';
import { ProjectError } from '../components/ProjectError';

/**
 * Project page component for the JSON Schema Editor.
 *
 * This component renders different states based on the current project:
 * - Loading state when a project is being loaded
 * - Error state when project loading fails
 * - Setup state when no project is loaded
 * - Overview state when a project is loaded
 *
 * @returns JSX element representing the project page
 *
 * @example
 * ```tsx
 * <Project />
 * ```
 */
export function Project(): React.JSX.Element {
  const { currentProject, isLoadingProject, projectError } = useAppStore();

  // Show loading state
  if (isLoadingProject) {
    return <ProjectLoading />;
  }

  // Show error state
  if (projectError) {
    return <ProjectError error={projectError} />;
  }

  // Show setup state when no project is loaded
  if (!currentProject) {
    return <ProjectSetup />;
  }

  // Show project overview when project is loaded
  return <ProjectOverview project={currentProject} />;
}
