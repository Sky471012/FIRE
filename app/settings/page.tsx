"use client";

import { ChildWindowControls } from "@/components/features/window/ChildWindowControls";

export default function SettingsPage() {
	return (
		<div className="flex flex-col h-screen bg-background">
			{/* Title Bar for Child Window */}
			<div
				data-tauri-drag-region
				className="flex items-center justify-between h-9 bg-accent/10 border-b border-border/50 px-3"
			>
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium">Settings</span>
				</div>
				<ChildWindowControls />
			</div>

			{/* Content */}
			<div className="flex-1 overflow-auto p-6">
				<div className="max-w-2xl mx-auto space-y-6">
					<div>
						<h1 className="text-2xl font-bold mb-2">Settings</h1>
						<p className="text-muted-foreground">
							Configure your application preferences
						</p>
					</div>

					{/* Settings Sections */}
					<div className="space-y-4">
						<section className="space-y-2">
							<h2 className="text-lg font-semibold">Appearance</h2>
							<div className="rounded-lg border border-border p-4 space-y-3">
								<div className="flex items-center justify-between">
									<label htmlFor="theme" className="text-sm font-medium">
										Theme
									</label>
									<select
										id="theme"
										className="px-3 py-1.5 rounded-md border border-input bg-background"
									>
										<option value="light">Light</option>
										<option value="dark">Dark</option>
										<option value="system">System</option>
									</select>
								</div>
								<div className="flex items-center justify-between">
									<label htmlFor="font-size" className="text-sm font-medium">
										Font Size
									</label>
									<select
										id="font-size"
										className="px-3 py-1.5 rounded-md border border-input bg-background"
									>
										<option value="small">Small</option>
										<option value="medium">Medium</option>
										<option value="large">Large</option>
									</select>
								</div>
							</div>
						</section>

						<section className="space-y-2">
							<h2 className="text-lg font-semibold">Editor</h2>
							<div className="rounded-lg border border-border p-4 space-y-3">
								<div className="flex items-center justify-between">
									<label htmlFor="tab-size" className="text-sm font-medium">
										Tab Size
									</label>
									<input
										id="tab-size"
										type="number"
										min="2"
										max="8"
										defaultValue="4"
										className="w-20 px-3 py-1.5 rounded-md border border-input bg-background"
									/>
								</div>
								<div className="flex items-center justify-between">
									<label htmlFor="auto-save" className="text-sm font-medium">
										Auto Save
									</label>
									<input
										id="auto-save"
										type="checkbox"
										className="h-4 w-4"
										defaultChecked
									/>
								</div>
							</div>
						</section>

						<section className="space-y-2">
							<h2 className="text-lg font-semibold">System</h2>
							<div className="rounded-lg border border-border p-4 space-y-3">
								<div className="flex items-center justify-between">
									<label htmlFor="startup" className="text-sm font-medium">
										Open at Startup
									</label>
									<input id="startup" type="checkbox" className="h-4 w-4" />
								</div>
								<div className="flex items-center justify-between">
									<label htmlFor="updates" className="text-sm font-medium">
										Check for Updates
									</label>
									<input
										id="updates"
										type="checkbox"
										className="h-4 w-4"
										defaultChecked
									/>
								</div>
							</div>
						</section>
					</div>

					{/* Action Buttons */}
					<div className="flex justify-end gap-3 pt-4 border-t border-border">
						<button
							type="button"
							className="px-4 py-2 rounded-md border border-input hover:bg-accent"
						>
							Reset to Defaults
						</button>
						<button
							type="button"
							className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
						>
							Save Changes
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
