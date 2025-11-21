"use client";

import { Circle, Pin, X } from "lucide-react";
import type React from "react";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { type Tab as TabType, useTabs } from "@/hooks/use-tabs";
import { cn } from "@/lib/utils";

interface TabProps {
	tab: TabType;
	isActive: boolean;
}

export function Tab({ tab, isActive }: TabProps) {
	const { removeTab, setActiveTab, closeOtherTabs, closeTabsToRight, pinTab } =
		useTabs();

	const handleClose = (e: React.MouseEvent) => {
		e.stopPropagation();
		removeTab(tab.id);
	};

	const handleClick = () => {
		setActiveTab(tab.id);
	};

	return (
		<ContextMenu>
			<ContextMenuTrigger>
				<div
					role="tab"
					tabIndex={0}
					onClick={handleClick}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							handleClick();
						}
					}}
					aria-selected={isActive}
					className={cn(
						"group relative h-9 px-3 flex items-center gap-2 cursor-pointer transition-all duration-150 border-r border-border/30",
						"hover:bg-accent/50",
						isActive ? "bg-accent text-foreground" : "text-muted-foreground",
					)}
					style={{
						minWidth: tab.isPinned ? "40px" : "120px",
						maxWidth: tab.isPinned ? "40px" : "180px",
					}}
				>
					{/* Active indicator */}
					{isActive && (
						<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
					)}

					{/* Pin icon for pinned tabs */}
					{tab.isPinned && (
						<Pin className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
					)}

					{/* Tab content */}
					{!tab.isPinned && (
						<>
							{/* Dirty indicator */}
							{tab.isDirty && (
								<Circle className="h-2 w-2 fill-current flex-shrink-0" />
							)}

							{/* Title */}
							<span className="text-xs font-medium truncate flex-1">
								{tab.title}
							</span>

							{/* Close button */}
							<button
								type="button"
								onClick={handleClose}
								className={cn(
									"flex-shrink-0 h-4 w-4 rounded hover:bg-accent flex items-center justify-center",
									"opacity-0 group-hover:opacity-100 transition-opacity",
								)}
								aria-label="Close tab"
							>
								<X className="h-3 w-3" />
							</button>
						</>
					)}

					{/* Close button for pinned tabs (only on hover) */}
					{tab.isPinned && (
						<button
							type="button"
							onClick={handleClose}
							className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-muted/80 transition-opacity"
							aria-label="Close tab"
						>
							<X className="h-3 w-3" />
						</button>
					)}
				</div>
			</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuItem onClick={() => removeTab(tab.id)}>
					Close
				</ContextMenuItem>
				<ContextMenuItem onClick={() => closeOtherTabs(tab.id)}>
					Close Others
				</ContextMenuItem>
				<ContextMenuItem onClick={() => closeTabsToRight(tab.id)}>
					Close Tabs to the Right
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem onClick={() => pinTab(tab.id)}>
					{tab.isPinned ? "Unpin" : "Pin"} Tab
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
