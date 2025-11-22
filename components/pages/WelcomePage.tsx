"use client";

import { open } from "@tauri-apps/plugin-dialog";
import {
	Folder,
	FolderOpen,
	FolderPlus,
	MessageSquare,
	Sparkles,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useProject } from "@/hooks/use-project";
import { useSettings } from "@/hooks/use-settings";
import { useChat } from "@/hooks/use-chat";
import { useTabs } from "@/hooks/use-tabs";
import { usePythonServer } from "@/hooks/use-python-server";
import { useLayout } from "@/hooks/use-layout";
import { ChatInterface } from "@/components/features/chat/ChatInterface";
import { cn } from "@/lib/utils";

export function WelcomePage() {
	const { openProject, createProject, recentProjects, openRecentProject, currentProjectPath } =
		useProject();
	const { settings } = useSettings();
	const { sessions, loadSessions, loadSessionHistory, createSession, setCurrentProjectPath } = useChat();
	const { addTab } = useTabs();
	const { isRunning: isServerRunning } = usePythonServer();
	const { setActiveView } = useLayout();
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	// Set current project path and load chat sessions when project path is available
	useEffect(() => {
		if (currentProjectPath) {
			setCurrentProjectPath(currentProjectPath);
			loadSessions();
		}
	}, [currentProjectPath, setCurrentProjectPath, loadSessions]);

	const handleOpenFolder = async () => {
		try {
			setIsLoading(true);
			const selected = await open({
				directory: true,
				multiple: false,
				title: "Select Project Folder",
			});

			if (selected) {
				await openProject(selected);
				toast.success("Project opened successfully");
			}
		} catch (error) {
			console.error("Error opening project:", error);
			const errorMessage =
				error instanceof Error ? error.message : "Failed to open project";
			setError(errorMessage);
		} finally {
			setIsLoading(false);
		}
	};

	const handleNewFolder = async () => {
		try {
			setIsLoading(true);
			const selected = await open({
				directory: true,
				multiple: false,
				title: "Select Empty Folder for New Project",
			});

			if (selected) {
				await createProject(selected);
				toast.success("Project created successfully");
			}
		} catch (error) {
			console.error("Error creating new project:", error);
			const errorMessage =
				error instanceof Error ? error.message : "Failed to create project";
			setError(errorMessage);
		} finally {
			setIsLoading(false);
		}
	};

	const handleOpenRecent = async (path: string) => {
		try {
			setIsLoading(true);
			await openRecentProject(path);
			toast.success("Project opened successfully");
		} catch (error) {
			console.error("Error opening recent project:", error);
			const errorMessage =
				error instanceof Error
					? error.message
					: "Failed to open recent project";
			setError(errorMessage);
		} finally {
			setIsLoading(false);
		}
	};

	const handleNewChat = async () => {
		if (!isServerRunning) {
			toast.error(
				"Python server is not running. Please start the server first.",
				{
					description:
						"Click the play button in the bottom left corner to start the server.",
				},
			);
			return;
		}

		try {
			setIsLoading(true);
			const sessionId = await createSession();
			if (sessionId) {
				// Create a tab for the chat
				addTab({
					title: "AI Chat",
					icon: "MessageSquare",
					content: <ChatInterface />,
					viewId: `chat-${sessionId}`,
				});
				// Switch to chat view
				setActiveView("chat");
			}
		} catch (error) {
			console.error("Error creating chat:", error);
			toast.error("Failed to create new chat session");
		} finally {
			setIsLoading(false);
		}
	};

	const handleOpenRecentChat = async (sessionId: string) => {

		try {
			setIsLoading(true);
			await loadSessionHistory(sessionId);
			// Create a tab for the chat
			addTab({
				title: "AI Chat",
				icon: "MessageSquare",
				content: <ChatInterface />,
				viewId: `chat-${sessionId}`,
			});
			// Switch to chat view
			setActiveView("chat");
		} catch (error) {
			console.error("Error opening chat:", error);
			toast.error("Failed to open chat session");
		} finally {
			setIsLoading(false);
		}
	};

	const formatDate = (dateStr: string) => {
		try {
			const date = new Date(dateStr);
			const now = new Date();
			const diffMs = now.getTime() - date.getTime();
			const diffMins = Math.floor(diffMs / 60000);
			const diffHours = Math.floor(diffMs / 3600000);
			const diffDays = Math.floor(diffMs / 86400000);

			if (diffMins < 1) return "Just now";
			if (diffMins < 60)
				return `${diffMins} min${
					diffMins > 1 ? "s" : ""
				} ago`.trim();
			if (diffHours < 24)
				return `${diffHours} hour${
					diffHours > 1 ? "s" : ""
				} ago`.trim();
			if (diffDays < 7)
				return `${diffDays} day${
					diffDays > 1 ? "s" : ""
				} ago`.trim();

			return date.toLocaleDateString();
		} catch {
			return dateStr;
		}
	};

	const getProjectName = (path: string) => {
		return path.split(/[\\/]/).pop() || path;
	};

	return (
		<>
			<div className="h-full flex items-center justify-center bg-background p-8">
				<div className="w-full max-w-4xl space-y-12">
					{/* Header */}
					<div className="text-center space-y-4">
						<div className="flex justify-center mb-6">
							<div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden border border-primary/10">
								<Image
									src="/icon.png"
									alt="FIRE Icon"
									width={56}
									height={56}
									className="object-contain"
								/>
							</div>
						</div>
						<h1 className="text-4xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
							{settings?.general.user_name
								? `Welcome ${settings.general.user_name}`
								: "Welcome to FIRE"}
						</h1>
						<p className="text-lg text-muted-foreground">
							Fast Interactive Research Environment
						</p>
					</div>

					{/* Action Cards */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<button
							type="button"
							onClick={handleOpenFolder}
							disabled={isLoading}
							className={cn(
								"group relative overflow-hidden rounded-2xl border-2 border-border/50 bg-card p-8 text-left transition-all",
								"hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1",
								"active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0",
							)}
						>
							<div className="relative z-10 space-y-4">
								<div className="h-14 w-14 rounded-xl bg-blue-500/10 flex items-center justify-center ring-1 ring-blue-500/20 group-hover:ring-blue-500/40 transition-all">
									<FolderOpen className="h-7 w-7 text-blue-500" />
								</div>
								<div>
									<h3 className="text-xl font-semibold mb-2">Open Folder</h3>
									<p className="text-sm text-muted-foreground">
										Browse and open an existing project folder
									</p>
								</div>
							</div>
							<div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
						</button>

						<button
							type="button"
							onClick={handleNewFolder}
							disabled={isLoading}
							className={cn(
								"group relative overflow-hidden rounded-2xl border-2 border-border/50 bg-card p-8 text-left transition-all",
								"hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1",
								"active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0",
							)}
						>
							<div className="relative z-10 space-y-4">
								<div className="h-14 w-14 rounded-xl bg-green-500/10 flex items-center justify-center ring-1 ring-green-500/20 group-hover:ring-green-500/40 transition-all">
									<FolderPlus className="h-7 w-7 text-green-500" />
								</div>
								<div>
									<h3 className="text-xl font-semibold mb-2">New Folder</h3>
									<p className="text-sm text-muted-foreground">
										Create a new project in an empty folder
									</p>
								</div>
							</div>
							<div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
						</button>

						<button
							type="button"
							onClick={handleNewChat}
							disabled={isLoading}
							className={cn(
								"group relative overflow-hidden rounded-2xl border-2 border-border/50 bg-card p-8 text-left transition-all",
								"hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1",
								"active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0",
							)}
						>
							<div className="relative z-10 space-y-4">
								<div className="h-14 w-14 rounded-xl bg-purple-500/10 flex items-center justify-center ring-1 ring-purple-500/20 group-hover:ring-purple-500/40 transition-all">
									<Sparkles className="h-7 w-7 text-purple-500" />
								</div>
								<div>
									<h3 className="text-xl font-semibold mb-2">New Chat</h3>
									<p className="text-sm text-muted-foreground">
										Start a conversation with AI assistant
									</p>
								</div>
							</div>
							<div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
						</button>
					</div>

					{/* Recent Projects and Chats */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Recent Projects */}
						<div className="space-y-4">
							<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
								Recent Projects
							</h2>
							<div className="space-y-2">
								{recentProjects.length === 0 ? (
									<div className="p-8 text-center text-sm text-muted-foreground">
										<Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
										<p>No recent projects</p>
										<p className="text-xs mt-1">Open or create a project to get started</p>
									</div>
								) : (
									recentProjects.slice(0, 5).map((project) => (
										<button
											key={project.path}
											type="button"
											onClick={() => handleOpenRecent(project.path)}
											disabled={isLoading}
											className={cn(
												"w-full group flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card text-left transition-all",
												"hover:border-primary/30 hover:bg-accent/50 hover:shadow-md hover:-translate-y-0.5",
												"active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0",
											)}
										>
											<div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
												<Folder className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
											</div>
											<div className="flex-1 min-w-0">
												<p className="font-medium text-sm truncate">
													{getProjectName(project.path)}
												</p>
												<p className="text-xs text-muted-foreground truncate">
													{project.path}
												</p>
											</div>
											<div className="text-xs text-muted-foreground flex-shrink-0">
												{formatDate(project.last_accessed)}
											</div>
										</button>
									))
								)}
							</div>
						</div>

						{/* Recent Chats */}
						<div className="space-y-4">
							<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
								Recent Chats
							</h2>
							<div className="space-y-2">
								{sessions.length === 0 ? (
									<div className="p-8 text-center text-sm text-muted-foreground">
										<MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
										<p>No recent chats</p>
										<p className="text-xs mt-1">Start a new chat to get started</p>
									</div>
								) : (
									sessions.slice(0, 5).map((session) => (
										<button
											key={session.id}
											type="button"
											onClick={() => handleOpenRecentChat(session.id)}
											disabled={isLoading}
											className={cn(
												"w-full group flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card text-left transition-all",
												"hover:border-primary/30 hover:bg-accent/50 hover:shadow-md hover:-translate-y-0.5",
												"active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0",
											)}
										>
											<div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
												<MessageSquare className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
											</div>
											<div className="flex-1 min-w-0">
												<p className="font-medium text-sm truncate">
													Chat Session
												</p>
												<p className="text-xs text-muted-foreground truncate">
													{session.id.substring(0, 8)}...
												</p>
											</div>
											<div className="text-xs text-muted-foreground flex-shrink-0">
												{formatDate(session.created_at)}
											</div>
										</button>
									))
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Error Dialog */}
			<AlertDialog open={!!error} onOpenChange={() => setError(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Error</AlertDialogTitle>
						<AlertDialogDescription>{error}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<Button onClick={() => setError(null)}>OK</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
