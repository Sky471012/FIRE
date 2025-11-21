"use client";

import { X, Minus, Square } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export function TitleBar() {
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
		<div
			data-tauri-drag-region
			className="h-8 bg-background border-b border-border flex items-center justify-between px-2 select-none"
		>
			<div className="flex items-center gap-2 text-sm font-medium">
				<span className="text-foreground">FIRE</span>
			</div>
			<div className="flex items-center">
				<button
					type="button"
					onClick={handleMinimize}
					className="h-8 w-12 hover:bg-accent flex items-center justify-center transition-colors"
					aria-label="Minimize"
				>
					<Minus className="h-4 w-4" />
				</button>
				<button
					type="button"
					onClick={handleMaximize}
					className="h-8 w-12 hover:bg-accent flex items-center justify-center transition-colors"
					aria-label="Maximize"
				>
					<Square className="h-3 w-3" />
				</button>
				<button
					type="button"
					onClick={handleClose}
					className="h-8 w-12 hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center transition-colors"
					aria-label="Close"
				>
					<X className="h-4 w-4" />
				</button>
			</div>
		</div>
	);
}

