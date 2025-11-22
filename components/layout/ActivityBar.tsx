"use client";

import {
	Database,
	FolderTree,
	MessageSquare,
	Search,
	Settings,
	Play,
	Square,
} from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLayout } from "@/hooks/use-layout";
import { usePythonServer } from "@/hooks/use-python-server";
import { cn } from "@/lib/utils";
import { createChildWindow } from "@/lib/window";

export function ActivityBar() {
	const { activeView, setActiveView } = useLayout();
	const { isRunning, isLoading, toggleServer } = usePythonServer();

	const topButtons = [
		{ id: "explorer", icon: FolderTree, label: "Data Explorer" },
		{ id: "search", icon: Search, label: "Global Search" },
		{ id: "database", icon: Database, label: "Datasets" },
		{ id: "chat", icon: MessageSquare, label: "AI Chat" },
	];

	const handleViewClick = (viewId: string) => {
		// Only set the active view for sidebar updates
		// Don't create tabs for views - they show content in sidebar
		setActiveView(viewId);
	};

	return (
		<div className="w-12 bg-muted/30 border-r border-border flex flex-col items-center py-2 gap-0.5">
			{/* Top Navigation Buttons */}
			<div className="flex flex-col gap-0.5 w-full">
				{topButtons.map((button) => (
					<Tooltip key={button.id}>
						<TooltipTrigger asChild>
							<button
								type="button"
								onClick={() => handleViewClick(button.id)}
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

			{/* Python Server Control Button */}
			<Tooltip>
				<TooltipTrigger asChild>
					<button
						type="button"
						onClick={toggleServer}
						disabled={isLoading}
						className={cn(
							"h-12 w-full flex items-center justify-center transition-colors relative",
							"hover:bg-accent",
							isRunning ? "text-red-500" : "text-green-500",
							isLoading && "opacity-50 cursor-wait",
						)}
						aria-label={isRunning ? "Stop Python Server" : "Start Python Server"}
					>
						{isRunning ? (
							<Square className="h-5 w-5 fill-current" />
						) : (
							<Play className="h-5 w-5 fill-current" />
						)}
					</button>
				</TooltipTrigger>
				<TooltipContent side="right" sideOffset={8}>
					<p className="text-xs">
						{isRunning ? "Stop Python Server" : "Start Python Server"}
					</p>
				</TooltipContent>
			</Tooltip>

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
