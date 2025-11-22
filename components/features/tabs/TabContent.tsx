"use client";

import { useTabs } from "@/hooks/use-tabs";
import { FileTabContent } from "@/components/features/editor";
import { WelcomePage } from "@/components/pages/WelcomePage";

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
	if (activeTab.id === "welcome") {
		return <WelcomePage />;
	}

	// Handle file tabs
	if (activeTab.filePath) {
		return <FileTabContent filePath={activeTab.filePath} tabId={activeTab.id} />;
	}

	// Handle custom content tabs
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

