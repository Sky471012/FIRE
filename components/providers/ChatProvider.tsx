"use client";

import { useEffect } from "react";
import { useProject } from "@/hooks/use-project";
import { useChat } from "@/hooks/use-chat";

/**
 * Provider component that synchronizes project path with chat store
 */
export function ChatProvider({ children }: { children: React.ReactNode }) {
	const { currentProjectPath } = useProject();
	const { setCurrentProjectPath, loadSessions } = useChat();

	// Sync project path and load sessions when project changes
	useEffect(() => {
		setCurrentProjectPath(currentProjectPath);
		if (currentProjectPath) {
			loadSessions();
		}
	}, [currentProjectPath, setCurrentProjectPath, loadSessions]);

	return <>{children}</>;
}
