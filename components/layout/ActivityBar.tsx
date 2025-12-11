"use client";

import {
	Database,
	FolderTree,
	MessageSquare,
	Play,
	Search,
	Settings,
	Square,
    Workflow,
} from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLayout } from "@/hooks/use-layout";
import { useSidebar } from "@/hooks/use-sidebar";
import { usePythonServer } from "@/hooks/use-python-server";
import { useTabs } from "@/hooks/use-tabs";
import { useProject } from "@/hooks/use-project";
import { fileSystemApi } from "@/lib/filesystem-api";
import { cn } from "@/lib/utils";
import { createChildWindow } from "@/lib/window";

export function ActivityBar() {
	const { activeView, setActiveView } = useLayout();
	const { isLeftSidebarOpen, setLeftOpen } = useSidebar();
	const { isRunning, isLoading, toggleServer } = usePythonServer();
    const { addTab } = useTabs();
    const { currentProjectPath } = useProject();

	const topButtons = [
		{ id: "explorer", icon: FolderTree, label: "Data Explorer" },
		{ id: "search", icon: Search, label: "Global Search" },
		{ id: "database", icon: Database, label: "Datasets" },
		// { id: "flux", icon: Workflow, label: "Flux Pipeline" }, // Removed flux view
		{ id: "chat", icon: MessageSquare, label: "AI Chat" },
	];

	const handleViewClick = (viewId: string) => {
		// Single click: only switch to view, don't change sidebar state
		setActiveView(viewId);
	};

	const handleViewDoubleClick = (viewId: string) => {
		// Double click: toggle sidebar visibility
		setActiveView(viewId);
		setLeftOpen(!isLeftSidebarOpen);
	};

    const handleNewCanvas = async () => {
        if (!currentProjectPath) return;
        
        try {
            // Create Pipelines folder if it doesn't exist (implicit in createFile usually? no, ensure it exists)
            // But we assume initialized projects have it.
            // We'll rely on createFile failing if dir missing, or assume it works.
            // Ideally we'd check/create dir, but for now:
            
            // Note: We use a timestamp to avoid name collision for now if needed, 
            // but user said "Untitled.fire". 
            // If we want unique, maybe "Untitled_timestamp.fire" 
            // or let backend handle unique naming if create_file supports it?
            // Converting spaces to underscores usually safer.
            const fileName = `Untitled_${Date.now()}.fire`;
            
            const pipelinePath = `${currentProjectPath}/Pipelines`;
            
            // Ensure Pipelines directory exists
            try {
                await fileSystemApi.getFileInfo(pipelinePath);
            } catch (error) {
                // Directory likely doesn't exist, try to create it
                try {
                    await fileSystemApi.createFolder(currentProjectPath, "Pipelines");
                } catch (createError) {
                    // Ignore if folder already exists, otherwise log error
                    if (!String(createError).includes("already exists")) {
                        console.error("Failed to create Pipelines folder:", createError);
                    }
                }
            }
            
            // Create file in the Pipelines directory
            const fullPath = await fileSystemApi.createFile(pipelinePath, fileName);
            
            // Write default content
            await fileSystemApi.writeFileContent(fullPath, JSON.stringify({ nodes: [], edges: [] }, null, 2));

            // Open tab
            addTab({
                title: fileName,
                filePath: fullPath,
                icon: "Workflow",
                type: "flux", 
            });

        } catch (error) {
            console.error("Failed to create flux canvas:", error);
        }
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
								onDoubleClick={() => handleViewDoubleClick(button.id)}
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

                {/* New Canvas Button */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            onClick={handleNewCanvas}
                            className={cn(
                                "h-12 w-full flex items-center justify-center transition-colors relative",
                                "hover:bg-accent text-muted-foreground",
                            )}
                            aria-label="New Canvas"
                        >
                             <Workflow className="h-5 w-5" />
                             <span className="sr-only">New Canvas</span>
                             {/* Small plus indicator */}
                             <div className="absolute top-3 right-3 w-2 h-2 bg-primary rounded-full border-2 border-muted/30" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                        <p className="text-xs">New Canvas</p>
                    </TooltipContent>
                </Tooltip>

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
						aria-label={
							isRunning ? "Stop Python Server" : "Start Python Server"
						}
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
