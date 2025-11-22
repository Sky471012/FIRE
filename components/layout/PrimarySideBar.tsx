"use client";

import { FileExplorer } from "@/components/features/filesystem/FileExplorer";

export function PrimarySideBar() {
	return (
		<div className="h-full bg-background border-r border-border flex flex-col">
			{/* Header */}
			<div className="px-4 py-2 border-b border-border">
				<h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					Explorer
				</h2>
			</div>

			{/* File Explorer Content */}
			<div className="flex-1 overflow-hidden">
				<FileExplorer />
			</div>
		</div>
	);
}
