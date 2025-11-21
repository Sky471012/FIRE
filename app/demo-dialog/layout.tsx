"use client";

import "@/styles/globals.css";
import type * as React from "react";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
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
					<DemoDialogContent>{children}</DemoDialogContent>
				</ThemeProvider>
			</body>
		</html>
	);
}

