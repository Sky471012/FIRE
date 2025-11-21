"use client";

import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function OpenProjectButton() {
	const handleOpenProject = async () => {
		try {
			const selected = await open({
				directory: true,
				multiple: false,
				title: "Open Project",
			});
			if (selected) {
				console.log("Selected project:", selected);
				// TODO: Handle project opening logic
			}
		} catch (error) {
			console.error("Error opening project:", error);
		}
	};

	return (
		<DropdownMenuItem onClick={handleOpenProject}>
			<FolderOpen className="h-4 w-4" />
			Open Project
		</DropdownMenuItem>
	);
}
