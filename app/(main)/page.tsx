"use client";

import { TabContent } from "@/components/features/tabs/TabContent";
import { ChatInterface } from "@/components/features/chat/ChatInterface";
import { useLayout } from "@/hooks/use-layout";

export default function Home() {
	const { activeView } = useLayout();

	// Show chat interface when chat view is active
	if (activeView === "chat") {
		return <ChatInterface />;
	}

	// Default to tab content for other views
	return <TabContent />;
}
