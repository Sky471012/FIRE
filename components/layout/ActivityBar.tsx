"use client";

import { Files, Search, GitBranch, Settings } from "lucide-react";

export function ActivityBar() {
	return (
		<div className="w-12 bg-secondary border-r border-border flex flex-col items-center py-2 gap-4">
			<button
				type="button"
				className="h-10 w-10 flex items-center justify-center hover:bg-accent rounded transition-colors"
				aria-label="Explorer"
			>
				<Files className="h-5 w-5" />
			</button>
			<button
				type="button"
				className="h-10 w-10 flex items-center justify-center hover:bg-accent rounded transition-colors"
				aria-label="Search"
			>
				<Search className="h-5 w-5" />
			</button>
			<button
				type="button"
				className="h-10 w-10 flex items-center justify-center hover:bg-accent rounded transition-colors"
				aria-label="Source Control"
			>
				<GitBranch className="h-5 w-5" />
			</button>
			<div className="flex-1" />
			<button
				type="button"
				className="h-10 w-10 flex items-center justify-center hover:bg-accent rounded transition-colors"
				aria-label="Settings"
			>
				<Settings className="h-5 w-5" />
			</button>
		</div>
	);
}

