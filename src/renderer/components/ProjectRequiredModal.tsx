import React, { useCallback, useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, FolderOpen, Plus } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import logger from '@/lib/renderer-logger';
import { safeHandler } from '@/lib/error-handling';
import { CreateProjectModal } from './CreateProjectModal';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProjectRequiredModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ProjectRequiredModal({
    isOpen,
    onClose,
}: ProjectRequiredModalProps): React.JSX.Element {
    const loadProject = useAppStore((s) => s.loadProject);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isOpening, setIsOpening] = useState(false);

    const handleOpenExisting = useCallback(
        safeHandler(async () => {
            setIsOpening(true);
            try {
                const result = await window.api.selectFolder('Open Project Folder');
                if (result.success && result.data) {
                    await loadProject(result.data);
                    onClose();
                }
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                logger.error('Failed to open existing project', {
                    error: err.message,
                    stack: err.stack,
                });
            } finally {
                setIsOpening(false);
            }
        }),
        [loadProject, onClose],
    );

    const handleCreateNew = useCallback(() => {
        setIsCreateOpen(true);
    }, []);

    useEffect(() => {
        const handler = () => {
            if (!isOpen) {
                // no-op, parent controls open state; kept for symmetry if needed later
            }
        };
        document.addEventListener('show-project-required-modal', handler);
        return () => document.removeEventListener('show-project-required-modal', handler);
    }, [isOpen]);

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Project required
                        </DialogTitle>
                        <DialogDescription>
                            Open or create a project to continue.
                        </DialogDescription>
                    </DialogHeader>

                    <Alert>
                        <AlertDescription>
                            Some features (Explore, Build, Analytics) require a project. Choose an option below.
                        </AlertDescription>
                    </Alert>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button variant="secondary" onClick={handleOpenExisting} disabled={isOpening}>
                            <FolderOpen className="h-4 w-4 mr-2" />
                            {isOpening ? 'Opening…' : 'Open existing project'}
                        </Button>
                        <Button onClick={handleCreateNew}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create new project
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <CreateProjectModal
                isOpen={isCreateOpen}
                onClose={() => {
                    setIsCreateOpen(false);
                    onClose();
                }}
            />
        </>
    );
}


