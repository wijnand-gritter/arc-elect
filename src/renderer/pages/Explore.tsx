/**
 * Explore page component for JSON Schema Editor.
 *
 * This component provides schema exploration and analytics functionality.
 *
 * @module Explore
 * @author Wijnand Gritter
 * @version 1.0.0
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Search } from 'lucide-react';
import { SchemaList } from '../components/SchemaList';
import { SchemaDetailModal } from '../components/schema/SchemaDetailModal';
import { useAppStore } from '../stores/useAppStore';

/**
 * Explore page component for schema exploration.
 *
 * This component provides:
 * - Schema grid/list views
 * - Search and filtering
 * - Schema detail modals
 * - Analytics dashboard
 *
 * @returns JSX element representing the explore page
 *
 * @example
 * ```tsx
 * <Explore />
 * ```
 */
export function Explore(): React.JSX.Element {
  const currentProject = useAppStore((state) => state.currentProject);
  const modalStack = useAppStore((state) => state.modalStack);
  const openSchemaModal = useAppStore((state) => state.openSchemaModal);
  const closeAllModals = useAppStore((state) => state.closeAllModals);
  const setPage = useAppStore((state) => state.setPage);

  const isModalOpen = modalStack.length > 0;

  /**
   * Handles opening schema detail modal.
   */
  const handleSchemaView = (schema: any) => {
    openSchemaModal(schema, 'overview');
  };

  /**
   * Handles navigating to build page for editing.
   */
  const handleSchemaEdit = (_schema: any) => {
    setPage('build');
    // TODO: Set the schema to edit in the build page
  };

  /**
   * Handles closing all modals.
   */
  const handleCloseModal = () => {
    closeAllModals();
  };

  if (!currentProject) {
    return (
      <div className="px-4 lg:px-6">
        <Card className="glass-blue border-0">
          <CardHeader className="gradient-accent rounded-t-lg border-b border-primary/20">
            <CardTitle className="text-foreground flex items-center gap-2">
              <Search className="w-5 h-5" />
              Explore Schemas
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Browse, search, and analyze your JSON schemas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <Search className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
                <div>
                  <h3 className="text-lg font-medium">No Project Loaded</h3>
                  <p className="text-sm text-muted-foreground">
                    Load a project to explore its schemas
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 lg:px-6 space-y-6">
        {/* Schema List */}
        <Card className="glass-blue border-0">
          <CardHeader>
            <CardTitle>Schemas</CardTitle>
            <CardDescription>Browse and manage schemas in your project</CardDescription>
          </CardHeader>
          <CardContent>
            <SchemaList
              schemas={currentProject.schemas || []}
              isLoading={false}
              onSchemaClick={handleSchemaView}
              onSchemaEdit={handleSchemaEdit}
              onSchemaView={handleSchemaView}
            />
          </CardContent>
        </Card>
      </div>

      {/* Schema Detail Modal */}
      <SchemaDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onEdit={handleSchemaEdit}
      />
    </>
  );
}
