"use client";

import "@/styles/globals.css";
import type * as React from "react";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useWindowState } from "@/hooks/use-window-state";

function SettingsContent({ children }: { children: React.ReactNode }) {
	// Initialize window state management for settings window
	useWindowState("settings");

	return <TooltipProvider>{children}</TooltipProvider>;
}

export default function SettingsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className="overflow-hidden">
				<ThemeProvider
					attribute="class"
					defaultTheme="dark"
					enableSystem
					disableTransitionOnChange
				>
					<SettingsContent>{children}</SettingsContent>
				</ThemeProvider>
			</body>
		</html>
	);
}
