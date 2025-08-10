import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { FolderOpen, Plus } from 'lucide-react';
import { CreateProjectModal } from '@/components/CreateProjectModal';
import { useAppStore } from '@/stores/useAppStore';
import { safeHandler } from '@/lib/error-handling';

export function Onboarding(): React.JSX.Element {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const loadProject = useAppStore((s) => s.loadProject);

  const handleOpen = safeHandler(async () => {
    const result = await window.api.selectFolder('Open Project Folder');
    if (result.success && result.data) {
      await loadProject(result.data);
    }
  });

  return (
    <div className="h-full flex items-center justify-center p-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>
            Get started by creating a new project or opening an existing one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              variant="secondary"
              className="h-24 flex flex-col items-center justify-center"
              onClick={handleOpen}
            >
              <FolderOpen className="h-6 w-6 mb-2" />
              Open existing project
            </Button>
            <Button
              className="h-24 flex flex-col items-center justify-center"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="h-6 w-6 mb-2" />
              Create new project
            </Button>
          </div>
        </CardContent>
      </Card>

      <CreateProjectModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </div>
  );
}
