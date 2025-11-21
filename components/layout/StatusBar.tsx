"use client";

export function StatusBar() {
	return (
		<div className="h-6 bg-primary text-primary-foreground border-t border-border flex items-center justify-between px-2 text-xs">
			<div className="flex items-center gap-4">
				<span>Ready</span>
			</div>
			<div className="flex items-center gap-4">
				<span>UTF-8</span>
				<span>LF</span>
			</div>
		</div>
	);
}

