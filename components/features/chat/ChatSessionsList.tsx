"use client";

import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat, type ChatSession } from "@/hooks/use-chat";
import { useLayout } from "@/hooks/use-layout";
import { useTabs } from "@/hooks/use-tabs";
import { cn } from "@/lib/utils";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
import { ChatInterface } from "./ChatInterface";

export function ChatSessionsList() {
	const {
		sessions,
		currentSessionId,
		isLoading,
		createSession,
		loadSessionHistory,
		deleteSession,
		loadSessions,
		error,
	} = useChat();
	const { activeView, setActiveView } = useLayout();
	const { addTab } = useTabs();
	const [deletingSessionId, setDeletingSessionId] = useState<string | null>(
		null,
	);

	// Load sessions when component mounts
	useEffect(() => {
		loadSessions();
	}, [loadSessions]);

	const handleCreateSession = async () => {
		await createSession();
		// Wait a moment for currentSessionId to be set
		await new Promise((resolve) => setTimeout(resolve, 100));
		// Create a tab for the chat with sessionId as identifier
		if (currentSessionId) {
			addTab({
				title: "AI Chat",
				icon: "MessageSquare",
				content: <ChatInterface />,
				viewId: `chat-${currentSessionId}`, // Use unique identifier
			});
		}
		// Ensure we're on the chat view
		if (activeView !== "chat") {
			setActiveView("chat");
		}
	};

	const handleSelectSession = async (sessionId: string) => {
		console.log("[ChatSessionsList] Selecting session:", sessionId);
		await loadSessionHistory(sessionId);
		// Create a tab for the chat with sessionId as identifier
		addTab({
			title: "AI Chat",
			icon: "MessageSquare",
			content: <ChatInterface />,
			viewId: `chat-${sessionId}`, // Use unique identifier to prevent duplicates
		});
		// Ensure we're on the chat view after loading the session
		if (activeView !== "chat") {
			console.log("[ChatSessionsList] Switching to chat view");
			setActiveView("chat");
		}
	};

	const handleDeleteSession = async (sessionId: string) => {
		setDeletingSessionId(sessionId);
		await deleteSession(sessionId);
		setDeletingSessionId(null);
	};

	return (
		<div className="h-full flex flex-col bg-background">
			{/* Header with New Session Button */}
			<div className="px-3 py-3 border-b border-border flex items-center justify-between bg-muted/30">
				<h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					Chat Sessions
				</h2>
				<Button
					size="sm"
					variant="ghost"
					className="h-7 w-7 p-0 hover:bg-accent"
					onClick={handleCreateSession}
					disabled={isLoading}
					title="New Chat Session"
				>
					{isLoading ? (
						<Spinner className="h-4 w-4" />
					) : (
						<Plus className="h-4 w-4" />
					)}
				</Button>
			</div>

			{/* Error Display */}
			{error && (
				<div className="px-3 py-2 text-xs text-destructive bg-destructive/10 border-b border-destructive/30">
					{error}
				</div>
			)}

			{/* Sessions List */}
			<ScrollArea className="flex-1">
				<div className="p-2 space-y-1">
					{sessions.length === 0 ? (
						<div className="px-4 py-12 text-center">
							<div className="mb-3 p-3 rounded-full bg-muted/50 inline-flex">
								<MessageSquare className="h-6 w-6 text-muted-foreground" />
							</div>
							<p className="text-xs text-muted-foreground font-medium mb-1">
								No chat sessions yet
							</p>
							<p className="text-[10px] text-muted-foreground/70">
								Click + to start a new chat
							</p>
						</div>
					) : (
						sessions.map((session: ChatSession) => (
							<div
								key={session.id}
								className={cn(
									"group flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all",
									"hover:bg-accent/50",
									currentSessionId === session.id
										? "bg-accent text-accent-foreground shadow-sm"
										: "text-muted-foreground hover:text-foreground",
								)}
								onClick={() => handleSelectSession(session.id)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										handleSelectSession(session.id);
									}
								}}
							>
								<div
									className={cn(
										"flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center mt-0.5",
										currentSessionId === session.id
											? "bg-primary/20"
											: "bg-muted",
									)}
								>
									<MessageSquare className="h-3.5 w-3.5" />
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-xs font-medium truncate mb-0.5">
										Chat Session
									</p>
									<p className="text-[10px] opacity-60 truncate">
										{formatDistanceToNow(new Date(session.created_at), {
											addSuffix: true,
										})}
									</p>
								</div>
								<AlertDialog>
									<AlertDialogTrigger asChild>
										<Button
											size="sm"
											variant="ghost"
											className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/20 hover:text-destructive flex-shrink-0"
											onClick={(e: React.MouseEvent) => e.stopPropagation()}
											disabled={deletingSessionId === session.id}
										>
											{deletingSessionId === session.id ? (
												<Spinner className="h-3 w-3" />
											) : (
												<Trash2 className="h-3 w-3" />
											)}
										</Button>
									</AlertDialogTrigger>
									<AlertDialogContent
										onClick={(e: React.MouseEvent) => e.stopPropagation()}
									>
										<AlertDialogHeader>
											<AlertDialogTitle>Delete Chat Session</AlertDialogTitle>
											<AlertDialogDescription>
												Are you sure you want to delete this chat session?
												This action cannot be undone.
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel>Cancel</AlertDialogCancel>
											<AlertDialogAction
												onClick={(e: React.MouseEvent) => {
													e.stopPropagation();
													handleDeleteSession(session.id);
												}}
											>
												Delete
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							</div>
						))
					)}
				</div>
			</ScrollArea>
		</div>
	);
}
