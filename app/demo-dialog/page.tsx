"use client";

import { ChildWindowControls } from "@/components/features/window/ChildWindowControls";

export default function DemoDialogPage() {
	return (
		<div className="flex flex-col h-screen bg-background">
			{/* Title Bar for Child Window */}
			<div
				data-tauri-drag-region
				className="flex items-center justify-between h-9 bg-accent/10 border-b border-border/50 px-3"
			>
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium">Custom Dialog</span>
				</div>
				<ChildWindowControls />
			</div>

			{/* Content */}
			<div className="flex-1 overflow-auto p-6">
				<div className="max-w-md mx-auto space-y-6">
					<div>
						<h1 className="text-2xl font-bold mb-2">Custom Dialog</h1>
						<p className="text-muted-foreground">
							This is a custom modal dialog window
						</p>
					</div>

					<div className="rounded-lg border border-border p-4 space-y-3">
						<p className="text-sm">
							This dialog window demonstrates the following behaviors:
						</p>
						<ul className="text-sm space-y-2 list-disc list-inside text-muted-foreground">
							<li>The parent window is locked while this dialog is open</li>
							<li>Only the close button (X) is available</li>
							<li>This window stays on top of its parent</li>
							<li>Try minimizing the parent - this window minimizes too</li>
							<li>This window is hidden from the taskbar</li>
						</ul>
					</div>

					<div className="rounded-lg border border-border bg-accent/10 p-4">
						<h3 className="font-medium mb-2">💡 Tip</h3>
						<p className="text-sm text-muted-foreground">
							Click the X button above to close this dialog and return to the
							parent window.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
