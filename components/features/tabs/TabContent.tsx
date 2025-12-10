"use client";

import { FileTabContent } from "@/components/features/editor";
import { WelcomePage } from "@/components/pages/WelcomePage";
import { FluxEditor } from "@/components/features/flux/FluxEditor";
import { useTabs } from "@/hooks/use-tabs";

export function TabContent() {
	const { tabs, activeTabId } = useTabs();

	const activeTab = tabs.find((tab) => tab.id === activeTabId);

	if (!activeTab) {
		return (
			<div className="h-full w-full flex items-center justify-center bg-background">
				<p className="text-sm text-muted-foreground">No active tab</p>
			</div>
		);
	}

	// Handle welcome tab
	if (activeTab.type === "welcome" || activeTab.id === "welcome") {
		return <WelcomePage />;
	}

	// Handle file tabs
	if (activeTab.filePath) {
        if (activeTab.type === "flux") {
             return <FluxEditor path={activeTab.filePath} />;
        }
		return (
			<FileTabContent filePath={activeTab.filePath} tabId={activeTab.id} />
		);
	}

	// Handle custom content tabs (for chat, custom pages, etc.)
	if (activeTab.content) {
		return <>{activeTab.content}</>;
	}

	// Fallback
	return (
		<div className="h-full w-full flex items-center justify-center bg-background">
			<p className="text-sm text-muted-foreground">
				No content available for this tab
			</p>
		</div>
	);
}
