"use client";

import { Settings, HelpCircle } from "lucide-react";
import { createChildWindow } from "@/lib/window";
import { Button } from "@/components/ui/button";

/**
 * Example component showing how to use child dialog windows
 * This can be added to any part of your application
 */
export function WindowDemoButtons() {
	const handleOpenSettings = async () => {
		try {
			await createChildWindow({
				label: "settings",
				title: "Settings",
				url: "/settings",
				width: 700,
				height: 500,
			});
		} catch (error) {
			console.error("Failed to open settings:", error);
		}
	};

	const handleOpenDemo = async () => {
		try {
			await createChildWindow({
				label: "window-demo",
				title: "Window Demo",
				url: "/window-demo",
				width: 800,
				height: 600,
			});
		} catch (error) {
			console.error("Failed to open demo:", error);
		}
	};

	return (
		<div className="flex items-center gap-2">
			<Button
				variant="outline"
				size="sm"
				onClick={handleOpenSettings}
				className="gap-2"
			>
				<Settings className="h-4 w-4" />
				Settings
			</Button>
			<Button
				variant="outline"
				size="sm"
				onClick={handleOpenDemo}
				className="gap-2"
			>
				<HelpCircle className="h-4 w-4" />
				Window Demo
			</Button>
		</div>
	);
}

