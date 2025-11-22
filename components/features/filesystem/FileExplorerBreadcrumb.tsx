"use client";

import { ChevronRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFileSystem } from "@/hooks/use-filesystem";

export function FileExplorerBreadcrumb() {
	const { rootPath, setRootPath } = useFileSystem();

	if (!rootPath) return null;

	return (
		<div className="flex items-center gap-1 px-2 py-1.5 border-b border-border overflow-x-auto">
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className="h-6 px-2 text-xs"
						onClick={() => setRootPath(null)}
					>
						<Home className="h-3 w-3" />
					</Button>
				</TooltipTrigger>
				<TooltipContent side="bottom">
					<p className="text-xs">Close vault</p>
				</TooltipContent>
			</Tooltip>

			<ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />

			<div className="flex items-center gap-1 overflow-x-auto">
				<span className="text-xs font-medium truncate">{rootPath}</span>
			</div>
		</div>
	);
}
