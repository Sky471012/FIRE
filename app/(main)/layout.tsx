"use client";

import type * as React from "react";
import { useEffect, useRef, useState } from "react";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { ActivityBar } from "@/components/layout/ActivityBar";
import { PrimarySideBar } from "@/components/layout/PrimarySideBar";
import { SecondarySideBar } from "@/components/layout/SecondarySideBar";
import { StatusBar } from "@/components/layout/StatusBar";
import { TitleBar } from "@/components/layout/TitleBar";
import { ChatProvider } from "@/components/providers/ChatProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ThemeSyncProvider } from "@/components/providers/ThemeSyncProvider";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSidebar } from "@/hooks/use-sidebar";
import { useWindowState } from "@/hooks/use-window-state";

export default function MainLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const [isMounted, setIsMounted] = useState(false);
	const [isTauri, setIsTauri] = useState(false);

	// Prevent hydration mismatch by only rendering after mount
	useEffect(() => {
		setIsMounted(true);
		setIsTauri(typeof window !== "undefined" && window.isTauri);
	}, []);

	if (!isMounted) {
		// Return null during SSR to prevent hydration mismatch
		return null;
	}

	return <MainLayoutContent isTauri={isTauri}>{children}</MainLayoutContent>;
}

function MainLayoutContent({
	children,
	isTauri,
}: {
	children: React.ReactNode;
	isTauri: boolean;
}) {
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

	// Initialize window state management for main window
	useWindowState("main");

	const leftRef = useRef<
		ImperativePanelHandle & { resize?: (size: number) => void }
	>(null);
	const rightRef = useRef<
		ImperativePanelHandle & { resize?: (size: number) => void }
	>(null);

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
		<ThemeProvider
			attribute="class"
			defaultTheme="dark"
			enableSystem
			disableTransitionOnChange
		>
			<ThemeSyncProvider>
				<ChatProvider>
					<TooltipProvider>
						<div className="h-screen flex flex-col bg-background">
							{isTauri && <TitleBar />}
							<div className="flex flex-1 overflow-hidden">
								<ActivityBar />
								<ResizablePanelGroup direction="horizontal" className="flex-1">
									{/* Left Sidebar Panel */}
									{isLeftSidebarOpen && (
										<>
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
													// close/open based on whether we've resized to 0
													setLeftOpen(size > 0);
												}}
											>
												<PrimarySideBar />
											</ResizablePanel>

											<ResizableHandle withHandle />
										</>
									)}

									{/* Main Content Panel */}
									<ResizablePanel
										id="content"
										defaultSize={100 - leftSize - rightSize}
										minSize={30}
									>
										<main className="h-full overflow-hidden">{children}</main>
									</ResizablePanel>

									{/* Right Sidebar Panel */}
									{isRightSidebarOpen && (
										<>
											<ResizableHandle withHandle />

											<ResizablePanel
												ref={rightRef}
												id="secondary-sidebar"
												defaultSize={rightSize}
												minSize={10}
												maxSize={40}
												collapsible
												collapsedSize={0}
												onResize={(size) => {
													setRightSize(size);
													setRightOpen(size > 0);
												}}
											>
												<SecondarySideBar />
											</ResizablePanel>
										</>
									)}
								</ResizablePanelGroup>
							</div>
							<StatusBar />
						</div>
						<Toaster />
					</TooltipProvider>
				</ChatProvider>
			</ThemeSyncProvider>
		</ThemeProvider>
	);
}
