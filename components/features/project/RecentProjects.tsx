"use client";

import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import {
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useProject } from "@/hooks/use-project";

export function RecentProjects() {
    const { recentProjects, openRecentProject } = useProject();
    const [projectNames, setProjectNames] = useState<Record<string, string | null>>({});

    // Load project names for each recent project
    useEffect(() => {
        const loadProjectNames = async () => {
            const names: Record<string, string | null> = {};
            for (const project of recentProjects) {
                try {
                    const name = await invoke<string>("get_project_name", {
                        path: project.path,
                    });
                    names[project.path] = name;
                } catch {
                    // If we can't get the name, use the folder name
                    const folderName = project.path.split(/[\\/]/).pop() || project.path;
                    names[project.path] = folderName;
                }
            }
            setProjectNames(names);
        };

        if (recentProjects.length > 0) {
            loadProjectNames();
        }
    }, [recentProjects]);

    const handleProjectClick = async (path: string) => {
        try {
            await openRecentProject(path);
        } catch (error) {
            console.error("Failed to open recent project:", error);
        }
    };

    return (
        <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Recent Projects</DropdownMenuLabel>
            {recentProjects.length === 0 ? (
                <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                    No recent projects
                </DropdownMenuItem>
            ) : (
                recentProjects.map((project) => (
                    <DropdownMenuItem
                        key={project.path}
                        onClick={() => handleProjectClick(project.path)}
                        className="flex flex-col items-start"
                    >
                        <span className="font-medium">
                            {projectNames[project.path] || "Loading..."}
                        </span>
                        <span className="text-xs text-muted-foreground truncate w-full">
                            {project.path}
                        </span>
                    </DropdownMenuItem>
                ))
            )}
        </>
    );
}
