"use client";

import { useState } from "react";
import { createChildWindow, openSettingsDialog } from "@/lib/window";

export default function WindowDemoPage() {
	const [status, setStatus] = useState<string>("");

	const handleOpenSettings = async () => {
		try {
			setStatus("Opening settings...");
			await openSettingsDialog();
			setStatus("Settings window opened!");
		} catch (error) {
			setStatus(`Error: ${error}`);
			console.error("Failed to open settings:", error);
		}
	};

	const handleOpenCustom = async () => {
		try {
			setStatus("Opening custom dialog...");
			await createChildWindow({
				label: "custom-dialog",
				title: "Custom Dialog",
				url: "/demo-dialog",
				width: 500,
				height: 350,
			});
			setStatus("Custom dialog opened!");
		} catch (error) {
			setStatus(`Error: ${error}`);
			console.error("Failed to open custom dialog:", error);
		}
	};

	return (
		<div className="flex flex-col h-screen bg-background">
			{/* Content */}
			<div className="flex-1 overflow-auto p-8">
				<div className="max-w-3xl mx-auto space-y-8">
					<div>
						<h1 className="text-3xl font-bold mb-2">
							Child Dialog Window Demo
						</h1>
						<p className="text-muted-foreground">
							Demonstrates modal child windows with parent locking behavior
						</p>
					</div>

					{/* Feature Overview */}
					<section className="space-y-4">
						<h2 className="text-xl font-semibold">Features</h2>
						<div className="grid gap-3">
							<div className="rounded-lg border border-border p-4">
								<h3 className="font-medium mb-1">🔒 Modal Behavior</h3>
								<p className="text-sm text-muted-foreground">
									Child window locks its parent - you cannot interact with the
									parent until the child is closed
								</p>
							</div>
							<div className="rounded-lg border border-border p-4">
								<h3 className="font-medium mb-1">🎯 Close Button Only</h3>
								<p className="text-sm text-muted-foreground">
									Child windows have only a close button, no minimize or
									maximize
								</p>
							</div>
							<div className="rounded-lg border border-border p-4">
								<h3 className="font-medium mb-1">🔗 Synchronized Movement</h3>
								<p className="text-sm text-muted-foreground">
									When parent minimizes or moves, the child follows
									automatically
								</p>
							</div>
							<div className="rounded-lg border border-border p-4">
								<h3 className="font-medium mb-1">🚫 Hidden from Taskbar</h3>
								<p className="text-sm text-muted-foreground">
									Child windows don't clutter the taskbar
								</p>
							</div>
						</div>
					</section>

					{/* Examples */}
					<section className="space-y-4">
						<h2 className="text-xl font-semibold">Try It Out</h2>
						<div className="space-y-3">
							<div className="rounded-lg border border-border p-4">
								<h3 className="font-medium mb-2">Settings Dialog</h3>
								<p className="text-sm text-muted-foreground mb-3">
									Open a settings dialog window. Notice that you cannot interact
									with this window until you close the settings.
								</p>
								<button
									type="button"
									onClick={handleOpenSettings}
									className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
								>
									Open Settings
								</button>
							</div>

							<div className="rounded-lg border border-border p-4">
								<h3 className="font-medium mb-2">Custom Dialog</h3>
								<p className="text-sm text-muted-foreground mb-3">
									Open a custom dialog window with different dimensions.
								</p>
								<button
									type="button"
									onClick={handleOpenCustom}
									className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80"
								>
									Open Custom Dialog
								</button>
							</div>
						</div>
					</section>

					{/* Code Example */}
					<section className="space-y-4">
						<h2 className="text-xl font-semibold">Usage Example</h2>
						<div className="rounded-lg bg-muted p-4 overflow-x-auto">
							<pre className="text-sm">
								<code>{`import { createChildWindow } from '@/lib/window';

// Open a child dialog window
await createChildWindow({
  label: 'settings',
  title: 'Settings',
  url: '/settings',
  width: 600,
  height: 400
});

// Or use the convenience function
import { openSettingsDialog } from '@/lib/window';
await openSettingsDialog();`}</code>
							</pre>
						</div>
					</section>

					{/* Status */}
					{status && (
						<div className="rounded-lg border border-border bg-accent/10 p-3">
							<p className="text-sm font-medium">Status: {status}</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
