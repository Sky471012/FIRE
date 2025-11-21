"use client";

import { Plus } from "lucide-react";
import { useTabs } from "@/hooks/use-tabs";
import { cn } from "@/lib/utils";
import { Tab } from "./Tab";

export function TabBar() {
	const { tabs, activeTabId, addTab } = useTabs();

	const handleNewTab = () => {
		addTab({
			title: "Untitled",
			isDirty: false,
			isPinned: false,
		});
	};

	return (
		<div className="no-drag flex items-center h-9 bg-muted/20 border-b border-border/50">
			{/* Tabs container with horizontal scroll */}
			<div className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-thin">
				<div className="flex items-center h-9 min-w-max">
					{tabs.map((tab) => (
						<Tab key={tab.id} tab={tab} isActive={tab.id === activeTabId} />
					))}
				</div>
			</div>

			{/* New Tab Button */}
			<button
				type="button"
				onClick={handleNewTab}
				className={cn(
					"h-9 w-9 flex-shrink-0 flex items-center justify-center",
					"hover:bg-accent/50 transition-colors duration-150",
					"border-l border-border/50",
				)}
				aria-label="New tab"
			>
				<Plus className="h-4 w-4" />
			</button>
		</div>
	);
}
