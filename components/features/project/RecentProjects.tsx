"use client";

import {
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function RecentProjects() {
	// TODO: Fetch recent projects from storage
	const recentProjects: string[] = [];

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
					<DropdownMenuItem key={project} onClick={() => console.log(project)}>
						{project}
					</DropdownMenuItem>
				))
			)}
		</>
	);
}
