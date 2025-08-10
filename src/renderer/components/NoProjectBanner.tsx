import React from 'react';
import { AlertTriangle, FolderOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface NoProjectBannerProps {
    onOpenProject: () => void;
    onCreateProject: () => void;
}

export function NoProjectBanner({
    onOpenProject,
    onCreateProject,
}: NoProjectBannerProps): React.JSX.Element {
    return (
        <div className="w-full border-b border-border/40 bg-muted/40">
            <div className="container mx-auto px-4 py-2 flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <Alert className="flex-1 border-0 p-0 bg-transparent">
                    <AlertDescription className="text-sm">
                        No project open — create a new one or open an existing project to continue.
                    </AlertDescription>
                </Alert>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={onOpenProject}>
                        <FolderOpen className="h-3.5 w-3.5 mr-2" /> Open
                    </Button>
                    <Button size="sm" onClick={onCreateProject}>
                        <Plus className="h-3.5 w-3.5 mr-2" /> Create
                    </Button>
                </div>
            </div>
        </div>
    );
}


