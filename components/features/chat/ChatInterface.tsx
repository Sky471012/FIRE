"use client";

import {
	Loader2,
	MessageSquare,
	PlayCircle,
	Send,
	Sparkles,
	User,
	Bot,
	Wrench,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { type ChatMessage, useChat } from "@/hooks/use-chat";
import { usePythonServer } from "@/hooks/use-python-server";
import { cn } from "@/lib/utils";
import { MessageWithVisualization } from "./MessageWithVisualization";

export function ChatInterface() {
	const {
		currentSessionId,
		messages,
		isLoading,
		isSending,
		isStreaming,
		streamingContent,
		currentTool,
		sendMessage,
		createSession,
		error,
		clearError,
		serverRequired,
		currentProjectPath,
	} = useChat();
	const {
		isRunning: isServerRunning,
		startServer,
		isLoading: isServerLoading,
	} = usePythonServer();

	const [inputMessage, setInputMessage] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// Auto-scroll to bottom when new messages arrive or streaming content updates
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, isSending, streamingContent]);

	const handleSend = async () => {
		if (!inputMessage.trim() || isSending) return;

		const message = inputMessage.trim();
		setInputMessage("");

		// Create a session if one doesn't exist
		if (!currentSessionId) {
			await createSession();
		}

		await sendMessage(message);

		// Focus back on textarea
		textareaRef.current?.focus();
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	// Show loading state while loading session
	if (isLoading && !currentSessionId) {
		return (
			<div className="h-full flex items-center justify-center">
				<div className="text-center space-y-4 max-w-md px-8">
					<Loader2 className="h-16 w-16 mx-auto text-muted-foreground animate-spin" />
					<p className="text-sm text-muted-foreground">Loading session...</p>
				</div>
			</div>
		);
	}

	// Show prompt to create session if none exists
	if (!currentSessionId) {
		return (
			<div className="h-full flex items-center justify-center">
				<div className="text-center space-y-4 max-w-md px-8">
					<MessageSquare className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
					<div>
						<h3 className="text-lg font-semibold mb-2">
							No Chat Session Selected
						</h3>
						<p className="text-sm text-muted-foreground mb-4">
							Create a new chat session to start asking questions about your
							data.
						</p>
						<Button onClick={createSession}>
							<MessageSquare className="h-4 w-4 mr-2" />
							Start New Chat
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col bg-background">
			{/* Error Banner */}
			{error && (
				<div className="px-4 py-2.5 bg-destructive/10 border-b border-destructive/30 flex items-center justify-between">
					<span className="text-xs text-destructive">{error}</span>
					<Button
						variant="ghost"
						size="sm"
						onClick={clearError}
						className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/20"
					>
						Dismiss
					</Button>
				</div>
			)}

			{/* Messages Area */}
			<div className="flex-1 overflow-hidden">
				<ScrollArea className="h-full">
					<div className="px-4 py-6 space-y-6 max-w-5xl mx-auto">
						{messages.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in-0 slide-in-from-bottom-8 duration-700">
								<div className="mb-8 p-6 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 shadow-lg">
									<Sparkles className="h-12 w-12 text-primary animate-pulse" />
								</div>
								<h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
									Start a Conversation
								</h3>
								<p className="text-sm text-muted-foreground max-w-md mb-8 leading-relaxed">
									Ask questions about your data, request visualizations, or
									explore insights using AI-powered analysis.
								</p>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full px-4">
									<div className="p-4 rounded-xl bg-card border border-border/50 hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer group">
										<div className="flex items-start gap-3">
											<div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
												<MessageSquare className="h-4 w-4 text-primary" />
											</div>
											<div className="text-left">
												<p className="text-xs font-medium mb-1">Data Analysis</p>
												<p className="text-[10px] text-muted-foreground">Explore patterns and trends</p>
											</div>
										</div>
									</div>
									<div className="p-4 rounded-xl bg-card border border-border/50 hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer group">
										<div className="flex items-start gap-3">
											<div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
												<Sparkles className="h-4 w-4 text-primary" />
											</div>
											<div className="text-left">
												<p className="text-xs font-medium mb-1">Visualizations</p>
												<p className="text-[10px] text-muted-foreground">Create charts and graphs</p>
											</div>
										</div>
									</div>
								</div>
							</div>
						) : (
							<>
								{messages.map((message: ChatMessage, index: number) => (
									<div
										key={`${message.role}-${index}`}
										className={cn(
											"flex gap-4 group animate-in fade-in-0 slide-in-from-bottom-4 duration-500",
											message.role === "user" ? "justify-end" : "justify-start",
										)}
									>
										{/* Avatar for assistant messages */}
										{message.role === "assistant" && (
											<div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
												<Bot className="h-4 w-4 text-primary" />
											</div>
										)}

										<div
											className={cn(
												"flex flex-col gap-2 max-w-[80%]",
												message.role === "user" && "items-end",
											)}
										>
											<div
												className={cn(
													"rounded-2xl px-5 py-4 shadow-sm transition-all duration-200",
													message.role === "user"
														? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground"
														: "bg-card border border-border/50 hover:border-border hover:shadow-md",
												)}
											>
												<div className={cn(
													"text-sm leading-relaxed",
													message.role === "assistant" && "text-foreground"
												)}>
													<MessageWithVisualization
														content={message.content}
														projectPath={currentProjectPath}
														isUserMessage={message.role === "user"}
													/>
												</div>
											</div>
											{message.created_at && (
												<span
													className={cn(
														"text-[10px] text-muted-foreground px-2 flex items-center gap-1",
														message.role === "user" && "flex-row-reverse"
													)}
												>
													{message.role === "user" && (
														<User className="h-3 w-3" />
													)}
													{new Date(message.created_at).toLocaleTimeString([], {
														hour: "2-digit",
														minute: "2-digit",
													})}
												</span>
											)}
										</div>

										{/* Avatar for user messages */}
										{message.role === "user" && (
											<div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
												<User className="h-4 w-4 text-primary" />
											</div>
										)}
									</div>
								))}
								{/* Streaming message bubble - shows while AI is generating response */}
								{isStreaming && (
									<div className="flex gap-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
										<div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
											<Bot className="h-4 w-4 text-primary" />
										</div>
										<div className="flex flex-col gap-2 max-w-[80%]">
											<div className="rounded-2xl px-5 py-4 bg-card border border-border/50 shadow-sm">
												{currentTool && (
													<div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 pb-2 border-b border-border/30">
														<Wrench className="h-3 w-3 animate-pulse" />
														<span>Using {currentTool}...</span>
													</div>
												)}
												{streamingContent ? (
													<div className="text-sm leading-relaxed text-foreground">
														<MessageWithVisualization
															content={streamingContent}
															projectPath={currentProjectPath}
															isUserMessage={false}
														/>
														{/* Blinking cursor */}
														<span className="inline-block w-2 h-4 bg-primary/70 ml-0.5 animate-pulse" />
													</div>
												) : (
													<div className="flex items-center gap-3 text-sm text-muted-foreground">
														<Loader2 className="h-4 w-4 animate-spin text-primary" />
														<span>Thinking...</span>
													</div>
												)}
											</div>
										</div>
									</div>
								)}
								{/* Loading indicator when sending but not yet streaming */}
								{isSending && !isStreaming && (
									<div className="flex gap-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
										<div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
											<Bot className="h-4 w-4 text-primary" />
										</div>
										<div className="flex flex-col gap-2 max-w-[80%]">
											<div className="rounded-2xl px-5 py-4 bg-card border border-border/50 shadow-sm">
												<div className="flex items-center gap-3 text-sm text-muted-foreground">
													<Loader2 className="h-4 w-4 animate-spin text-primary" />
													<span className="flex gap-1">
														<span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
														<span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
														<span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
													</span>
												</div>
											</div>
										</div>
									</div>
								)}
								<div ref={messagesEndRef} />
							</>
						)}
					</div>
				</ScrollArea>
			</div>

			{/* Input Area */}
			<div className="border-t border-border/50 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-lg">
				<div className="max-w-5xl mx-auto px-4 py-4">
					{/* Server Required Alert */}
					{serverRequired && !isServerRunning && (
						<Alert className="mb-4 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30 shadow-sm">
							{isServerLoading ? (
								<Loader2 className="h-4 w-4 text-primary animate-spin" />
							) : (
								<PlayCircle className="h-4 w-4 text-primary" />
							)}
							<AlertDescription className="flex items-center justify-between">
								<span className="text-sm font-medium">
									{isServerLoading
										? "Initializing AI server... This may take a few moments."
										: "The AI server is required to send messages. Start the server to continue chatting."}
								</span>
								<Button
									onClick={startServer}
									disabled={isServerLoading}
									size="sm"
									className="ml-4 shadow-sm"
								>
									{isServerLoading ? (
										<>
											<Loader2 className="h-4 w-4 mr-2 animate-spin" />
											Starting...
										</>
									) : (
										<>
											<PlayCircle className="h-4 w-4 mr-2" />
											Start Server
										</>
									)}
								</Button>
							</AlertDescription>
						</Alert>
					)}

					<div className="flex gap-3 items-end">
						<div className="flex-1 relative group">
							<Textarea
								ref={textareaRef}
								value={inputMessage}
								onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
									setInputMessage(e.target.value)
								}
								onKeyDown={handleKeyDown}
								placeholder={
									serverRequired && !isServerRunning
										? "Start the server to send messages..."
										: "Ask a question about your data..."
								}
								className={cn(
									"min-h-[56px] max-h-[200px] resize-none pr-20 rounded-xl shadow-md transition-all duration-200",
									"border-border/50 focus:border-primary/50 focus:shadow-lg focus:ring-2 focus:ring-primary/20",
									"bg-background/50 backdrop-blur-sm"
								)}
								disabled={isSending || (serverRequired && !isServerRunning)}
							/>
							<div className="absolute bottom-3 right-3 flex items-center gap-2">
								{inputMessage.length > 0 && (
									<span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-1 rounded">
										{inputMessage.length}
									</span>
								)}
							</div>
						</div>
						<Button
							onClick={handleSend}
							disabled={
								!inputMessage.trim() ||
								isSending ||
								(serverRequired && !isServerRunning)
							}
							size="icon"
							className={cn(
								"h-[56px] w-[56px] flex-shrink-0 rounded-xl shadow-md transition-all duration-200",
								"hover:shadow-lg hover:scale-105 active:scale-95"
							)}
						>
							{isSending ? (
								<Loader2 className="h-5 w-5 animate-spin" />
							) : (
								<Send className="h-5 w-5" />
							)}
						</Button>
					</div>
					<div className="flex items-center justify-between mt-3 px-1">
						<p className="text-[10px] text-muted-foreground flex items-center gap-2">
							<span className="flex items-center gap-1">
								<kbd className="px-1.5 py-0.5 text-[10px] bg-muted/80 rounded border border-border/50 font-mono">
									Enter
								</kbd>
								<span>to send</span>
							</span>
							<span className="text-border">•</span>
							<span className="flex items-center gap-1">
								<kbd className="px-1.5 py-0.5 text-[10px] bg-muted/80 rounded border border-border/50 font-mono">
									Shift + Enter
								</kbd>
								<span>for new line</span>
							</span>
						</p>
						{messages.length > 0 && (
							<p className="text-[10px] text-muted-foreground">
								{messages.length} {messages.length === 1 ? "message" : "messages"}
							</p>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
