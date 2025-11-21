"use client";

import "@/styles/globals.css";
import type * as React from "react";
import { useEffect, useRef, useState } from "react";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { ActivityBar } from "@/components/layout/ActivityBar";
import { PrimarySideBar } from "@/components/layout/PrimarySideBar";
import { SecondarySideBar } from "@/components/layout/SecondarySideBar";
import { StatusBar } from "@/components/layout/StatusBar";
import { TitleBar } from "@/components/layout/TitleBar";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSidebar } from "@/hooks/use-sidebar";

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const [isTauri, setIsTauri] = useState(false);
	const {
		isLeftSidebarOpen,
		isRightSidebarOpen,
		leftSize,
		rightSize,
		setLeftSize,
		setRightSize,
		setLeftOpen,
		setRightOpen,
		lastNonZeroLeftSize,
		lastNonZeroRightSize,
	} = useSidebar();

	const leftRef = useRef<
		ImperativePanelHandle & { resize?: (size: number) => void }
	>(null);
	const rightRef = useRef<
		ImperativePanelHandle & { resize?: (size: number) => void }
	>(null);

	useEffect(() => {
		setIsTauri(typeof window !== "undefined" && window.isTauri);
	}, []);

	// Apply collapse/expand imperatively when state changes
	useEffect(() => {
		if (!leftRef.current) return;
		if (isLeftSidebarOpen) {
			leftRef.current.expand();
			// restore last non-zero size when opening
			try {
				leftRef.current.resize?.(lastNonZeroLeftSize);
			} catch (_) {}
		} else {
			leftRef.current.collapse();
		}
	}, [isLeftSidebarOpen, lastNonZeroLeftSize]);

	useEffect(() => {
		if (!rightRef.current) return;
		if (isRightSidebarOpen) {
			rightRef.current.expand();
			try {
				rightRef.current.resize?.(lastNonZeroRightSize);
			} catch (_) {}
		} else {
			rightRef.current.collapse();
		}
	}, [isRightSidebarOpen, lastNonZeroRightSize]);

	return (
		<html lang="en" suppressHydrationWarning>
			<body className="overflow-hidden">
				<ThemeProvider
					attribute="class"
					defaultTheme="dark"
					enableSystem
					disableTransitionOnChange
				>
					<TooltipProvider>
						<div className="h-screen flex flex-col bg-background">
							{isTauri && <TitleBar />}
							<div className="flex flex-1 overflow-hidden">
								<ActivityBar />
								<ResizablePanelGroup direction="horizontal" className="flex-1">
									{/* Left Sidebar Panel (always mounted) */}
									<ResizablePanel
										ref={leftRef}
										id="primary-sidebar"
										defaultSize={leftSize}
										minSize={10}
										maxSize={40}
										collapsible
										collapsedSize={0}
										onResize={(size) => {
											setLeftSize(size);
											if (size <= 0.5) setLeftOpen(false);
											else setLeftOpen(true);
										}}
										className="data-[collapsed=true]:pointer-events-none"
									>
										{isLeftSidebarOpen && <PrimarySideBar />}
									</ResizablePanel>
									<ResizableHandle withHandle />
									{/* Main Content */}
									<ResizablePanel
										id="main-content"
										defaultSize={100 - (leftSize + rightSize)}
										minSize={30}
									>
										<main className="h-full overflow-auto bg-background">
											{children}
										</main>
									</ResizablePanel>
									<ResizableHandle withHandle />
									{/* Right Sidebar Panel (always mounted) */}
									<ResizablePanel
										ref={rightRef}
										id="secondary-sidebar"
										defaultSize={rightSize}
										minSize={10}
										maxSize={45}
										collapsible
										collapsedSize={0}
										onResize={(size) => {
											setRightSize(size);
											if (size <= 0.5) setRightOpen(false);
											else setRightOpen(true);
										}}
										className="data-[collapsed=true]:pointer-events-none"
									>
										{isRightSidebarOpen && <SecondarySideBar />}
									</ResizablePanel>
								</ResizablePanelGroup>
							</div>
							<StatusBar />
						</div>
					</TooltipProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
