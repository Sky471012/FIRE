"use client";

import { open } from "@tauri-apps/plugin-dialog";
import { FolderPlus } from "lucide-react";
import { useState } from "react";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useProject } from "@/hooks/use-project";

export function NewProjectButton() {
    const { createProject } = useProject();
    const [error, setError] = useState<string | null>(null);

    const handleNewProject = async () => {
        try {
            const selected = await open({
                directory: true,
                multiple: false,
                title: "Select Empty Folder for New Project",
            });

            if (selected) {
                await createProject(selected);
            }
        } catch (error) {
            console.error("Error creating new project:", error);
            const errorMessage =
                error instanceof Error ? error.message : "Failed to create project";
            setError(errorMessage);
        }
    };

    return (
        <>
            <DropdownMenuItem onClick={handleNewProject}>
                <FolderPlus className="h-4 w-4" />
                New Project
            </DropdownMenuItem>

            <AlertDialog open={!!error} onOpenChange={() => setError(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cannot Create Project</AlertDialogTitle>
                        <AlertDialogDescription>{error}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <Button onClick={() => setError(null)}>OK</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
