"use client";

import { FileExplorer } from "@/components/features/filesystem/FileExplorer";
import { ChatSessionsList } from "@/components/features/chat/ChatSessionsList";
import { DatasetsList } from "@/components/features/project/DatasetsList";
import { useLayout } from "@/hooks/use-layout";

export function PrimarySideBar() {
	const { activeView } = useLayout();

	// Render different content based on active view
	const renderContent = () => {
		switch (activeView) {
			case "chat":
				return <ChatSessionsList />;
			case "database":
				return <DatasetsList />;
			case "explorer":
			default:
				return (
					<>
						<div className="px-4 py-2 border-b border-border">
							<h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								Explorer
							</h2>
						</div>
						<div className="flex-1 overflow-hidden">
							<FileExplorer />
						</div>
					</>
				);
		}
	};

	return (
		<div className="h-full bg-background border-r border-border flex flex-col">
			{renderContent()}
		</div>
	);
}
