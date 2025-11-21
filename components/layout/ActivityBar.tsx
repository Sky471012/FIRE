"use client";

import {
	BarChart3,
	Database,
	FolderTree,
	Search,
	Settings,
} from "lucide-react";
import { useState } from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { createChildWindow } from "@/lib/window";

export function ActivityBar() {
	const [activeView, setActiveView] = useState<string>("explorer");

	const topButtons = [
		{ id: "explorer", icon: FolderTree, label: "Data Explorer" },
		{ id: "search", icon: Search, label: "Global Search" },
		{ id: "database", icon: Database, label: "Datasets" },
		{ id: "analytics", icon: BarChart3, label: "Analytics" },
	];

	return (
		<div className="w-12 bg-muted/30 border-r border-border flex flex-col items-center py-2 gap-0.5">
			{/* Top Navigation Buttons */}
			<div className="flex flex-col gap-0.5 w-full">
				{topButtons.map((button) => (
					<Tooltip key={button.id}>
						<TooltipTrigger asChild>
							<button
								type="button"
								onClick={() => setActiveView(button.id)}
								className={cn(
									"h-12 w-full flex items-center justify-center transition-colors relative",
									"hover:bg-accent",
									activeView === button.id
										? "text-foreground bg-accent"
										: "text-muted-foreground",
								)}
								aria-label={button.label}
							>
								{activeView === button.id && (
									<div className="absolute left-0 w-0.5 h-6 bg-primary" />
								)}
								<button.icon className="h-5 w-5" />
							</button>
						</TooltipTrigger>
						<TooltipContent side="right" sideOffset={8}>
							<p className="text-xs">{button.label}</p>
						</TooltipContent>
					</Tooltip>
				))}
			</div>

			{/* Spacer */}
			<div className="flex-1" />

		{/* Settings Button at Bottom */}
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					onClick={async () => {
						try {
							await createChildWindow({
								label: "settings",
								title: "Settings",
								url: "/settings",
								width: 800,
								height: 600,
							});
						} catch (error) {
							console.error("Failed to open settings:", error);
						}
					}}
					className={cn(
						"h-12 w-full flex items-center justify-center transition-colors relative",
						"hover:bg-accent",
						activeView === "settings"
							? "text-foreground bg-accent"
							: "text-muted-foreground",
					)}
					aria-label="Settings"
				>
					{activeView === "settings" && (
						<div className="absolute left-0 w-0.5 h-6 bg-primary" />
					)}
					<Settings className="h-5 w-5" />
				</button>
			</TooltipTrigger>
			<TooltipContent side="right" sideOffset={8}>
				<p className="text-xs">Settings</p>
			</TooltipContent>
		</Tooltip>
		</div>
	);
}
