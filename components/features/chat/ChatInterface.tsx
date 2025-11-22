"use client";

import { useRef, useEffect, useState } from "react";
import { Send, Loader2, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat, type ChatMessage } from "@/hooks/use-chat";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";

export function ChatInterface() {
	const {
		currentSessionId,
		messages,
		isLoading,
		isSending,
		sendMessage,
		createSession,
		error,
		clearError,
	} = useChat();

	const [inputMessage, setInputMessage] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// Auto-scroll to bottom when new messages arrive
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, isSending]);

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
							<div className="flex flex-col items-center justify-center py-20 text-center">
								<div className="mb-6 p-4 rounded-full bg-muted/50">
									<Sparkles className="h-10 w-10 text-muted-foreground" />
								</div>
								<h3 className="text-lg font-semibold mb-2">Start a Conversation</h3>
								<p className="text-sm text-muted-foreground max-w-md">
									Ask questions about your data, request visualizations, or explore insights using AI.
								</p>
							</div>
						) : (
							<>
								{messages.map((message: ChatMessage, index: number) => (
									<div
										key={`${message.role}-${index}`}
										className={cn(
											"flex gap-4 group",
											message.role === "user" ? "justify-end" : "justify-start",
										)}
									>
										{message.role === "assistant" && (
											<div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center mt-1">
												<Sparkles className="h-4 w-4 text-primary" />
											</div>
										)}
										<div
											className={cn(
												"flex flex-col gap-2 max-w-[75%]",
												message.role === "user" && "items-end",
											)}
										>
											<div
												className={cn(
													"rounded-lg px-4 py-3 shadow-sm",
													message.role === "user"
														? "bg-primary text-primary-foreground"
														: "bg-muted border border-border",
												)}
											>
												<div className="text-sm leading-relaxed prose">
													<ReactMarkdown
														remarkPlugins={[remarkGfm]}
														rehypePlugins={[rehypeHighlight, rehypeRaw]}
														components={{
															// Custom styling for code blocks
															code: ({ className, children, ...props }: any) => {
																const isInline = !className?.includes('language-');
																return isInline ? (
																	<code className="px-1.5 py-0.5 rounded bg-background/50 text-xs font-mono border border-border/50" {...props}>
																		{children}
																	</code>
																) : (
																	<code className={className} {...props}>
																		{children}
																	</code>
																);
															},
															// Custom styling for links
															a: ({ children, ...props }: any) => (
																<a 
																	className={cn(
																		"underline underline-offset-2 hover:opacity-80 transition-opacity",
																		message.role === "user" ? "text-primary-foreground" : "text-primary"
																	)} 
																	target="_blank" 
																	rel="noopener noreferrer" 
																	{...props}
																>
																	{children}
																</a>
															),
														}}
													>
														{message.content}
													</ReactMarkdown>
												</div>
											</div>
										{message.created_at && (
											<span
												className={cn(
													"text-[10px] text-muted-foreground px-1",
												)}
											>
												{new Date(message.created_at).toLocaleTimeString([], {
													hour: "2-digit",
													minute: "2-digit",
												})}
											</span>
										)}
									</div>
									{message.role === "user" && (
										<div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/90 flex items-center justify-center mt-1 text-primary-foreground font-medium text-xs">
											You
										</div>
									)}
								</div>
							))}
							{isSending && (
								<div className="flex gap-4">
									<div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center mt-1">
										<Sparkles className="h-4 w-4 text-primary" />
									</div>
									<div className="flex flex-col gap-2 max-w-[75%]">
										<div className="rounded-lg px-4 py-3 bg-muted border border-border shadow-sm">
											<div className="flex items-center gap-2 text-sm text-muted-foreground">
												<Loader2 className="h-4 w-4 animate-spin" />
												<span>Thinking...</span>
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
			<div className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="max-w-5xl mx-auto px-4 py-4">
					<div className="flex gap-3 items-end">
						<div className="flex-1 relative">
							<Textarea
								ref={textareaRef}
								value={inputMessage}
								onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInputMessage(e.target.value)}
								onKeyDown={handleKeyDown}
								placeholder="Ask a question about your data..."
								className="min-h-[52px] max-h-[200px] resize-none pr-12 rounded-lg shadow-sm"
								disabled={isSending}
							/>
							<div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground">
								{inputMessage.length > 0 && `${inputMessage.length} chars`}
							</div>
						</div>
						<Button
							onClick={handleSend}
							disabled={!inputMessage.trim() || isSending}
							size="icon"
							className="h-[52px] w-[52px] flex-shrink-0 rounded-lg shadow-sm"
						>
							{isSending ? (
								<Loader2 className="h-5 w-5 animate-spin" />
							) : (
								<Send className="h-5 w-5" />
							)}
						</Button>
					</div>
					<div className="flex items-center justify-between mt-2 px-1">
						<p className="text-[10px] text-muted-foreground">
							<kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded border border-border">Enter</kbd> to send
							<span className="mx-1">•</span>
							<kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded border border-border">Shift + Enter</kbd> for new line
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
