"use client";

import { X } from "lucide-react";
import { closeCurrentWindow } from "@/lib/window";

export function ChildWindowControls() {
	const handleClose = async () => {
		await closeCurrentWindow();
	};

	return (
		<div className="flex items-center flex-shrink-0">
			<button
				type="button"
				onClick={handleClose}
				className="h-9 w-9 hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center transition-colors border-l border-border/50"
				aria-label="Close"
			>
				<X className="h-3.5 w-3.5" />
			</button>
		</div>
	);
}
