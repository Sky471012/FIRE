"use client";

import { PanelLeft, PanelRight, Plus } from "lucide-react";
import { ProjectDropdown } from "@/components/features/project";
import { Tab } from "@/components/features/tabs";
import { WindowControls } from "@/components/features/window";
import { useSidebar } from "@/hooks/use-sidebar";
import { useTabs } from "@/hooks/use-tabs";
import { cn } from "@/lib/utils";

export function TitleBar() {
	const { tabs, activeTabId, addTab } = useTabs();
	const {
		isLeftSidebarOpen,
		isRightSidebarOpen,
		activeView,
		toggleLeftSidebar,
		toggleRightSidebar,
	} = useSidebar();

	const handleNewTab = () => {
		addTab({
			title: "Untitled",
			isDirty: false,
			isPinned: false,
		});
	};

	return (
		<div
			data-tauri-drag-region
			className="h-9 bg-background border-b border-border flex items-center select-none"
		>
			{/* Left: Project Dropdown */}
			<ProjectDropdown />

			{/* Center: Tabs + Plus Button */}
			<div className="flex items-center min-w-0 flex-1">
				<div className="flex items-center min-w-0 overflow-x-auto scrollbar-thin">
					<div className="flex items-center h-9 min-w-max">
						{tabs.map((tab) => (
							<Tab key={tab.id} tab={tab} isActive={tab.id === activeTabId} />
						))}
					</div>
				</div>

				{/* New Tab Button - right after tabs */}
				<button
					type="button"
					onClick={handleNewTab}
					className={cn(
						"h-9 w-9 flex-shrink-0 flex items-center justify-center",
						"hover:bg-accent/50 transition-colors duration-150",
					)}
					aria-label="New tab"
				>
					<Plus className="h-4 w-4" />
				</button>
			</div>

			{/* Spacer to push sidebar toggles and window controls to the right */}
			<div className="flex-1 min-w-4" />

			{/* Sidebar Toggle Buttons */}
			<div className="flex items-center flex-shrink-0 border-l border-border/50">
				<button
					type="button"
					onClick={() => toggleLeftSidebar(activeView)}
					className={cn(
						"h-9 w-9 flex items-center justify-center transition-colors",
						isLeftSidebarOpen
							? "hover:bg-accent/50"
							: "hover:bg-accent/50 opacity-50",
					)}
					aria-label="Toggle left sidebar"
				>
					<PanelLeft className="h-3.5 w-3.5" />
				</button>
				<button
					type="button"
					onClick={toggleRightSidebar}
					className={cn(
						"h-9 w-9 flex items-center justify-center transition-colors",
						isRightSidebarOpen
							? "hover:bg-accent/50"
							: "hover:bg-accent/50 opacity-50",
					)}
					aria-label="Toggle right sidebar"
				>
					<PanelRight className="h-3.5 w-3.5" />
				</button>
			</div>

			{/* Right: Window controls */}
			<WindowControls />
		</div>
	);
}
