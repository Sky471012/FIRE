"use client";

import { ChevronRight, FileText, Folder } from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export function PrimarySideBar() {
	const [expandedFolders, setExpandedFolders] = useState<string[]>(["root"]);

	const toggleFolder = (folderId: string) => {
		setExpandedFolders((prev) =>
			prev.includes(folderId)
				? prev.filter((id) => id !== folderId)
				: [...prev, folderId],
		);
	};

	return (
		<div className="h-full bg-background border-r border-border flex flex-col">
			{/* Header */}
			<div className="px-4 py-2 border-b border-border">
				<h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					Explorer
				</h2>
			</div>

			{/* Content */}
			<ScrollArea className="flex-1">
				<div className="p-2">
					{/* Sample folder structure */}
					<div className="space-y-0.5">
						<button
							type="button"
							onClick={() => toggleFolder("root")}
							className="w-full flex items-center gap-2 px-2 py-1 hover:bg-accent rounded transition-colors group"
						>
							<ChevronRight
								className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
									expandedFolders.includes("root") ? "rotate-90" : ""
								}`}
							/>
							<Folder className="h-4 w-4 text-blue-500" />
							<span className="text-xs font-medium">My Datasets</span>
						</button>

						{expandedFolders.includes("root") && (
							<div className="ml-4 space-y-0.5">
								<button
									type="button"
									className="w-full flex items-center gap-2 px-2 py-1 hover:bg-accent rounded transition-colors group"
								>
									<FileText className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
									<span className="text-xs">climate_data.csv</span>
								</button>
								<button
									type="button"
									className="w-full flex items-center gap-2 px-2 py-1 hover:bg-accent rounded transition-colors group"
								>
									<FileText className="h-3.5 w-3.5 text-purple-600 dark:text-purple-500" />
									<span className="text-xs">emissions.xlsx</span>
								</button>
								<button
									type="button"
									onClick={() => toggleFolder("recent")}
									className="w-full flex items-center gap-2 px-2 py-1 hover:bg-accent rounded transition-colors group"
								>
									<ChevronRight
										className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
											expandedFolders.includes("recent") ? "rotate-90" : ""
										}`}
									/>
									<Folder className="h-4 w-4 text-orange-500" />
									<span className="text-xs">Recent Files</span>
								</button>
							</div>
						)}
					</div>

					<Separator className="my-2" />

					<div className="space-y-0.5">
						<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 py-1">
							Quick Access
						</h3>
						<button
							type="button"
							className="w-full flex items-center gap-2 px-2 py-1 hover:bg-accent rounded transition-colors text-left"
						>
							<span className="text-xs">📊 Dashboard</span>
						</button>
						<button
							type="button"
							className="w-full flex items-center gap-2 px-2 py-1 hover:bg-accent rounded transition-colors text-left"
						>
							<span className="text-xs">🔥 Active Projects</span>
						</button>
					</div>
				</div>
			</ScrollArea>
		</div>
	);
}
