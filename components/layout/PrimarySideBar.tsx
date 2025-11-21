"use client";

import { FileExplorer } from "@/components/features/filesystem/FileExplorer";
import { FileExplorerToolbar } from "@/components/features/filesystem/FileExplorerToolbar";
import { useLayout } from "@/hooks/use-layout";

export function PrimarySideBar() {
	const { activeView } = useLayout();

	const renderContent = () => {
		switch (activeView) {
			case "explorer":
				return (
					<div className="h-full flex flex-col">
						<FileExplorerToolbar />
						<div className="flex-1 overflow-hidden">
							<FileExplorer />
						</div>
					</div>
				);
			case "search":
				return (
					<div className="h-full flex flex-col">
						<div className="px-4 py-2 border-b border-border">
							<h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								Global Search
							</h2>
						</div>
						<div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
							Search feature coming soon
						</div>
					</div>
				);
			case "database":
				return (
					<div className="h-full flex flex-col">
						<div className="px-4 py-2 border-b border-border">
							<h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								Datasets
							</h2>
						</div>
						<div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
							Datasets view coming soon
						</div>
					</div>
				);
			case "analytics":
				return (
					<div className="h-full flex flex-col">
						<div className="px-4 py-2 border-b border-border">
							<h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								Analytics
							</h2>
						</div>
						<div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
							Analytics view coming soon
						</div>
					</div>
				);
			default:
				return null;
		}
	};

	return (
		<div className="h-full bg-background border-r border-border">
			{renderContent()}
		</div>
	);
}
