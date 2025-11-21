"use client";

import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";

export function WindowControls() {
	const appWindow = getCurrentWindow();

	const handleMinimize = () => {
		appWindow.minimize();
	};

	const handleMaximize = () => {
		appWindow.toggleMaximize();
	};

	const handleClose = () => {
		appWindow.close();
	};

	return (
		<div className="flex items-center flex-shrink-0 border-l border-border/50">
			<button
				type="button"
				onClick={handleMinimize}
				className="h-9 w-11 hover:bg-accent/50 flex items-center justify-center transition-colors"
				aria-label="Minimize"
			>
				<Minus className="h-3.5 w-3.5" />
			</button>
			<button
				type="button"
				onClick={handleMaximize}
				className="h-9 w-11 hover:bg-accent/50 flex items-center justify-center transition-colors"
				aria-label="Maximize"
			>
				<Square className="h-3 w-3" />
			</button>
			<button
				type="button"
				onClick={handleClose}
				className="h-9 w-11 hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center transition-colors"
				aria-label="Close"
			>
				<X className="h-3.5 w-3.5" />
			</button>
		</div>
	);
}

