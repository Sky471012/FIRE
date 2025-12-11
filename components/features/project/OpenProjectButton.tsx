"use client";

import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen } from "lucide-react";
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

export function OpenProjectButton() {
    const { openProject } = useProject();
    const [error, setError] = useState<string | null>(null);

    const handleOpenProject = async () => {
        try {
            const selected = await open({
                directory: true,
                multiple: false,
                title: "Select Project Folder",
            });

            if (selected) {
                await openProject(selected);
            }
        } catch (error) {
            console.error("Error opening project:", error);
            const errorMessage = error instanceof Error ? error.message : "Failed to open project";
            setError(errorMessage);
        }
    };

    return (
        <>
            <DropdownMenuItem onClick={handleOpenProject}>
                <FolderOpen className="h-4 w-4" />
                Open Project
            </DropdownMenuItem>

            <AlertDialog open={!!error} onOpenChange={() => setError(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cannot Open Project</AlertDialogTitle>
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
