"use client";

import "@/styles/globals.css";
import type * as React from "react";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";

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
					<TooltipProvider>{children}</TooltipProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}

