"use client";

import { useEffect } from "react";
import { useProject } from "@/hooks/use-project";
import { useChat } from "@/hooks/use-chat";

/**
 * Provider component that synchronizes project path with chat store
 * Sessions are loaded lazily when the user opens the chat view
 */
export function ChatProvider({ children }: { children: React.ReactNode }) {
	const { currentProjectPath } = useProject();
	const { setCurrentProjectPath } = useChat();

	// Only sync project path, don't auto-load sessions
	useEffect(() => {
		setCurrentProjectPath(currentProjectPath);
	}, [currentProjectPath, setCurrentProjectPath]);

	return <>{children}</>;
}
