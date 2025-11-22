"use client";

import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useFileSystem } from "@/hooks/use-filesystem";

export function FileExplorerEmpty() {
	const { setRootPath } = useFileSystem();

	const handleOpenFolder = async () => {
		try {
			const selected = await open({
				directory: true,
				multiple: false,
				title: "Select Vault to Browse",
			});

			if (selected) {
				setRootPath(selected);

				// Add to recent projects
				try {
					await invoke("add_recent_project", { path: selected });
				} catch (e) {
					console.error("Failed to add to recent projects:", e);
				}

				toast.success("Vault opened successfully");
			}
		} catch (error) {
			toast.error(`Failed to open vault: ${error}`);
		}
	};

	return (
		<div className="flex flex-col items-center justify-center h-full p-8 text-center">
			<FolderOpen className="h-16 w-16 text-muted-foreground/50 mb-4" />
			<h3 className="text-lg font-semibold mb-2">No Vault Opened</h3>
			<p className="text-sm text-muted-foreground mb-6 max-w-sm">
				Open a vault to browse files and directories. Your most recent vault
				will be loaded automatically next time.
			</p>
			<Button onClick={handleOpenFolder} variant="default">
				<FolderOpen className="mr-2 h-4 w-4" />
				Open Vault
			</Button>
			<div className="mt-8 text-xs text-muted-foreground space-y-1">
				<p>
					<kbd className="px-1.5 py-0.5 rounded bg-muted">Right-click</kbd> for
					context menu
				</p>
				<p>
					<kbd className="px-1.5 py-0.5 rounded bg-muted">F2</kbd> to rename
				</p>
				<p>
					<kbd className="px-1.5 py-0.5 rounded bg-muted">Delete</kbd> to remove
				</p>
				<p>
					<kbd className="px-1.5 py-0.5 rounded bg-muted">Ctrl+C/X/V</kbd> to
					copy/cut/paste
				</p>
			</div>
		</div>
	);
}
