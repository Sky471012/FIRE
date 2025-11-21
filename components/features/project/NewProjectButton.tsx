"use client";

import { open } from "@tauri-apps/plugin-dialog";
import { FolderPlus } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function NewProjectButton() {
	const handleNewProject = async () => {
		try {
			const selected = await open({
				directory: true,
				multiple: false,
				title: "Select Folder for New Project",
			});
			if (selected) {
				console.log("Selected folder for new project:", selected);
				// TODO: Handle new project creation logic
			}
		} catch (error) {
			console.error("Error creating new project:", error);
		}
	};

	return (
		<DropdownMenuItem onClick={handleNewProject}>
			<FolderPlus className="h-4 w-4" />
			New Project
		</DropdownMenuItem>
	);
}
