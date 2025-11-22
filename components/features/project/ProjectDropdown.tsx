"use client";

import { ChevronDown } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProject } from "@/hooks/use-project";
import { NewProjectButton } from "./NewProjectButton";
import { OpenProjectButton } from "./OpenProjectButton";
import { RecentProjects } from "./RecentProjects";

export function ProjectDropdown() {
	const { currentProjectName } = useProject();

	return (
		<div className="flex items-center flex-shrink-0">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						className="h-9 px-3 flex items-center gap-1.5 hover:bg-accent/50 transition-colors text-xs font-medium"
						aria-label="Project menu"
					>
						<span>{currentProjectName || "Project"}</span>
						<ChevronDown className="h-3 w-3" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="w-56">
					<OpenProjectButton />
					<NewProjectButton />
					<RecentProjects />
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
