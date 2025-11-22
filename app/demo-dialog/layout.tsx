"use client";

import "@/styles/globals.css";
import type * as React from "react";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ThemeSyncProvider } from "@/components/providers/ThemeSyncProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useWindowState } from "@/hooks/use-window-state";

function DemoDialogContent({ children }: { children: React.ReactNode }) {
	// Initialize window state management for demo-dialog window
	useWindowState("demo-dialog");

	return <TooltipProvider>{children}</TooltipProvider>;
}

export default function DemoDialogLayout({
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
					<ThemeSyncProvider>
						<DemoDialogContent>{children}</DemoDialogContent>
					</ThemeSyncProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
