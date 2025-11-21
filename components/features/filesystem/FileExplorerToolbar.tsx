"use client";

import { RefreshCw, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFileSystem } from "@/hooks/use-filesystem";

export function FileExplorerToolbar() {
	const { triggerRefresh, rootPath, showHiddenFiles, setShowHiddenFiles } = useFileSystem();

	return (
		<div className="flex items-center justify-between px-4 py-2 border-b border-border">
			<h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
				File Explorer
			</h2>

			{rootPath && (
				<div className="flex items-center gap-1">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								className="h-6 w-6 p-0"
								onClick={triggerRefresh}
							>
								<RefreshCw className="h-3.5 w-3.5" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="bottom">
							<p className="text-xs">Refresh</p>
						</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								className="h-6 w-6 p-0"
								onClick={() => setShowHiddenFiles(!showHiddenFiles)}
							>
								{showHiddenFiles ? (
									<Eye className="h-3.5 w-3.5" />
								) : (
									<EyeOff className="h-3.5 w-3.5" />
								)}
							</Button>
						</TooltipTrigger>
						<TooltipContent side="bottom">
							<p className="text-xs">
								{showHiddenFiles ? "Hide" : "Show"} Hidden Files
							</p>
						</TooltipContent>
					</Tooltip>
				</div>
			)}
		</div>
	);
}

